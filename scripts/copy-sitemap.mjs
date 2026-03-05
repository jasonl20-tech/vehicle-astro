/**
 * Kopiert sitemap-index.xml nach sitemap.xml für den kanonischen SEO-Einstieg.
 * Suchmaschinen erwarten oft /sitemap.xml als Einstiegspunkt.
 */
import { copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const src = join(distDir, 'sitemap-index.xml');
const dest = join(distDir, 'sitemap.xml');

try {
  await copyFile(src, dest);
  console.log('  sitemap-index.xml → sitemap.xml (kopiert)');
} catch (err) {
  if (err.code === 'ENOENT') {
    console.warn('  sitemap-index.xml nicht gefunden – Sitemap-Integration prüfen');
  } else {
    throw err;
  }
}
