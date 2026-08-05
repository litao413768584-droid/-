import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Function to generate a valid PNG buffer with custom width, height, and RGBA color
function createPngBuffer(width, height, r = 30, g = 58, b = 138, a = 255) {
  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR Chunk
  const ihdrLength = Buffer.alloc(4);
  ihdrLength.writeUInt32BE(13, 0);
  const ihdrType = Buffer.from('IHDR');
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdrData])), 0);
  const ihdr = Buffer.concat([ihdrLength, ihdrType, ihdrData, ihdrCrc]);

  // Raw Image Data (Filter byte 0 + RGBA pixels)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Draw a subtle border/ship color
      const isBorder = x < 2 || x >= width - 2 || y < 2 || y >= height - 2;
      rawData[pixelOffset] = isBorder ? 59 : r;
      rawData[pixelOffset + 1] = isBorder ? 130 : g;
      rawData[pixelOffset + 2] = isBorder ? 246 : b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // Compress IDAT
  const compressedData = zlib.deflateSync(rawData);
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(compressedData.length, 0);
  const idatType = Buffer.from('IDAT');
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(Buffer.concat([idatType, compressedData])), 0);
  const idat = Buffer.concat([idatLength, idatType, compressedData, idatCrc]);

  // IEND Chunk
  const iendLength = Buffer.alloc(4);
  iendLength.writeUInt32BE(0, 0);
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(Buffer.concat([iendType])), 0);
  const iend = Buffer.concat([iendLength, iendType, iendCrc]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Simple CRC32 implementation for PNG chunks
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Create ICO Buffer containing a PNG icon
function createIcoBuffer(pngBuffer, width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // Number of images

  const directory = Buffer.alloc(16);
  directory[0] = width >= 256 ? 0 : width;
  directory[1] = height >= 256 ? 0 : height;
  directory[2] = 0; // Color count
  directory[3] = 0; // Reserved
  directory.writeUInt16LE(1, 4); // Color planes
  directory.writeUInt16LE(32, 6); // Bits per pixel
  directory.writeUInt32LE(pngBuffer.length, 8); // Image size
  directory.writeUInt32LE(22, 12); // Offset to image data (6 + 16)

  return Buffer.concat([header, directory, pngBuffer]);
}

// Write icons to src-tauri/icons
const iconsDir = path.resolve('src-tauri/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const p32 = createPngBuffer(32, 32);
const p128 = createPngBuffer(128, 128);
const p256 = createPngBuffer(256, 256);
const ico = createIcoBuffer(p32, 32, 32);

fs.writeFileSync(path.join(iconsDir, '32x32.png'), p32);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), p128);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), p256);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), p256);
fs.writeFileSync(path.join(iconsDir, 'Square30x30Logo.png'), createPngBuffer(30, 30));
fs.writeFileSync(path.join(iconsDir, 'Square44x44Logo.png'), createPngBuffer(44, 44));
fs.writeFileSync(path.join(iconsDir, 'Square71x71Logo.png'), createPngBuffer(71, 71));
fs.writeFileSync(path.join(iconsDir, 'Square89x89Logo.png'), createPngBuffer(89, 89));
fs.writeFileSync(path.join(iconsDir, 'Square107x107Logo.png'), createPngBuffer(107, 107));
fs.writeFileSync(path.join(iconsDir, 'Square142x142Logo.png'), createPngBuffer(142, 142));
fs.writeFileSync(path.join(iconsDir, 'Square150x150Logo.png'), createPngBuffer(150, 150));
fs.writeFileSync(path.join(iconsDir, 'Square284x284Logo.png'), createPngBuffer(284, 284));
fs.writeFileSync(path.join(iconsDir, 'Square310x310Logo.png'), createPngBuffer(310, 310));
fs.writeFileSync(path.join(iconsDir, 'StoreLogo.png'), createPngBuffer(50, 50));
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), p256);

console.log('Tauri icons generated successfully!');
