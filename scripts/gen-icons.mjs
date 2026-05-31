import { writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const svg = (size, maskable = false) => {
  // For maskable: leave 10% safe-area padding so iOS/Android masks don't clip.
  const pad = maskable ? size * 0.1 : 0;
  const inner = size - pad * 2;
  const fontSize = inner * 0.42;
  const tickSize = inner * 0.06;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#1a1a1a"/>
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" fill="#1a1a1a"/>
  <text
    x="${size / 2}"
    y="${size / 2}"
    fill="#F0E040"
    font-family="Impact, 'Arial Black', system-ui, sans-serif"
    font-weight="900"
    font-size="${fontSize}"
    text-anchor="middle"
    dominant-baseline="central"
    letter-spacing="${tickSize * -0.1}"
  >HX</text>
  <rect x="${pad}" y="${size - pad - tickSize}" width="${inner}" height="${tickSize}" fill="#F0E040"/>
</svg>`;
};

const renderTo = (file, size, maskable = false) => {
  const resvg = new Resvg(svg(size, maskable), { fitTo: { mode: 'width', value: size } });
  writeFileSync(file, resvg.render().asPng());
  console.log('wrote', file);
};

renderTo('public/icon-192.png', 192);
renderTo('public/icon-512.png', 512);
renderTo('public/icon-512-maskable.png', 512, true);
renderTo('public/apple-touch-icon.png', 180);
