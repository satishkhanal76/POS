import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { appBranding, startupAssets } from '../src/config/appBranding';
import { escapeHtml } from '../src/pwa/startupMarkup';

const publicDirectory = new URL('../public/', import.meta.url);
await mkdir(new URL('icons/', publicDirectory), { recursive: true });
await mkdir(new URL('startup/', publicDirectory), { recursive: true });
const mark = '<path fill="white" fill-rule="evenodd" d="M168 143h98c60 0 90 31 90 80s-30 80-90 80h-50v66h-48V143zm48 45v70h48c29 0 44-11 44-35s-15-35-44-35h-48z"/>';
const icon = (maskable = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="${appBranding.accent}"/>${mark}</svg>`;
await writeFile(new URL('icons/app-icon.svg', publicDirectory), icon());
for (const size of [192, 512]) {
  await sharp(Buffer.from(icon())).resize(size, size).png().toFile(new URL(`icons/icon-${size}.png`, publicDirectory).pathname);
  await sharp(Buffer.from(icon(true))).resize(size, size).png().toFile(new URL(`icons/maskable-${size}.png`, publicDirectory).pathname);
}
await sharp(Buffer.from(icon(true))).resize(180, 180).png().toFile(new URL('icons/apple-touch-icon.png', publicDirectory).pathname);
await sharp(Buffer.from(icon())).resize(32, 32).png().toFile(new URL('icons/favicon-32.png', publicDirectory).pathname);

// Generate sequentially to keep memory bounded, even for large tablet launch images.
for (const asset of startupAssets()) {
  const width = asset.orientation === 'portrait' ? asset.width : asset.height;
  const height = asset.orientation === 'portrait' ? asset.height : asset.width;
  const background = asset.theme === 'dark' ? appBranding.darkBackground : appBranding.background;
  const foreground = asset.theme === 'dark' ? appBranding.darkForeground : appBranding.foreground;
  const muted = asset.theme === 'dark' ? appBranding.darkMutedForeground : appBranding.mutedForeground;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * asset.ratio}" height="${height * asset.ratio}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${background}"/>
    <svg x="${width / 2 - 40}" y="${height / 2 - 100}" width="80" height="80" viewBox="0 0 512 512">${icon().replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
    <text x="50%" y="${height / 2 + 22}" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="${foreground}">${escapeHtml(appBranding.shortName)}</text>
    <text x="50%" y="${height / 2 + 52}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="${muted}">${escapeHtml(appBranding.tagline)}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(new URL(asset.file, publicDirectory).pathname);
}
console.log(`Generated install icons and ${startupAssets().length} Apple launch images.`);
