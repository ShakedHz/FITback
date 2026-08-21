/**
 * Regenerate PNG app icons from public/icon.svg
 * Run: node scripts/generate-logos.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svg = readFileSync(join(root, 'public/icon.svg'));

const sizes = [
  { name: 'fitback-logo-192.png', size: 192 },
  { name: 'fitback-logo-512.png', size: 512 },
  { name: 'fitback-logo-1024.png', size: 1024 },
  { name: 'fitback-logo.png', size: 512 },
];

for (const { name, size } of sizes) {
  const out = join(root, 'public', name);
  const png = await sharp(svg).resize(size, size).png().toBuffer();
  writeFileSync(out, png);
  console.log(`Wrote ${name} (${size}x${size})`);
}
