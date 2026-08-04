/**
 * Watermark Bot & Studio - Frontend App Logic
 * Real-time Canvas Live Preview, Folder Scanner, & Batch Processing Engine
 */

document.addEventListener('DOMContentLoaded', () => {

  // State Management
  const state = {
    folderPath: '',
    outputFolder: '',
    scannedImages: [],
    selectedIndices: new Set(),
    currentPreviewIndex: 0,
    
    // Watermark Settings
    mode: 'text', // 'text' | 'image'
    
    // Text watermark
    text: 'CONFIDENTIAL',
    fontFamily: 'Inter, sans-serif',
    textColor: '#ffffff',
    fontSizePercent: 6,
    textShadow: true,
    shadowColor: 'rgba(0,0,0,0.7)',
    
    // PNG Image watermark
    uploadedWmPath: '', // server file path
    uploadedWmUrl: '',  // client view URL
    uploadedWmImageObj: null, // HTML Image object for canvas
    scalePercent: 20,
    
    // Position & Transform
    position: 'bottom-right', // 'top-left', 'center', 'tiled', etc.
    opacity: 80, // 0 - 100
    rotation: 0, // -180 to 180
    offsetX: 20,
    offsetY: 20,
    tiledGapX: 180,
    tiledGapY: 140,
    
    // Output
    format: 'original',
    quality: 90,
    namingRule: 'suffix',
    prefixSuffix: '_watermarked'
  };

  // DOM Elements
  const el = {
    targetFolderPath: document.getElementById('targetFolderPath'),
    outputFolderPath: document.getElementById('outputFolderPath'),
    btnScanFolder: document.getElementById('btnScanFolder'),
    btnOpenOutput: document.getElementById('btnOpenOutput'),
    
    tabBtns: document.querySelectorAll('.tab-btn'),
    panelTextControls: document.getElementById('panelTextControls'),
    panelImageControls: document.getElementById('panelImageControls'),
    
    // Text controls
    wmText: document.getElementById('wmText'),
    wmFontFamily: document.getElementById('wmFontFamily'),
    wmTextColor: document.getElementById('wmTextColor'),
    wmTextColorHex: document.getElementById('wmTextColorHex'),
    wmFontSize: document.getElementById('wmFontSize'),
    wmFontSizeVal: document.getElementById('wmFontSizeVal'),
    wmTextShadow: document.getElementById('wmTextShadow'),
    
    // Image controls
    dropZone: document.getElementById('dropZone'),
    wmImageInput: document.getElementById('wmImageInput'),
    wmUploadPreview: document.getElementById('wmUploadPreview'),
    wmUploadImg: document.getElementById('wmUploadImg'),
    wmUploadName: document.getElementById('wmUploadName'),
    wmScale: document.getElementById('wmScale'),
    wmScaleVal: document.getElementById('wmScaleVal'),
    
    // Position & Transform
    gridBtns: document.querySelectorAll('.grid-btn'),
    btnTiledMode: document.getElementById('btnTiledMode'),
    wmOpacity: document.getElementById('wmOpacity'),
    wmOpacityVal: document.getElementById('wmOpacityVal'),
    wmRotation: document.getElementById('wmRotation'),
    wmRotationVal: document.getElementById('wmRotationVal'),
    wmOffsetX: document.getElementById('wmOffsetX'),
    wmOffsetXVal: document.getElementById('wmOffsetXVal'),
    wmOffsetY: document.getElementById('wmOffsetY'),
    wmOffsetYVal: document.getElementById('wmOffsetYVal'),
    
    // Output settings
    outputFormat: document.getElementById('outputFormat'),
    outputNaming: document.getElementById('outputNaming'),
    outputQuality: document.getElementById('outputQuality'),
    outputQualityVal: document.getElementById('outputQualityVal'),
    
    // Preview Canvas
    emptyState: document.getElementById('emptyState'),
    canvasWrapper: document.getElementById('canvasWrapper'),
    previewCanvas: document.getElementById('previewCanvas'),
    badgeFileName: document.getElementById('badgeFileName'),
    badgeDimensions: document.getElementById('badgeDimensions'),
    btnPrevImg: document.getElementById('btnPrevImg'),
    btnNextImg: document.getElementById('btnNextImg'),
    previewImgCounter: document.getElementById('previewImgCounter'),
    
    // Gallery Grid
    selectedCount: document.getElementById('selectedCount'),
    totalScannedCount: document.getElementById('totalScannedCount'),
    btnSelectAll: document.getElementById('btnSelectAll'),
    btnDeselectAll: document.getElementById('btnDeselectAll'),
    imageGrid: document.getElementById('imageGrid'),
    
    // Bottom Bar
    actionSummaryText: document.getElementById('actionSummaryText'),
    btnStartBatch: document.getElementById('btnStartBatch'),
    
    // Modal
    modalProgress: document.getElementById('modalProgress'),
    modalTitle: document.getElementById('modalTitle'),
    progressBarFill: document.getElementById('progressBarFill'),
    progressText: document.getElementById('progressText'),
    progressPercent: document.getElementById('progressPercent'),
    logConsole: document.getElementById('logConsole'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    btnOpenFolderModal: document.getElementById('btnOpenFolderModal'),

    // Mobile Tabs
    btnTabPreview: document.getElementById('btnTabPreview'),
    btnTabSettings: document.getElementById('btnTabSettings'),
    appBody: document.getElementById('appBody')
  };

  const previewCtx = el.previewCanvas.getContext('2d');
  let currentLoadedBaseImg = null;

  // Initialize Event Listeners
  function initListeners() {
    // 0. Mobile navigation tabs (class-based, no inline style pollution)
    if (el.btnTabPreview && el.btnTabSettings && el.appBody) {
      if (window.innerWidth <= 900) {
        el.appBody.classList.add('show-preview');
      }

      el.btnTabPreview.addEventListener('click', () => {
        el.btnTabPreview.classList.add('active');
        el.btnTabSettings.classList.remove('active');
        el.appBody.classList.add('show-preview');
        el.appBody.classList.remove('show-settings');
      });

      el.btnTabSettings.addEventListener('click', () => {
        el.btnTabSettings.classList.add('active');
        el.btnTabPreview.classList.remove('active');
        el.appBody.classList.add('show-settings');
        el.appBody.classList.remove('show-preview');
      });

      window.addEventListener('resize', () => {
        if (window.innerWidth > 900) {
          el.appBody.classList.remove('show-preview', 'show-settings');
        } else if (!el.appBody.classList.contains('show-preview') && !el.appBody.classList.contains('show-settings')) {
          el.appBody.classList.add('show-preview');
        }
      });
    }

    // 1. Folder Scanning
    el.btnScanFolder.addEventListener('click', scanFolder);
    el.targetFolderPath.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') scanFolder();
    });

    el.btnOpenOutput.addEventListener('click', () => {
      const path = el.outputFolderPath.value || state.outputFolder;
      if (path) openFolder(path);
    });

    // 2. Mode Tabs (Text / Image)
    el.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;

        if (state.mode === 'text') {
          el.panelTextControls.classList.remove('hidden');
          el.panelImageControls.classList.add('hidden');
        } else {
          el.panelTextControls.classList.add('hidden');
          el.panelImageControls.classList.remove('hidden');
        }
        updatePreview();
      });
    });

    // 3. Text Controls Listeners
    el.wmText.addEventListener('input', (e) => {
      state.text = e.target.value;
      updatePreview();
    });

    el.wmFontFamily.addEventListener('change', (e) => {
      state.fontFamily = e.target.value;
      updatePreview();
    });

    el.wmTextColor.addEventListener('input', (e) => {
      state.textColor = e.target.value;
      el.wmTextColorHex.value = e.target.value;
      updatePreview();
    });

    el.wmTextColorHex.addEventListener('input', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        state.textColor = e.target.value;
        el.wmTextColor.value = e.target.value;
        updatePreview();
      }
    });

    el.wmFontSize.addEventListener('input', (e) => {
      state.fontSizePercent = parseFloat(e.target.value);
      el.wmFontSizeVal.textContent = `${state.fontSizePercent}%`;
      updatePreview();
    });

    el.wmTextShadow.addEventListener('change', (e) => {
      state.textShadow = e.target.checked;
      updatePreview();
    });

    // 4. PNG Watermark Upload
    el.wmImageInput.addEventListener('change', handleWmImageUpload);
    el.wmScale.addEventListener('input', (e) => {
      state.scalePercent = parseFloat(e.target.value);
      el.wmScaleVal.textContent = `${state.scalePercent}%`;
      updatePreview();
    });

    // 5. Position 9-Grid & Tiled
    el.gridBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        el.gridBtns.forEach(b => b.classList.remove('active'));
        el.btnTiledMode.classList.remove('active');
        btn.classList.add('active');
        state.position = btn.dataset.pos;
        updatePreview();
      });
    });

    el.btnTiledMode.addEventListener('click', () => {
      el.gridBtns.forEach(b => b.classList.remove('active'));
      el.btnTiledMode.classList.add('active');
      state.position = 'tiled';
      updatePreview();
    });

    // 6. Opacity, Rotation, Margins
    el.wmOpacity.addEventListener('input', (e) => {
      state.opacity = parseInt(e.target.value, 10);
      el.wmOpacityVal.textContent = `${state.opacity}%`;
      updatePreview();
    });

    el.wmRotation.addEventListener('input', (e) => {
      state.rotation = parseInt(e.target.value, 10);
      el.wmRotationVal.textContent = `${state.rotation}°`;
      updatePreview();
    });

    el.wmOffsetX.addEventListener('input', (e) => {
      state.offsetX = parseInt(e.target.value, 10);
      el.wmOffsetXVal.textContent = state.offsetX;
      updatePreview();
    });

    el.wmOffsetY.addEventListener('input', (e) => {
      state.offsetY = parseInt(e.target.value, 10);
      el.wmOffsetYVal.textContent = state.offsetY;
      updatePreview();
    });

    // 7. Output format & quality
    el.outputFormat.addEventListener('change', (e) => {
      state.format = e.target.value;
    });

    el.outputNaming.addEventListener('change', (e) => {
      state.namingRule = e.target.value;
    });

    el.outputQuality.addEventListener('input', (e) => {
      state.quality = parseInt(e.target.value, 10);
      el.outputQualityVal.textContent = `${state.quality}%`;
    });

    // 8. Gallery & Preview Navigation
    el.btnPrevImg.addEventListener('click', () => {
      if (state.scannedImages.length === 0) return;
      state.currentPreviewIndex = (state.currentPreviewIndex - 1 + state.scannedImages.length) % state.scannedImages.length;
      loadPreviewImage();
    });

    el.btnNextImg.addEventListener('click', () => {
      if (state.scannedImages.length === 0) return;
      state.currentPreviewIndex = (state.currentPreviewIndex + 1) % state.scannedImages.length;
      loadPreviewImage();
    });

    el.btnSelectAll.addEventListener('click', () => {
      state.scannedImages.forEach((_, idx) => state.selectedIndices.add(idx));
      updateGalleryCheckboxes();
      updateSummary();
    });

    el.btnDeselectAll.addEventListener('click', () => {
      state.selectedIndices.clear();
      updateGalleryCheckboxes();
      updateSummary();
    });

    // 9. Batch Process Execution & Modal
    el.btnStartBatch.addEventListener('click', startBatchProcessing);
    el.btnCloseModal.addEventListener('click', () => {
      el.modalProgress.classList.add('hidden');
    });

    el.btnOpenFolderModal.addEventListener('click', () => {
      const path = el.outputFolderPath.value || state.outputFolder;
      if (path) openFolder(path);
    });
  }

  /**
   * Scan folder via API
   */
  async function scanFolder() {
    const folderPath = el.targetFolderPath.value.trim();
    if (!folderPath) {
      alert('Silakan masukkan path folder target terlebih dahulu.');
      return;
    }

    el.btnScanFolder.disabled = true;
    el.btnScanFolder.textContent = 'Scanning...';

    try {
      const res = await fetch('/api/scan-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal me-load folder');
      }

      state.folderPath = data.folderPath;
      state.outputFolder = `${data.folderPath}${window.navigator.platform.includes('Win') ? '\\' : '/'}watermarked`;
      el.outputFolderPath.value = state.outputFolder;

      state.scannedImages = data.images;
      state.selectedIndices.clear();
      state.scannedImages.forEach((_, idx) => state.selectedIndices.add(idx));

      state.currentPreviewIndex = 0;

      renderGallery();
      updateSummary();

      if (state.scannedImages.length > 0) {
        el.emptyState.classList.add('hidden');
        el.canvasWrapper.classList.remove('hidden');
        loadPreviewImage();
      } else {
        el.emptyState.classList.remove('hidden');
        el.canvasWrapper.classList.add('hidden');
        alert('Tidak ditemukan file gambar (.jpg, .png, .webp) di dalam folder tersebut.');
      }

    } catch (err) {
      alert(`Error Scan Folder: ${err.message}`);
    } finally {
      el.btnScanFolder.disabled = false;
      el.btnScanFolder.textContent = 'Scan';
    }
  }

  /**
   * Render Gallery Thumbnail Grid
   */
  function renderGallery() {
    el.totalScannedCount.textContent = state.scannedImages.length;
    el.imageGrid.innerHTML = '';

    if (state.scannedImages.length === 0) {
      el.imageGrid.innerHTML = '<div class="empty-grid-msg">Scan folder terlebih dahulu untuk memilih foto.</div>';
      return;
    }

    state.scannedImages.forEach((img, idx) => {
      const card = document.createElement('div');
      card.className = `thumb-card ${state.selectedIndices.has(idx) ? 'selected' : ''} ${idx === state.currentPreviewIndex ? 'active-preview' : ''}`;
      
      const imgUrl = `/api/view-image?path=${encodeURIComponent(img.path)}`;

      card.innerHTML = `
        <input type="checkbox" class="thumb-checkbox" ${state.selectedIndices.has(idx) ? 'checked' : ''}>
        <img src="${imgUrl}" alt="${img.name}" loading="lazy">
        <div class="thumb-name">${img.name}</div>
      `;

      // Checkbox event
      const cb = card.querySelector('.thumb-checkbox');
      cb.addEventListener('click', (e) => {
        e.stopPropagation();
        if (cb.checked) {
          state.selectedIndices.add(idx);
          card.classList.add('selected');
        } else {
          state.selectedIndices.delete(idx);
          card.classList.remove('selected');
        }
        updateSummary();
      });

      // Card click -> switch preview image
      card.addEventListener('click', () => {
        state.currentPreviewIndex = idx;
        document.querySelectorAll('.thumb-card').forEach(c => c.classList.remove('active-preview'));
        card.classList.add('active-preview');
        loadPreviewImage();
      });

      el.imageGrid.appendChild(card);
    });
  }

  function updateGalleryCheckboxes() {
    const cards = el.imageGrid.querySelectorAll('.thumb-card');
    cards.forEach((card, idx) => {
      const cb = card.querySelector('.thumb-checkbox');
      if (state.selectedIndices.has(idx)) {
        cb.checked = true;
        card.classList.add('selected');
      } else {
        cb.checked = false;
        card.classList.remove('selected');
      }
    });
  }

  function updateSummary() {
    const selCount = state.selectedIndices.size;
    el.selectedCount.textContent = selCount;

    if (selCount > 0) {
      el.btnStartBatch.disabled = false;
      el.actionSummaryText.textContent = `Siap memproses ${selCount} foto terpilih`;
    } else {
      el.btnStartBatch.disabled = true;
      el.actionSummaryText.textContent = 'Pilih setidaknya 1 foto untuk memulai watermark';
    }
  }

  /**
   * Handle Upload PNG Watermark Logo
   */
  async function handleWmImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('watermark', file);

    try {
      const res = await fetch('/api/upload-watermark', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload watermark gagal');
      }

      state.uploadedWmPath = data.filePath;
      state.uploadedWmUrl = data.url;

      // Update UI preview of watermark file
      el.wmUploadImg.src = data.url;
      el.wmUploadName.textContent = data.filename;
      el.wmUploadPreview.classList.remove('hidden');

      // Preload image object for canvas preview
      const imgObj = new Image();
      imgObj.crossOrigin = 'anonymous';
      imgObj.src = data.url;
      imgObj.onload = () => {
        state.uploadedWmImageObj = imgObj;
        updatePreview();
      };

    } catch (err) {
      alert(`Upload error: ${err.message}`);
    }
  }

  /**
   * Load base preview image for canvas
   */
  function loadPreviewImage() {
    if (state.scannedImages.length === 0) return;
    const imgData = state.scannedImages[state.currentPreviewIndex];

    el.previewImgCounter.textContent = `${state.currentPreviewIndex + 1} / ${state.scannedImages.length} Foto`;
    el.badgeFileName.textContent = imgData.name;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `/api/view-image?path=${encodeURIComponent(imgData.path)}`;

    img.onload = () => {
      currentLoadedBaseImg = img;
      el.badgeDimensions.textContent = `${img.naturalWidth}x${img.naturalHeight}px`;
      updatePreview();
    };
  }

  /**
   * Render Canvas Live Interactive Preview
   */
  function updatePreview() {
    if (!currentLoadedBaseImg) return;

    const baseW = currentLoadedBaseImg.naturalWidth;
    const baseH = currentLoadedBaseImg.naturalHeight;

    // Set canvas dimensions equal to original image
    el.previewCanvas.width = baseW;
    el.previewCanvas.height = baseH;

    // Draw base image
    previewCtx.clearRect(0, 0, baseW, baseH);
    previewCtx.drawImage(currentLoadedBaseImg, 0, 0, baseW, baseH);

    // Save context state for watermark overlay
    previewCtx.save();
    previewCtx.globalAlpha = Math.max(0, Math.min(1, state.opacity / 100));

    if (state.mode === 'text') {
      renderTextWatermark(previewCtx, baseW, baseH);
    } else if (state.mode === 'image' && state.uploadedWmImageObj) {
      renderImageWatermark(previewCtx, baseW, baseH);
    }

    previewCtx.restore();
  }

  /**
   * Render Text Watermark on Canvas Context
   */
  function renderTextWatermark(ctx, baseW, baseH) {
    const text = state.text || '';
    if (!text) return;

    const fontSizePx = Math.max(12, Math.round((baseW * (state.fontSizePercent || 6)) / 100));
    ctx.font = `bold ${fontSizePx}px ${state.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const textMetrics = ctx.measureText(text);
    const textW = textMetrics.width;
    const textH = fontSizePx * 1.2;

    if (state.textShadow) {
      ctx.shadowColor = state.shadowColor;
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    }

    ctx.fillStyle = state.textColor;

    if (state.position === 'tiled') {
      const stepX = Math.max(80, textW + state.tiledGapX);
      const stepY = Math.max(60, textH + state.tiledGapY);

      for (let y = stepY / 2; y < baseH + stepY; y += stepY) {
        for (let x = stepX / 2; x < baseW + stepX; x += stepX) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((state.rotation * Math.PI) / 180);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
    } else {
      const coords = getAnchorCoords(state.position, baseW, baseH, textW, textH, state.offsetX, state.offsetY);
      ctx.save();
      ctx.translate(coords.centerX, coords.centerY);
      ctx.rotate((state.rotation * Math.PI) / 180);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }

  /**
   * Render PNG Image Watermark on Canvas Context
   */
  function renderImageWatermark(ctx, baseW, baseH) {
    const wmImg = state.uploadedWmImageObj;
    if (!wmImg) return;

    const targetW = Math.max(20, Math.round((baseW * (state.scalePercent || 20)) / 100));
    const aspectRatio = wmImg.naturalHeight / wmImg.naturalWidth;
    const targetH = Math.round(targetW * aspectRatio);

    if (state.position === 'tiled') {
      const stepX = Math.max(50, targetW + state.tiledGapX);
      const stepY = Math.max(50, targetH + state.tiledGapY);

      for (let y = 0; y < baseH + stepY; y += stepY) {
        for (let x = 0; x < baseW + stepX; x += stepX) {
          const centerX = x + targetW / 2;
          const centerY = y + targetH / 2;
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate((state.rotation * Math.PI) / 180);
          ctx.drawImage(wmImg, -targetW / 2, -targetH / 2, targetW, targetH);
          ctx.restore();
        }
      }
    } else {
      const coords = getAnchorCoords(state.position, baseW, baseH, targetW, targetH, state.offsetX, state.offsetY);
      ctx.save();
      ctx.translate(coords.centerX, coords.centerY);
      ctx.rotate((state.rotation * Math.PI) / 180);
      ctx.drawImage(wmImg, -targetW / 2, -targetH / 2, targetW, targetH);
      ctx.restore();
    }
  }

  /**
   * Calculate 9-grid anchor positions
   */
  function getAnchorCoords(pos, baseW, baseH, itemW, itemH, marginX = 20, marginY = 20) {
    let left = marginX;
    let top = marginY;

    switch (pos) {
      case 'top-left':
        left = marginX; top = marginY; break;
      case 'top-center':
        left = (baseW - itemW) / 2; top = marginY; break;
      case 'top-right':
        left = baseW - itemW - marginX; top = marginY; break;
      case 'center-left':
        left = marginX; top = (baseH - itemH) / 2; break;
      case 'center':
        left = (baseW - itemW) / 2; top = (baseH - itemH) / 2; break;
      case 'center-right':
        left = baseW - itemW - marginX; top = (baseH - itemH) / 2; break;
      case 'bottom-left':
        left = marginX; top = baseH - itemH - marginY; break;
      case 'bottom-center':
        left = (baseW - itemW) / 2; top = baseH - itemH - marginY; break;
      case 'bottom-right':
      default:
        left = baseW - itemW - marginX; top = baseH - itemH - marginY; break;
    }

    return {
      left,
      top,
      centerX: left + itemW / 2,
      centerY: top + itemH / 2
    };
  }

  /**
   * Start Batch Watermark Process
   */
  async function startBatchProcessing() {
    const selectedIndices = Array.from(state.selectedIndices);
    if (selectedIndices.length === 0) {
      alert('Pilih foto terlebih dahulu.');
      return;
    }

    if (state.mode === 'image' && !state.uploadedWmPath) {
      alert('Upload logo PNG watermark terlebih dahulu.');
      return;
    }

    const selectedImages = selectedIndices.map(idx => state.scannedImages[idx].path);
    const outputDir = el.outputFolderPath.value.trim() || state.outputFolder;

    // Show Progress Modal
    el.modalProgress.classList.remove('hidden');
    el.modalTitle.textContent = `Memproses ${selectedImages.length} Foto...`;
    el.progressBarFill.style.width = '0%';
    el.progressText.textContent = `0 dari ${selectedImages.length} selesai`;
    el.progressPercent.textContent = '0%';
    el.logConsole.innerHTML = '';
    el.btnCloseModal.disabled = true;
    el.btnOpenFolderModal.disabled = true;

    addLog(`Memulai batch processing ${selectedImages.length} foto...`, 'info');

    const payload = {
      images: selectedImages,
      outputFolder: outputDir,
      settings: {
        mode: state.mode,
        text: state.text,
        fontFamily: state.fontFamily,
        fontSizePercent: state.fontSizePercent,
        textColor: state.textColor,
        textShadow: state.textShadow,
        shadowColor: state.shadowColor,
        watermarkImagePath: state.uploadedWmPath,
        scale: state.scalePercent,
        opacity: state.opacity,
        rotation: state.rotation,
        position: state.position,
        offsetX: state.offsetX,
        offsetY: state.offsetY,
        tiledGapX: state.tiledGapX,
        tiledGapY: state.tiledGapY,
        format: state.format,
        quality: state.quality,
        namingRule: state.namingRule,
        prefixSuffix: state.prefixSuffix
      }
    };

    try {
      // Simulate visual progress increments
      let currentProgress = 0;
      const progressTimer = setInterval(() => {
        if (currentProgress < 90) {
          currentProgress += Math.floor(Math.random() * 15) + 5;
          if (currentProgress > 90) currentProgress = 90;
          el.progressBarFill.style.width = `${currentProgress}%`;
          el.progressPercent.textContent = `${currentProgress}%`;
        }
      }, 200);

      const res = await fetch('/api/process-watermark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearInterval(progressTimer);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Terjadi kesalahan saat memproses watermark');
      }

      // Complete progress
      el.progressBarFill.style.width = '100%';
      el.progressPercent.textContent = '100%';
      el.progressText.textContent = `${data.successCount} dari ${data.total} foto berhasil di-watermark`;
      el.modalTitle.textContent = 'Batch Watermark Selesai! 🎉';

      data.results.forEach(item => {
        if (item.success) {
          addLog(`✓ ${item.file} -> ${item.outputFileName}`, 'success');
        } else {
          addLog(`✗ ${item.file} GAGAL: ${item.error}`, 'error');
        }
      });

      addLog(`Tersimpan di: ${data.outputFolder}`, 'info');

    } catch (err) {
      addLog(`FATAL ERROR: ${err.message}`, 'error');
      el.modalTitle.textContent = 'Proses Gagal!';
    } finally {
      el.btnCloseModal.disabled = false;
      el.btnOpenFolderModal.disabled = false;
    }
  }

  function addLog(msg, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = msg;
    el.logConsole.appendChild(entry);
    el.logConsole.scrollTop = el.logConsole.scrollHeight;
  }

  /**
   * Open local folder in Windows Explorer
   */
  async function openFolder(folderPath) {
    try {
      const res = await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err) {
      alert(`Gagal membuka folder: ${err.message}`);
    }
  }

  // Start app
  initListeners();
});
