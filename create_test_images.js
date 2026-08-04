const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'test-photos');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

async function createSample(filename, width, height, bgColor, text) {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bgColor}"/>
    <circle cx="${width/2}" cy="${height/2}" r="${Math.min(width, height)/3}" fill="rgba(255,255,255,0.15)"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="48px" font-family="sans-serif" font-weight="bold">${text}</text>
  </svg>`;

  const filePath = path.join(testDir, filename);
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .toFile(filePath);
  console.log(`Created sample image: ${filePath}`);
}

async function run() {
  await createSample('landscape_beach.jpg', 1920, 1080, '#0f4c81', 'BEACH VACATION');
  await createSample('portrait_model.jpg', 1080, 1920, '#581845', 'PORTRAIT DEMO');
  await createSample('nature_forest.jpg', 1600, 1200, '#1e5631', 'FOREST SCENE');
}

run().catch(console.error);
