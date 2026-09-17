#!/usr/bin/env node
/*
 * Classic 88×31 homepage button. Pixel-drawn PNG, no dependencies.
 * Run: node scripts/make-badge.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 88;
const H = 31;
const NAVY = [18, 18, 24, 255];
const CORAL = [200, 69, 52, 255];
const CREAM = [244, 236, 208, 255];
const MUTED = [186, 176, 160, 255];
const EDGE = [80, 72, 68, 255];

const px = Buffer.alloc(W * H * 4);
function set(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 4;
  px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = c[3];
}
function fill(x, y, w, h, c) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, c);
}

fill(0, 0, W, H, NAVY);
fill(0, 0, W, 1, EDGE);
fill(0, H - 1, W, 1, EDGE);
fill(0, 0, 1, H, EDGE);
fill(W - 1, 0, 1, H, EDGE);
fill(2, 2, 6, H - 4, CORAL);
fill(3, 12, 4, 2, CREAM);

// 3×5 bitmap, columns left-to-right in bits 2..0
const FONT = {
  C: ['011', '100', '100', '100', '011'],
  E: ['111', '100', '110', '100', '111'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  M: ['101', '111', '111', '101', '101'],
  N: ['110', '101', '101', '101', '101'],
  O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'],
  A: ['010', '101', '111', '101', '101'],
  K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  I: ['111', '010', '010', '010', '111'],
  '.': ['000', '000', '000', '000', '010'],
  ' ': ['000', '000', '000', '000', '000']
};

function text(str, x, y, color, scale) {
  scale = scale || 1;
  let cx = x;
  for (const ch of str) {
    const rows = FONT[ch] || FONT[' '];
    for (let r = 0; r < 5; r++) {
      for (let b = 0; b < 3; b++) {
        if (rows[r][b] === '1') {
          fill(cx + b * scale, y + r * scale, scale, scale, color);
        }
      }
    }
    cx += 4 * scale;
  }
}

text('MANAIA', 12, 5, CREAM, 2);
text('KALANI', 12, 18, MUTED, 2);

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0;
  for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    const d = y * (W * 4 + 1) + 1 + x * 4;
    raw[d] = px[o]; raw[d + 1] = px[o + 1]; raw[d + 2] = px[o + 2]; raw[d + 3] = px[o + 3];
  }
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0))
]);
const out = path.join(__dirname, '..', 'badge-88x31.png');
fs.writeFileSync(out, png);
console.log('wrote ' + out);
