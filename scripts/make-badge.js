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
const EDGE = [90, 82, 74, 255];

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
fill(1, 1, 8, H - 2, CORAL);

// 5×7 caps, rows of 5 bits as strings
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00100', '00100']
};

function text(str, x, y, color) {
  let cx = x;
  for (const ch of str) {
    if (ch === ' ') { cx += 4; continue; }
    const rows = FONT[ch];
    if (!rows) { cx += 6; continue; }
    for (let r = 0; r < 7; r++) {
      for (let b = 0; b < 5; b++) if (rows[r][b] === '1') set(cx + b, y + r, color);
    }
    cx += 6;
  }
}

text('MNK', 12, 4, CREAM);
text('A HOMEPAGE', 12, 18, MUTED);

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
fs.writeFileSync(path.join(__dirname, '..', 'badge-88x31.png'), png);
console.log('wrote badge-88x31.png');
