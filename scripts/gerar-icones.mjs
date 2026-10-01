// Gera os ícones do PWA a partir do símbolo do Hub do Carlos (identidade/logo-hub-simbolo.png:
// o "C" com a estrela, recortado da logo com fundo transparente).
// Uso: node scripts/gerar-icones.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BG = "#050506";
const SYMBOL = "identidade/logo-hub-simbolo.png";

// scale = quanto do quadrado o símbolo ocupa (o maskable é recortado em círculo: precisa de margem).
async function icon(file, size, scale, rounded) {
  const inner = Math.round(size * scale);
  const symbol = await sharp(SYMBOL).resize(inner, inner).png().toBuffer();
  const radius = rounded ? size * 0.22 : 0;
  const base = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/></svg>`,
  );
  const offset = Math.round((size - inner) / 2);
  await sharp(base).composite([{ input: symbol, left: offset, top: offset }]).png().toFile(file);
  console.log("✓", file);
}

await mkdir("public/icons", { recursive: true });
await icon("public/icons/icon-192.png", 192, 0.66, false);
await icon("public/icons/icon-512.png", 512, 0.66, false);
await icon("public/icons/icon-maskable-512.png", 512, 0.54, false);
await icon("src/app/apple-icon.png", 180, 0.66, false);
await icon("src/app/icon.png", 64, 0.8, true);
