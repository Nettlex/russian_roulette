// Run this with: node public/create-icon.js
// Requires: npm install canvas
const fs = require('fs');
const { createCanvas } = require('canvas');

const canvas = createCanvas(1024, 1024);
const ctx = canvas.getContext('2d');

// Black background
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, 1024, 1024);

// Revolver emoji
ctx.font = '600px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = '#ffffff';
ctx.fillText('🔫', 512, 512);

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/icon.png', buffer);
console.log('✅ Icon generated: public/icon.png');

