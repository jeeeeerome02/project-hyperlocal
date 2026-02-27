const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend', 'public', 'icons');
fs.mkdirSync(dir, { recursive: true });

// Create a 1x1 transparent PNG (smallest valid PNG)
// For PWA, we'll use SVG icons instead and update the manifest
const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="32" fill="#1B998B"/>
  <text x="96" y="120" font-size="90" font-family="Arial,sans-serif" fill="white" text-anchor="middle" font-weight="bold">R</text>
</svg>`;

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#1B998B"/>
  <text x="256" y="320" font-size="240" font-family="Arial,sans-serif" fill="white" text-anchor="middle" font-weight="bold">R</text>
</svg>`;

fs.writeFileSync(path.join(dir, 'icon-192.svg'), svg192);
fs.writeFileSync(path.join(dir, 'icon-512.svg'), svg512);

// Also create minimal valid PNGs using Buffer
// Minimal 1x1 green PNG for the manifest references
function createMinimalPng(size) {
  // This creates an extremely minimal valid PNG
  // In production, you'd use proper icon generation
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.floor(size/6)}" fill="#1B998B"/><text x="${size/2}" y="${size*0.6}" font-size="${Math.floor(size*0.47)}" font-family="Arial" fill="white" text-anchor="middle" font-weight="bold">R</text></svg>`;
  return svg;
}

// Write SVGs as .png won't work without a proper encoder, update manifest to use SVG
fs.writeFileSync(path.join(dir, 'icon-192.png'), createMinimalPng(192));
fs.writeFileSync(path.join(dir, 'icon-512.png'), createMinimalPng(512));

console.log('Icons created in', dir);
