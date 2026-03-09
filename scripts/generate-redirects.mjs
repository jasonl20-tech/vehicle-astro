import { createClient } from 'contentful';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const staticRedirects = [];

async function main() {
  const space = process.env.CONTENTFUL_SPACE_ID;
  const token = process.env.CONTENTFUL_ACCESS_TOKEN;

  let contentfulRedirects = [];

  if (space && token) {
    try {
      const client = createClient({ space, accessToken: token });
      const res = await client.getEntries({ content_type: 'redirect', limit: 500 });

      for (const item of res.items) {
        const f = item.fields;
        if (!f?.fromPath || !f?.toPath) continue;
        if (f.active === false) continue;
        const from = String(f.fromPath).trim();
        const to = String(f.toPath).trim();
        const code = f.statusCode || 301;
        contentfulRedirects.push(`${from} ${to} ${code}`);
      }

      console.log(`  _redirects: ${contentfulRedirects.length} Contentful redirect(s) loaded`);
    } catch (err) {
      console.warn('  _redirects: Could not fetch Contentful redirects:', err.message);
    }
  } else {
    console.log('  _redirects: No Contentful credentials, using static redirects only');
  }

  const lines = [
    '# Auto-generated redirects (static + Contentful)',
    '# Do not edit manually – managed by scripts/generate-redirects.mjs',
    '',
    '# Static redirects',
    ...staticRedirects,
  ];

  if (contentfulRedirects.length > 0) {
    lines.push('', '# Contentful-managed redirects', ...contentfulRedirects);
  }

  const outPath = resolve('dist', '_redirects');
  writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
  console.log(`  _redirects: ${staticRedirects.length + contentfulRedirects.length} total redirect(s) written to dist/_redirects`);
}

main().catch((err) => {
  console.error('generate-redirects failed:', err);
  process.exit(1);
});
