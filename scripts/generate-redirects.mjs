import { writeFileSync } from 'fs';
import { resolve } from 'path';

// Static redirects only. Contentful-managed redirects were removed when migrating
// the CMS to Cloudflare D1. Add new entries below in the `_redirects` format
// (see https://developers.cloudflare.com/pages/configuration/redirects/).
const staticRedirects = [];

async function main() {
  const lines = [
    '# Auto-generated redirects',
    '# Do not edit manually – managed by scripts/generate-redirects.mjs',
    '',
    '# Static redirects',
    ...staticRedirects,
  ];

  const outPath = resolve('dist', '_redirects');
  writeFileSync(outPath, lines.join('\n') + '\n', 'utf-8');
  console.log(`  _redirects: ${staticRedirects.length} static redirect(s) written to dist/_redirects`);
}

main().catch((err) => {
  console.error('generate-redirects failed:', err);
  process.exit(1);
});
