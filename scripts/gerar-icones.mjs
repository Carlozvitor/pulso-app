// Gera os ícones provisórios do PWA a partir de um SVG simples.
// Uso: node scripts/gerar-icones.mjs
// Quando existir logo definitivo, trocar o SVG abaixo por identidade/logo.svg.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BG = "#0a0a0b";
const ACCENT = "#4c5bff";
const SOFT = "#8b95ff";

// scale < 1 deixa margem de segurança (ícone maskable é recortado em círculo)
const mark = (size, scale, rounded) => {
  const c = size / 2;
  const r = (size * 0.13) * scale;
  const ring = (size * 0.27) * scale;
  const radius = rounded ? size * 0.22 : 0;
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/>
  <circle cx="${c}" cy="${c}" r="${ring}" fill="none" stroke="${SOFT}" stroke-opacity="0.35" stroke-width="${size * 0.02 * scale}"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="${ACCENT}"/>
</svg>`);
};

const out = [
  ["public/icons/icon-192.png", 192, 1, false],
  ["public/icons/icon-512.png", 512, 1, false],
  ["public/icons/icon-maskable-512.png", 512, 0.8, false],
  ["src/app/apple-icon.png", 180, 1, false],
  ["src/app/icon.png", 64, 1.4, true],
];

await mkdir("public/icons", { recursive: true });
for (const [file, size, scale, rounded] of out) {
  await sharp(mark(size, scale, rounded)).png().toFile(file);
  console.log("✓", file);
}
