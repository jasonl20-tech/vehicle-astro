/**
 * Testet die Contentful-Verbindung und listet Changelog-Einträge.
 * Lokal: .env mit CONTENTFUL_SPACE_ID und CONTENTFUL_ACCESS_TOKEN
 * Oder: CONTENTFUL_SPACE_ID=xxx CONTENTFUL_ACCESS_TOKEN=xxx node scripts/test-contentful.mjs
 */

import { createClient } from 'contentful';

const space = process.env.CONTENTFUL_SPACE_ID;
const token = process.env.CONTENTFUL_ACCESS_TOKEN;

if (!space || !token) {
  console.error('FEHLER: CONTENTFUL_SPACE_ID und CONTENTFUL_ACCESS_TOKEN setzen');
  process.exit(1);
}

const client = createClient({ space, accessToken: token });

async function main() {
  console.log('Contentful-Verbindung wird getestet...\n');
  try {
    const res = await client.getEntries({ content_type: 'changelog', order: '-sys.createdAt', include: 2 });
    console.log('Erfolg! Gefundene Changelog-Einträge:', res.items.length);
    if (res.items.length === 0) {
      console.log('\nMögliche Ursachen:');
      console.log('  - Content Type API ID muss genau "changelog" sein (lowercase)');
      console.log('  - Einträge müssen PUBLISHED sein (nicht nur Draft)');
      console.log('  - Jeder Eintrag braucht ein ausgefülltes Slug-Feld');
    } else {
      res.items.forEach((item, i) => {
        const slug = item.fields?.slug ?? '(leer)';
        const title = item.fields?.title ?? '(leer)';
        const published = item.sys?.publishedAt ? 'ja' : 'nein (Draft!)';
        console.log(`  ${i + 1}. ${title} | slug: ${slug} | published: ${published}`);
      });
    }
  } catch (e) {
    console.error('Fehler:', e.message);
    if (e.message?.includes('401')) console.error('  -> Falscher Access Token oder Space ID');
    if (e.message?.includes('404')) console.error('  -> Content Type "changelog" existiert nicht');
    process.exit(1);
  }
}

main();
