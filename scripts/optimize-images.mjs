import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const imagesDir = join(__dirname, '..', 'public', 'images');

const pngs = await readdir(imagesDir).then(files => files.filter(f => extname(f).toLowerCase() === '.png')).catch(() => []);

for (const file of pngs) {
  const input = join(imagesDir, file);
  const output = join(imagesDir, file.replace(/\.png$/i, '.webp'));
  const img = sharp(input);
  const meta = await img.metadata();
  const maxWidth = 1400;
  const width = meta.width > maxWidth ? maxWidth : meta.width;
  await sharp(input)
    .resize(width, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`${file} -> ${file.replace(/\.png$/i, '.webp')}`);
}
console.log('Done.');
