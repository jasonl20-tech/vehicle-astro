/**
 * Erstellt den einen Blog-Post-Content-Type in Contentful (alle Felder in einem Type).
 *
 * Benötigt: CONTENTFUL_SPACE_ID und CONTENTFUL_MANAGEMENT_TOKEN in .env
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

  const contentType = await env.createContentTypeWithId('blogPost', {
    name: 'Blog Post',
    description: 'Blog-Artikel in einem Content Type. Alle Felder inkl. Autor, SEO, OG. Beim Build statisch generiert.',
    displayField: 'title',
    fields: [
      { id: 'title', name: 'Title', type: 'Symbol', required: true, validations: [{ size: { max: 200 } }] },
      { id: 'slug', name: 'Slug', type: 'Symbol', required: true, validations: [{ regexp: { pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' } }] },
      { id: 'subtitle', name: 'Subtitle', type: 'Symbol', required: false, validations: [{ size: { max: 300 } }] },
      { id: 'excerpt', name: 'Excerpt', type: 'Text', required: false, validations: [{ size: { max: 320 } }] },
      { id: 'body', name: 'Body', type: 'RichText', required: true },
      { id: 'featuredImage', name: 'Featured Image', type: 'Link', linkType: 'Asset', required: false },
      { id: 'featuredImageAlt', name: 'Featured Image Alt', type: 'Symbol', required: false },
      { id: 'gallery', name: 'Gallery', type: 'Array', items: { type: 'Link', linkType: 'Asset' }, required: false },
      { id: 'publishedAt', name: 'Published At', type: 'Date', required: false },
      { id: 'category', name: 'Category', type: 'Symbol', required: false },
      { id: 'categorySlug', name: 'Category Slug', type: 'Symbol', required: false },
      { id: 'tags', name: 'Tags', type: 'Array', items: { type: 'Symbol' }, required: false },
      { id: 'authorName', name: 'Author Name', type: 'Symbol', required: false },
      { id: 'authorSlug', name: 'Author Slug', type: 'Symbol', required: false },
      { id: 'authorAvatar', name: 'Author Avatar', type: 'Link', linkType: 'Asset', required: false },
      { id: 'authorBio', name: 'Author Bio', type: 'Text', required: false },
      { id: 'authorWebsite', name: 'Author Website', type: 'Symbol', required: false },
      { id: 'authorTwitter', name: 'Author Twitter', type: 'Symbol', required: false },
      { id: 'authorLinkedIn', name: 'Author LinkedIn', type: 'Symbol', required: false },
      { id: 'readingTimeMinutes', name: 'Reading Time (minutes)', type: 'Integer', required: false },
      { id: 'relatedPostSlugs', name: 'Related Post Slugs', type: 'Array', items: { type: 'Symbol' }, required: false },
      { id: 'seoTitle', name: 'SEO Title', type: 'Symbol', required: false, validations: [{ size: { max: 60 } }] },
      { id: 'seoDescription', name: 'SEO Description', type: 'Text', required: false, validations: [{ size: { max: 160 } }] },
      { id: 'ogImage', name: 'OG Image', type: 'Link', linkType: 'Asset', required: false },
      { id: 'ogImageAlt', name: 'OG Image Alt', type: 'Symbol', required: false },
      { id: 'canonicalUrl', name: 'Canonical URL', type: 'Symbol', required: false },
      { id: 'noIndex', name: 'No Index', type: 'Boolean', required: false },
      { id: 'metaKeywords', name: 'Meta Keywords', type: 'Symbol', required: false },
      { id: 'twitterCard', name: 'Twitter Card', type: 'Symbol', required: false },
      { id: 'fbAppId', name: 'Facebook App ID', type: 'Symbol', required: false },
    ],
  });

  await contentType.publish();
  console.log('Blog Post Content Type erfolgreich erstellt und veröffentlicht.');
}

main().catch((e) => {
  if (e.message?.includes('already exists') || e.name === 'Conflict') {
    console.log('Blog Post Content Type existiert bereits. Keine Änderung.');
  } else {
    console.error('Fehler:', e.message);
    process.exit(1);
  }
});
