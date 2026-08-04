const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static directory for frontend dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Uploads directory for custom PNG watermarks
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer storage config for watermark uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `watermark_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Supported image extensions
const SUPPORTED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'];

// Helper: Escape XML/SVG string
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 1. API: Scan local folder for images
 */
app.post('/api/scan-folder', async (req, res) => {
  try {
    const { folderPath } = req.body;
    if (!folderPath) {
      return res.status(400).json({ error: 'Path folder tidak boleh kosong' });
    }

    const absolutePath = path.resolve(folderPath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: `Folder tidak ditemukan: "${folderPath}"` });
    }

    const stat = fs.statSync(absolutePath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Path yang dimasukkan bukan sebuah folder' });
    }

    const files = fs.readdirSync(absolutePath);
    const imageFiles = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (SUPPORTED_EXT.includes(ext)) {
        const filePath = path.join(absolutePath, file);
        try {
          const fileStat = fs.statSync(filePath);
          if (fileStat.isFile()) {
            imageFiles.push({
              name: file,
              path: filePath,
              size: fileStat.size,
              ext: ext,
              mtime: fileStat.mtime
            });
          }
        } catch (err) {
          // ignore unreadable files
        }
      }
    }

    return res.json({
      success: true,
      folderPath: absolutePath,
      totalImages: imageFiles.length,
      images: imageFiles
    });
  } catch (error) {
    console.error('Scan error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 2. API: View/stream local image for dashboard preview
 */
app.get('/api/view-image', (req, res) => {
  try {
    const imagePath = req.query.path;
    if (!imagePath || !fs.existsSync(imagePath)) {
      return res.status(404).send('Gambar tidak ditemukan');
    }
    return res.sendFile(path.resolve(imagePath));
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

/**
 * 3. API: Upload Watermark PNG/JPG
 */
app.post('/api/upload-watermark', upload.single('watermark'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file watermark yang di-upload' });
    }
    const relativeUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      filename: req.file.filename,
      filePath: req.file.path,
      url: relativeUrl
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 4. Helper: Generate SVG Overlay String based on parameters & base image metadata
 */
async function buildSvgOverlay(baseWidth, baseHeight, settings) {
  const {
    mode = 'text',
    // Teks
    text = 'WATERMARK',
    fontFamily = 'Inter, sans-serif',
    fontSizePercent = 5, // % relative to image width
    textColor = '#ffffff',
    textShadow = true,
    shadowColor = 'rgba(0,0,0,0.7)',

    // PNG Image
    watermarkImagePath = '',
    scale = 20, // % relative to base image width

    // Common
    opacity = 80, // 0 - 100
    rotation = 0, // degrees
    position = 'bottom-right',
    offsetX = 20, // px or margin %
    offsetY = 20,
    tiledGapX = 200,
    tiledGapY = 150
  } = settings;

  const opacityVal = Math.max(0, Math.min(1, opacity / 100));

  if (mode === 'text') {
    // Calculate actual pixel font size
    const actualFontSize = Math.max(12, Math.round((baseWidth * (fontSizePercent || 5)) / 100));
    
    // Estimate text width & height roughly
    const charCount = text.length || 1;
    const estTextWidth = Math.round(charCount * actualFontSize * 0.6);
    const estTextHeight = Math.round(actualFontSize * 1.2);

    const positions = calculateCoordinates(position, baseWidth, baseHeight, estTextWidth, estTextHeight, offsetX, offsetY);

    const shadowFilter = textShadow ? `
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="${shadowColor}"/>
        </filter>
      </defs>` : '';

    const filterAttr = textShadow ? 'filter="url(#shadow)"' : '';
    const safeText = escapeXml(text);

    if (position === 'tiled') {
      let textGroup = '';
      const stepX = Math.max(80, estTextWidth + tiledGapX);
      const stepY = Math.max(60, estTextHeight + tiledGapY);

      for (let y = stepY / 2; y < baseHeight + stepY; y += stepY) {
        for (let x = stepX / 2; x < baseWidth + stepX; x += stepX) {
          textGroup += `
            <g transform="translate(${x}, ${y}) rotate(${rotation})">
              <text x="0" y="0" dominant-baseline="middle" text-anchor="middle"
                    fill="${textColor}" font-size="${actualFontSize}px" font-family="${fontFamily}"
                    font-weight="bold" ${filterAttr}>
                ${safeText}
              </text>
            </g>`;
        }
      }

      return `<svg width="${baseWidth}" height="${baseHeight}" xmlns="http://www.w3.org/2000/svg">
        ${shadowFilter}
        <g opacity="${opacityVal}">
          ${textGroup}
        </g>
      </svg>`;
    } else {
      const { x, y } = positions[0];
      return `<svg width="${baseWidth}" height="${baseHeight}" xmlns="http://www.w3.org/2000/svg">
        ${shadowFilter}
        <g opacity="${opacityVal}">
          <g transform="translate(${x}, ${y}) rotate(${rotation})">
            <text x="0" y="0" dominant-baseline="middle" text-anchor="middle"
                  fill="${textColor}" font-size="${actualFontSize}px" font-family="${fontFamily}"
                  font-weight="bold" ${filterAttr}>
              ${safeText}
            </text>
          </g>
        </g>
      </svg>`;
    }

  } else if (mode === 'image') {
    if (!watermarkImagePath || !fs.existsSync(watermarkImagePath)) {
      throw new Error('File watermark image tidak ditemukan');
    }

    // Read watermark metadata & convert to base64
    const wmMetadata = await sharp(watermarkImagePath).metadata();
    const targetWmWidth = Math.max(20, Math.round((baseWidth * (scale || 20)) / 100));
    const aspectRatio = wmMetadata.height / wmMetadata.width;
    const targetWmHeight = Math.round(targetWmWidth * aspectRatio);

    const imageBuffer = fs.readFileSync(watermarkImagePath);
    const mimeType = wmMetadata.format === 'png' ? 'image/png' : 'image/jpeg';
    const base64Img = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

    if (position === 'tiled') {
      let imageGroup = '';
      const stepX = Math.max(50, targetWmWidth + tiledGapX);
      const stepY = Math.max(50, targetWmHeight + tiledGapY);

      for (let y = 0; y < baseHeight + stepY; y += stepY) {
        for (let x = 0; x < baseWidth + stepX; x += stepX) {
          const centerX = x + targetWmWidth / 2;
          const centerY = y + targetWmHeight / 2;
          imageGroup += `
            <g transform="translate(${centerX}, ${centerY}) rotate(${rotation}) translate(${-targetWmWidth / 2}, ${-targetWmHeight / 2})">
              <image href="${base64Img}" width="${targetWmWidth}" height="${targetWmHeight}" />
            </g>`;
        }
      }

      return `<svg width="${baseWidth}" height="${baseHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g opacity="${opacityVal}">
          ${imageGroup}
        </g>
      </svg>`;
    } else {
      const positions = calculateCoordinates(position, baseWidth, baseHeight, targetWmWidth, targetWmHeight, offsetX, offsetY);
      const { left, top } = positions[0];
      const centerX = left + targetWmWidth / 2;
      const centerY = top + targetWmHeight / 2;

      return `<svg width="${baseWidth}" height="${baseHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g opacity="${opacityVal}">
          <g transform="translate(${centerX}, ${centerY}) rotate(${rotation}) translate(${-targetWmWidth / 2}, ${-targetWmHeight / 2})">
            <image href="${base64Img}" width="${targetWmWidth}" height="${targetWmHeight}" />
          </g>
        </g>
      </svg>`;
    }
  }
}

/**
 * Helper: Calculate coordinates based on 9-anchor position grid
 */
function calculateCoordinates(position, baseW, baseH, itemW, itemH, marginX = 20, marginY = 20) {
  let left = marginX;
  let top = marginY;
  let centerX = left + itemW / 2;
  let centerY = top + itemH / 2;

  switch (position) {
    case 'top-left':
      left = marginX;
      top = marginY;
      break;
    case 'top-center':
      left = (baseW - itemW) / 2;
      top = marginY;
      break;
    case 'top-right':
      left = baseW - itemW - marginX;
      top = marginY;
      break;
    case 'center-left':
      left = marginX;
      top = (baseH - itemH) / 2;
      break;
    case 'center':
      left = (baseW - itemW) / 2;
      top = (baseH - itemH) / 2;
      break;
    case 'center-right':
      left = baseW - itemW - marginX;
      top = (baseH - itemH) / 2;
      break;
    case 'bottom-left':
      left = marginX;
      top = baseH - itemH - marginY;
      break;
    case 'bottom-center':
      left = (baseW - itemW) / 2;
      top = baseH - itemH - marginY;
      break;
    case 'bottom-right':
      left = baseW - itemW - marginX;
      top = baseH - itemH - marginY;
      break;
    default:
      left = baseW - itemW - marginX;
      top = baseH - itemH - marginY;
      break;
  }

  centerX = left + itemW / 2;
  centerY = top + itemH / 2;

  return [{ left, top, x: centerX, y: centerY }];
}

/**
 * 5. API: Process Batch Watermarking
 */
app.post('/api/process-watermark', async (req, res) => {
  try {
    const { images, outputFolder, settings } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Pilih setidaknya 1 foto untuk diproses' });
    }

    if (!outputFolder) {
      return res.status(400).json({ error: 'Folder output harus ditentukan' });
    }

    const resolvedOutputDir = path.resolve(outputFolder);
    if (!fs.existsSync(resolvedOutputDir)) {
      fs.mkdirSync(resolvedOutputDir, { recursive: true });
    }

    const results = [];
    const namingRule = settings.namingRule || 'suffix';
    const prefixSuffix = settings.prefixSuffix || '_watermarked';
    const formatChoice = settings.format || 'original'; // original, jpeg, png, webp
    const quality = parseInt(settings.quality || 90, 10);

    for (let i = 0; i < images.length; i++) {
      const imgPath = images[i];
      if (!fs.existsSync(imgPath)) {
        results.push({ file: path.basename(imgPath), success: false, error: 'File tidak ditemukan' });
        continue;
      }

      try {
        const baseSharp = sharp(imgPath);
        const metadata = await baseSharp.metadata();

        // Build SVG overlay
        const svgString = await buildSvgOverlay(metadata.width, metadata.height, settings);
        const svgBuffer = Buffer.from(svgString);

        // Perform Composite
        let processed = baseSharp.composite([{ input: svgBuffer, top: 0, left: 0 }]);

        // Format handling
        const originalExt = path.extname(imgPath).toLowerCase();
        let targetExt = originalExt;

        if (formatChoice === 'jpeg') {
          targetExt = '.jpg';
          processed = processed.jpeg({ quality });
        } else if (formatChoice === 'png') {
          targetExt = '.png';
          processed = processed.png({ quality });
        } else if (formatChoice === 'webp') {
          targetExt = '.webp';
          processed = processed.webp({ quality });
        } else {
          // original format with quality if supported
          if (['.jpg', '.jpeg'].includes(originalExt)) {
            processed = processed.jpeg({ quality });
          } else if (originalExt === '.webp') {
            processed = processed.webp({ quality });
          }
        }

        const baseName = path.basename(imgPath, originalExt);
        let outputFileName = `${baseName}${targetExt}`;

        if (namingRule === 'suffix') {
          outputFileName = `${baseName}${prefixSuffix}${targetExt}`;
        } else if (namingRule === 'prefix') {
          outputFileName = `${prefixSuffix}${baseName}${targetExt}`;
        }

        const targetOutputPath = path.join(resolvedOutputDir, outputFileName);
        await processed.toFile(targetOutputPath);

        results.push({
          file: path.basename(imgPath),
          outputFileName,
          outputPath: targetOutputPath,
          success: true
        });

      } catch (err) {
        console.error(`Error processing ${imgPath}:`, err);
        results.push({
          file: path.basename(imgPath),
          success: false,
          error: err.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return res.json({
      success: true,
      total: images.length,
      successCount,
      failedCount: images.length - successCount,
      outputFolder: resolvedOutputDir,
      results
    });

  } catch (error) {
    console.error('Batch process error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 6. API: Open Output Folder in Windows Explorer
 */
app.post('/api/open-folder', (req, res) => {
  try {
    const { folderPath } = req.body;
    if (!folderPath || !fs.existsSync(folderPath)) {
      return res.status(404).json({ error: 'Folder tidak ditemukan' });
    }

    const resolved = path.resolve(folderPath);
    exec(`explorer "${resolved}"`, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json({ success: true });
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` 🚀 WATERMARK BOT & DASHBOARD READY!`);
  console.log(` 🌐 Open Dashboard: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
