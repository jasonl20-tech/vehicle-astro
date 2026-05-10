/**
 * Kopiert sitemap-0.xml nach sitemap.xml, formatiert die XML lesbar (Pretty-Print)
 * und ersetzt die <lastmod>-Werte fuer alle dynamisch erzeugten Seiten durch die
 * tatsaechlichen `updated_at`-Werte aus Cloudflare D1.
 *
 * Mapping:
 *   /<slug>             -> landingPages
 *   /blog/<slug>        -> blog
 *   /case-studies/<slug>-> caseStudy
 *   /press/<slug>       -> pressReleases
 *   /changelog/<slug>   -> changelogs
 *   /faq                -> juengster faqEntrys / faqCategorys
 *
 * Statische Seiten (kein D1-Backing) behalten den von Astro gesetzten Wert.
 */
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const src = join(distDir, 'sitemap-0.xml');
const dest = join(distDir, 'sitemap.xml');

const SITE = (process.env.SITE_URL || 'https://vehicleimagery.com').replace(/\/$/, '');
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const DYNAMIC_TYPES = ['landingPages', 'blog', 'caseStudy', 'pressReleases', 'changelogs'];

function slugifyTitle(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' und ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function d1Query(sql, params = []) {
  if (!ACCOUNT_ID || !DATABASE_ID || !TOKEN) return [];
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ sql, params }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`D1 HTTP ${res.status} - ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  if (!data.success) {
    throw new Error(`D1 error: ${JSON.stringify(data.errors ?? data)}`);
  }
  return data.result?.[0]?.results ?? [];
}

/** Builds a Map<absoluteUrl, ISO updated_at> from all dynamic D1 content types. */
async function buildLastmodMap() {
  const map = new Map();
  if (!ACCOUNT_ID || !DATABASE_ID || !TOKEN) {
    console.warn('  D1 creds missing - sitemap lastmod will use Astro defaults');
    return map;
  }

  const types = DYNAMIC_TYPES.map((t) => `'${t}'`).join(',');
  const rows = await d1Query(
    `SELECT id, content_type, content, updated_at
       FROM cms_contents
      WHERE locale = 'en-US' AND content_type IN (${types})`,
  );

  for (const row of rows) {
    let payload = {};
    try { payload = JSON.parse(row.content); } catch { /* ignore */ }
    const slug = (typeof payload.slug === 'string' && payload.slug.trim())
      ? payload.slug.trim()
      : slugifyTitle(payload.title);
    if (!slug) continue;
    const iso = new Date(row.updated_at).toISOString();
    let path = '';
    switch (row.content_type) {
      case 'landingPages':   path = `/${slug}`; break;
      case 'blog':           path = `/blog/${slug}`; break;
      case 'caseStudy':      path = `/case-studies/${slug}`; break;
      case 'pressReleases':  path = `/press/${slug}`; break;
      case 'changelogs':     path = `/changelog/${slug}`; break;
      default: continue;
    }
    map.set(`${SITE}${path}`, iso);
  }

  // Latest FAQ entry => /faq
  const faqRows = await d1Query(
    `SELECT MAX(updated_at) AS max_updated FROM cms_contents WHERE locale = 'en-US' AND content_type IN ('faqEntrys', 'faqCategorys')`,
  );
  if (faqRows[0]?.max_updated) {
    map.set(`${SITE}/faq`, new Date(faqRows[0].max_updated).toISOString());
  }

  // Latest blog entry => /blog index, latest changelog => /changelog index, etc.
  for (const [type, indexPath] of [
    ['blog', '/blog'],
    ['changelogs', '/changelog'],
    ['caseStudy', '/case-studies'],
    ['pressReleases', '/press'],
  ]) {
    const r = await d1Query(
      `SELECT MAX(updated_at) AS max_updated FROM cms_contents WHERE locale = 'en-US' AND content_type = ?`,
      [type],
    );
    if (r[0]?.max_updated) {
      map.set(`${SITE}${indexPath}`, new Date(r[0].max_updated).toISOString());
    }
  }

  return map;
}

function applyLastmodOverrides(xml, lastmodMap) {
  if (lastmodMap.size === 0) return { xml, replaced: 0 };
  let replaced = 0;
  const patched = xml.replace(/<url>([\s\S]*?)<\/url>/g, (block) => {
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    if (!locMatch) return block;
    const loc = locMatch[1].trim();
    const override = lastmodMap.get(loc);
    if (!override) return block;
    replaced += 1;
    if (/<lastmod>[^<]*<\/lastmod>/.test(block)) {
      return block.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${override}</lastmod>`);
    }
    return block.replace('</loc>', `</loc><lastmod>${override}</lastmod>`);
  });
  return { xml: patched, replaced };
}

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
  const lastmodMap = await buildLastmodMap();
  const { xml: patchedXml, replaced } = applyLastmodOverrides(xml, lastmodMap);
  const formatted = formatSitemapXml(patchedXml);
  await writeFile(dest, formatted);
  console.log(`  sitemap-0.xml -> sitemap.xml (formatted, ${replaced} lastmod entries patched from D1)`);
} catch (err) {
  if (err.code === 'ENOENT') {
    console.warn('  sitemap-0.xml not found - sitemap integration check needed');
  } else {
    throw err;
  }
}
