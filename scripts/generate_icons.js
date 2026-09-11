const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// SVG Icon definition
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#0b0f19" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="50%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#a855f7" flood-opacity="0.4" />
    </filter>
  </defs>
  <!-- Background with rounded corners -->
  <rect width="512" height="512" rx="115" fill="url(#bgGrad)" />
  <rect x="12" y="12" width="488" height="488" rx="103" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4" />
  
  <!-- Outer Speed Ring -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12" />
  <path d="M 256 66 A 190 190 0 1 1 96 360" fill="none" stroke="url(#accentGrad)" stroke-width="12" stroke-linecap="round" />
  
  <!-- Fast-forward Double Chevron Arrows -->
  <g filter="url(#glow)">
    <!-- First Arrow -->
    <path d="M 170 160 L 260 256 L 170 352 Z" fill="url(#accentGrad)" />
    <!-- Second Arrow -->
    <path d="M 270 160 L 360 256 L 270 352 Z" fill="url(#accentGrad)" />
  </g>
  
  <!-- Speedometer Dots -->
  <circle cx="256" cy="95" r="7" fill="#6366f1" />
  <circle cx="370" cy="142" r="7" fill="#a855f7" />
  <circle cx="417" cy="256" r="9" fill="#ec4899" />
  <circle cx="370" cy="370" r="7" fill="#06b6d4" />
  
  <!-- Badge text "2x" -->
  <rect x="210" y="380" width="92" height="40" rx="20" fill="url(#glowGrad)" opacity="0.9" />
  <text x="256" y="407" font-family="-apple-system, sans-serif" font-weight="900" font-size="22" fill="#0b0f19" text-anchor="middle">SPEED</text>
</svg>`;

// Write icon.svg
const dir = path.join(__dirname, 'icons');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
fs.writeFileSync(path.join(dir, 'icon.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(__dirname, 'favicon.svg'), svgContent, 'utf8');

/**
 * Creates a valid RGBA PNG buffer
 */
function createPng(width, height) {
  // Simple pure JS PNG generator
  // CRC32 implementation
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression method
  ihdrData[11] = 0; // Filter method
  ihdrData[12] = 0; // Interlace method
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Generate Image Data (Rasterize background gradient + fast-forward triangles)
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  const cx = width / 2;
  const cy = height / 2;
  const rCorner = width * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;

      // Check rounded rect distance
      const dx = Math.max(0, Math.abs(x - cx) - (cx - rCorner));
      const dy = Math.max(0, Math.abs(y - cy) - (cy - rCorner));
      const isOutside = Math.sqrt(dx * dx + dy * dy) > rCorner;

      if (isOutside) {
        // Transparent outside
        rawData[px] = 0;
        rawData[px + 1] = 0;
        rawData[px + 2] = 0;
        rawData[px + 3] = 0;
        continue;
      }

      // Inside Icon - Background Gradient: Dark indigo (#1e1b4b) to (#0b0f19)
      const gradRatio = (x + y) / (width + height);
      let r = Math.round(30 * (1 - gradRatio) + 11 * gradRatio);
      let g = Math.round(27 * (1 - gradRatio) + 15 * gradRatio);
      let b = Math.round(75 * (1 - gradRatio) + 25 * gradRatio);
      let a = 255;

      // Relative coordinates from -1.0 to 1.0
      const nx = (x - cx) / (width * 0.5);
      const ny = (y - cy) / (height * 0.5);

      // Fast forward double chevron logic
      // Triangle 1: x in [-0.4, 0.0], Triangle 2: x in [0.0, 0.4]
      // y bounds: |y| <= 0.45 * (1 - (peak - x)/width)
      const inArrow1 = (nx >= -0.38 && nx <= 0.02 && Math.abs(ny) <= 0.4 * (nx - (-0.38)) / 0.4);
      const inArrow2 = (nx >= 0.02 && nx <= 0.42 && Math.abs(ny) <= 0.4 * (nx - 0.02) / 0.4);

      if (inArrow1 || inArrow2) {
        // Gradient: Purple (#a855f7) to Magenta (#ec4899)
        const t = (nx + 0.4) / 0.8;
        r = Math.round(99 + t * (236 - 99));
        g = Math.round(102 + t * (72 - 102));
        b = Math.round(241 + t * (153 - 241));
      } else {
        // Subtle circular ring
        const dist = Math.sqrt(nx * nx + ny * ny);
        if (dist >= 0.72 && dist <= 0.78) {
          r = 168; g = 85; b = 247;
        }
      }

      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = a;
    }
  }

  // Compress IDAT
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Write PNG files
fs.writeFileSync(path.join(dir, 'icon-192.png'), createPng(192, 192));
fs.writeFileSync(path.join(dir, 'icon-512.png'), createPng(512, 512));
fs.writeFileSync(path.join(dir, 'apple-touch-icon.png'), createPng(180, 180));
console.log('Successfully generated icons (SVG, 192x192 PNG, 512x512 PNG, apple-touch-icon PNG)!');
