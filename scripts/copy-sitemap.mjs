/**
 * Kopiert sitemap-0.xml (alle URLs) nach sitemap.xml für den kanonischen SEO-Einstieg.
 * Suchmaschinen erwarten oft /sitemap.xml – hier liefern wir direkt die vollständige URL-Liste.
 */
import { copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const src = join(distDir, 'sitemap-0.xml');
const dest = join(distDir, 'sitemap.xml');

try {
  await copyFile(src, dest);
  console.log('  sitemap-0.xml → sitemap.xml (vollständige URL-Liste)');
} catch (err) {
  if (err.code === 'ENOENT') {
    console.warn('  sitemap-0.xml nicht gefunden – Sitemap-Integration prüfen');
  } else {
    throw err;
  }
}
