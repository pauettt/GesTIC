// Genera totes les icones de gesTIC a partir d'un sol dibuix: el requadre «TIC»
// de la pantalla d'inici de sessió. Les lletres són traços i no text, perquè
// l'SVG es vegi igual sense dependre de les fonts de qui el mostra.
//
// Ús: node scripts/generate-icons.mjs (fa servir sharp, que ja ve amb Next).

import { writeFile } from "node:fs/promises";

import sharp from "sharp";

// --primary del tema clar, oklch(0.45 0.11 235).
const PRIMARY = "#005d89";
const SIZE = 512;

// «TIC» en unitats pròpies: 100 d'alçada i 229 d'amplada.
const GLYPH = { width: 229, height: 100 };
const STROKE = 26;

function glyph() {
  // La C és un arc el·líptic obert per la dreta.
  const cx = 195;
  const cy = 50;
  const rx = 38;
  const ry = 37;
  const angle = (48 * Math.PI) / 180;
  const endX = round(cx + rx * Math.cos(angle));
  const topY = round(cy - ry * Math.sin(angle));
  const bottomY = round(cy + ry * Math.sin(angle));
  return [
    `<path d="M0 0H84V${STROKE}H55V100H29V${STROKE}H0Z"/>`,
    `<rect x="100" width="${STROKE}" height="100"/>`,
    `<path d="M${endX} ${topY}A${rx} ${ry} 0 1 0 ${endX} ${bottomY}" fill="none" stroke="#fff" stroke-width="${STROKE}"/>`,
  ].join("");
}

function round(value) {
  return Math.round(value * 100) / 100;
}

/**
 * `radius` arrodoneix el fons; amb 0 el fons omple tot el quadrat, com volen
 * l'iPhone i les icones «maskable» d'Android, que hi posen la seva forma.
 * `scale` és la mida de les lletres: amb 1.44 caben dins la zona segura d'una
 * icona maskable (un cercle del 80% del costat).
 */
function iconSvg({ radius, scale }) {
  const tx = round((SIZE - GLYPH.width * scale) / 2);
  const ty = round((SIZE - GLYPH.height * scale) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" rx="${radius}" fill="${PRIMARY}"/><g transform="translate(${tx} ${ty}) scale(${scale})" fill="#fff">${glyph()}</g></svg>\n`;
}

function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

/** Un .ico amb PNG a dins, que és el que entenen tots els navegadors actuals. */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

// A la pestanya del navegador, les lletres més grosses i menys marge.
const tab = iconSvg({ radius: 96, scale: 1.9 });
const rounded = iconSvg({ radius: 128, scale: 1.44 });
const fullBleed = iconSvg({ radius: 0, scale: 1.44 });

const outputs = {
  "src/app/icon.svg": tab,
  "src/app/favicon.ico": ico(
    await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(tab, size) }))),
  ),
  "src/app/apple-icon.png": await png(fullBleed, 180),
  "public/icon-192.png": await png(rounded, 192),
  "public/icon-512.png": await png(rounded, 512),
  "public/icon-maskable-512.png": await png(fullBleed, 512),
};

for (const [path, content] of Object.entries(outputs)) {
  await writeFile(new URL(`../${path}`, import.meta.url), content);
  console.log(`✓ ${path}`);
}
