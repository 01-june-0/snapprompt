// Generate SnapPrompt icon PNGs (gradient rounded square + white lightning bolt).
// Uses only Node built-ins (zlib for deflate + crc32). Run: node scripts/generate-icons.mjs
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'src', 'assets', 'icons');
mkdirSync(OUT, { recursive: true });

const SS = 4; // supersampling factor

// violet gradient stops (top -> bottom)
const TOP = [139, 92, 246]; // #8B5CF6
const BOT = [109, 40, 217]; // #6D28D9
const WHITE = [255, 255, 255];

// Lightning bolt polygon in 0..1 space
const BOLT = [
  [0.56, 0.10],
  [0.30, 0.54],
  [0.47, 0.54],
  [0.43, 0.90],
  [0.72, 0.44],
  [0.54, 0.44],
];

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// rounded-rect coverage (1 if inside, 0 outside) in 0..1 space
function inRoundedRect(x, y, r) {
  // corners
  if (x < r && y < r) return (x - r) ** 2 + (y - r) ** 2 <= r * r;
  if (x > 1 - r && y < r) return (x - (1 - r)) ** 2 + (y - r) ** 2 <= r * r;
  if (x < r && y > 1 - r) return (x - r) ** 2 + (y - (1 - r)) ** 2 <= r * r;
  if (x > 1 - r && y > 1 - r) return (x - (1 - r)) ** 2 + (y - (1 - r)) ** 2 <= r * r;
  return true;
}

function renderRGBA(size) {
  const S = size * SS;
  const buf = Buffer.alloc(S * S * 4);
  const radius = 0.22;
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const u = (px + 0.5) / S;
      const v = (py + 0.5) / S;
      const idx = (py * S + px) * 4;
      if (!inRoundedRect(u, v, radius)) {
        buf[idx + 3] = 0; // transparent
        continue;
      }
      const bg = lerp(TOP, BOT, v);
      if (pointInPoly(u, v, BOLT)) {
        buf[idx] = WHITE[0];
        buf[idx + 1] = WHITE[1];
        buf[idx + 2] = WHITE[2];
      } else {
        buf[idx] = bg[0];
        buf[idx + 1] = bg[1];
        buf[idx + 2] = bg[2];
      }
      buf[idx + 3] = 255;
    }
  }
  // downsample SSxSS -> 1 (box filter)
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          const sx = x * SS + dx;
          const sy = y * SS + dy;
          const i = (sy * S + sx) * 4;
          const alpha = buf[i + 3];
          r += buf[i] * alpha;
          g += buf[i + 1] * alpha;
          b += buf[i + 2] * alpha;
          a += alpha;
        }
      }
      const oi = (y * size + x) * 4;
      if (a === 0) {
        out[oi] = out[oi + 1] = out[oi + 2] = out[oi + 3] = 0;
      } else {
        out[oi] = Math.round(r / a);
        out[oi + 1] = Math.round(g / a);
        out[oi + 2] = Math.round(b / a);
        out[oi + 3] = Math.round(a / (SS * SS));
      }
    }
  }
  return out;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // add filter byte (0) per row
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [16, 32, 48, 128]) {
  const rgba = renderRGBA(size);
  const png = encodePNG(rgba, size);
  const file = join(OUT, `icon-${size}.png`);
  writeFileSync(file, png);
  console.log(`✓ ${file} (${png.length} bytes)`);
}
console.log('Done.');
