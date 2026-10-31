const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const parityDir = path.join(__dirname, '..', '.render-temp', 'parity-verify');

function testCrop(t, y, h) {
  const previewImg = path.join(parityDir, `preview_t${t}.png`);
  const exportImg = path.join(parityDir, `export_t${t}.png`);
  const filter = `[0:v]crop=1080:${h}:0:${y},format=rgb24[v0];[1:v]crop=1080:${h}:0:${y},format=rgb24[v1];[v0][v1]ssim`;
  const res = spawnSync('ffmpeg', ['-i', previewImg, '-i', exportImg, '-filter_complex', filter, '-f', 'null', '-'], {
    encoding: 'utf8'
  });
  const combined = (res.stderr || '') + (res.stdout || '');
  const match = combined.match(/All:([0-9.]+)/);
  return match ? match[1] : `No match: ${combined.slice(0, 150)}`;
}

console.log('--- ZONE ANALYSIS FOR t=0 ---');
console.log('Top Header (y=0, h=300):', testCrop(0, 0, 300));
console.log('Video / Face (y=300, h=800):', testCrop(0, 300, 800));
console.log('Lower Third Captions (y=1400, h=520):', testCrop(0, 1400, 520));

console.log('--- ZONE ANALYSIS FOR t=1 ---');
console.log('Top Header (y=0, h=300):', testCrop(1, 0, 300));
console.log('Video / Face (y=300, h=800):', testCrop(1, 300, 800));
console.log('Lower Third Captions (y=1400, h=520):', testCrop(1, 1400, 520));

console.log('--- ZONE ANALYSIS FOR t=15 ---');
console.log('Top Header (y=0, h=300):', testCrop(15, 0, 300));
console.log('Video / Face (y=300, h=800):', testCrop(15, 300, 800));
console.log('Lower Third Captions (y=1400, h=520):', testCrop(15, 1400, 520));