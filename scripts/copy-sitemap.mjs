/**
 * Kopiert sitemap-0.xml nach sitemap.xml und formatiert die XML lesbar (Pretty-Print).
 * Suchmaschinen erwarten oft /sitemap.xml – hier liefern wir die vollständige URL-Liste.
 */
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const src = join(distDir, 'sitemap-0.xml');
const dest = join(distDir, 'sitemap.xml');

function formatSitemapXml(xml) {
  return xml
    .replace(/<\?xml[^?]*\?>\s*/, (m) => m.trim() + '\n')
    .replace(/<urlset[^>]*>/, (m) => m + '\n')
    .replace(/<\/url><url>/g, '</url>\n  <url>')
    .replace(/<urlset[^>]*><url>/, (m) => m.replace('<url>', '\n  <url>'))
    .replace(/<(loc|lastmod|changefreq|priority)>/g, '\n    <$1>')
    .replace(/<\/urlset>/, '\n</urlset>')
    .replace(/^\s*\n/, '')
    .trim() + '\n';
}

try {
  const xml = await readFile(src, 'utf-8');
  const formatted = formatSitemapXml(xml);
  await writeFile(dest, formatted);
  console.log('  sitemap-0.xml → sitemap.xml (formatiert)');
} catch (err) {
  if (err.code === 'ENOENT') {
    console.warn('  sitemap-0.xml nicht gefunden – Sitemap-Integration prüfen');
  } else {
    throw err;
  }
}
