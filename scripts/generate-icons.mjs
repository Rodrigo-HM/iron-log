import sharp from 'sharp';

function makeSvg(size) {
  const r = Math.round(size * 0.18);
  const border = Math.round(size * 0.018);
  const gap = Math.round(size * 0.07);
  const rInner = Math.max(r - gap + border, 4);

  const fx = gap, fy = gap;
  const fw = size - gap * 2;
  const fh = size - gap * 2;

  // Dibujar "IL" como rectángulos para centrado exacto
  // I: barra vertical fina
  // L: barra vertical + barra horizontal abajo
  const letterH = size * 0.38;   // altura de las letras
  const letterY = (size - letterH) / 2;  // Y centrado vertical
  const barW = size * 0.07;      // ancho de cada barra
  const lFootW = size * 0.14;    // pie de la L
  const lFootH = size * 0.07;    // grosor del pie de la L
  const gap2 = size * 0.055;     // espacio entre I y L

  // Bloque total de las dos letras: I + gap + L
  const totalW = barW + gap2 + barW + lFootW - barW;
  // L ocupa barW de tronco + (lFootW - barW) de pie que sobresale
  const totalW2 = barW + gap2 + lFootW;
  const startX = (size - totalW2) / 2;

  const iX = startX;
  const lX = startX + barW + gap2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#000000"/>
  <rect x="${fx}" y="${fy}" width="${fw}" height="${fh}"
        rx="${rInner}" ry="${rInner}"
        fill="none" stroke="#FF4500" stroke-width="${border}"/>
  <!-- I -->
  <rect x="${iX}" y="${letterY}" width="${barW}" height="${letterH}" fill="#FF4500"/>
  <!-- L: tronco vertical -->
  <rect x="${lX}" y="${letterY}" width="${barW}" height="${letterH}" fill="#FF4500"/>
  <!-- L: pie horizontal -->
  <rect x="${lX}" y="${letterY + letterH - lFootH}" width="${lFootW}" height="${lFootH}" fill="#FF4500"/>
</svg>`;
}

async function generate(size, outPath) {
  const svg = Buffer.from(makeSvg(size));
  await sharp(svg, { density: 300 })
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath}`);
}

await generate(192, 'public/icons/icon-192.png');
await generate(512, 'public/icons/icon-512.png');
