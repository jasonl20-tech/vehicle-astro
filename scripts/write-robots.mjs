/**
 * Writes robots.txt into dist/ with the current SITE_URL.
 * Falls back to https://vehicleimagery.com when the env var is not set.
 */
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const SITE = (process.env.SITE_URL || 'https://vehicleimagery.com').replace(/\/$/, '');

const body = [
  'User-agent: *',
  'Allow: /',
  '',
  `Sitemap: ${SITE}/sitemap.xml`,
  '',
].join('\n');

await writeFile(join(distDir, 'robots.txt'), body);
console.log(`  robots.txt -> Sitemap: ${SITE}/sitemap.xml`);
