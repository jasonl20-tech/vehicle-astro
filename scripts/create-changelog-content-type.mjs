/**
 * Erstellt das Changelog Content Model in Contentful (ein einziges Modell).
 *
 * Benötigt: CONTENTFUL_SPACE_ID und CONTENTFUL_MANAGEMENT_TOKEN in .env
 * Management Token: Contentful → Settings → API keys → Content management tokens
 */

import { createClient } from 'contentful-management';

const spaceId = process.env.CONTENTFUL_SPACE_ID;
const managementToken = process.env.CONTENTFUL_MANAGEMENT_TOKEN;

if (!spaceId || !managementToken) {
  console.error('FEHLER: CONTENTFUL_SPACE_ID und CONTENTFUL_MANAGEMENT_TOKEN in .env setzen');
  process.exit(1);
}

const client = createClient({ accessToken: managementToken });

async function main() {
  const space = await client.getSpace(spaceId);
  const env = await space.getEnvironment('master');

  const contentType = await env.createContentTypeWithId('changelog', {
    name: 'Changelog',
    description: 'Changelog-Einträge für die Vehicle Imagery Website. Statisch beim Build.',
    displayField: 'title',
    fields: [
      { id: 'title', name: 'Title', type: 'Symbol', required: true },
      { id: 'slug', name: 'Slug', type: 'Symbol', required: true, validations: [{ regexp: { pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' } }] },
      { id: 'body', name: 'Body', type: 'RichText', required: false },
      { id: 'excerpt', name: 'Excerpt', type: 'Text', required: false },
      { id: 'featuredImage', name: 'Featured Image', type: 'Link', linkType: 'Asset', required: false },
      { id: 'featuredImageAlt', name: 'Featured Image Alt', type: 'Symbol', required: false },
      { id: 'gallery', name: 'Gallery', type: 'Array', items: { type: 'Link', linkType: 'Asset' }, required: false },
      { id: 'ogImage', name: 'OG Image', type: 'Link', linkType: 'Asset', required: false },
      { id: 'ogImageAlt', name: 'OG Image Alt', type: 'Symbol', required: false },
      { id: 'changesText', name: 'Changes', type: 'Text', required: false },
      { id: 'version', name: 'Version', type: 'Symbol', required: false },
      { id: 'category', name: 'Category', type: 'Symbol', required: false },
      { id: 'publishedDate', name: 'Published Date', type: 'Date', required: false },
      { id: 'author', name: 'Author', type: 'Symbol', required: false },
      { id: 'tags', name: 'Tags', type: 'Array', items: { type: 'Symbol' }, required: false },
      { id: 'metaTitle', name: 'Meta Title', type: 'Symbol', required: false },
      { id: 'metaDescription', name: 'Meta Description', type: 'Text', required: false },
    ],
  });

  await contentType.publish();
  console.log('Changelog Content Type erfolgreich erstellt und veröffentlicht.');
}

main().catch((e) => {
  if (e.message?.includes('already exists')) {
    console.log('Changelog Content Type existiert bereits. Keine Änderung.');
  } else {
    console.error('Fehler:', e.message);
    process.exit(1);
  }
});
