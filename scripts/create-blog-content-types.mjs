/**
 * Erstellt die Blog-Content-Types in Contentful: Blog Author, Blog Category, Blog Post.
 * Inkl. aller SEO-Felder und Referenzen.
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

async function ensureContentType(env, id, config) {
  try {
    const ct = await env.createContentTypeWithId(id, config);
    await ct.publish();
    console.log(`  ✓ ${id} erstellt und veröffentlicht.`);
    return true;
  } catch (e) {
    if (e.message?.includes('already exists') || e.name === 'Conflict') {
      console.log(`  - ${id} existiert bereits (übersprungen).`);
      return false;
    }
    throw e;
  }
}

async function main() {
  const space = await client.getSpace(spaceId);
  const env = await space.getEnvironment('master');

  console.log('Erstelle Blog Author (blogAuthor)…');
  await ensureContentType(env, 'blogAuthor', {
    name: 'Blog Author',
    description: 'Autor:in für Blog-Posts. Wird in Blog Post referenziert.',
    displayField: 'name',
    fields: [
      { id: 'name', name: 'Name', type: 'Symbol', required: true, validations: [{ size: { max: 120 } }] },
      { id: 'slug', name: 'Slug', type: 'Symbol', required: true, validations: [{ regexp: { pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' } }] },
      { id: 'avatar', name: 'Avatar', type: 'Link', linkType: 'Asset', required: false },
      { id: 'shortBio', name: 'Short Bio', type: 'Text', required: false },
      { id: 'website', name: 'Website', type: 'Symbol', required: false },
      { id: 'twitter', name: 'Twitter Handle', type: 'Symbol', required: false },
      { id: 'linkedIn', name: 'LinkedIn URL', type: 'Symbol', required: false },
      { id: 'metaTitle', name: 'Meta Title (Autor-Seite)', type: 'Symbol', required: false },
      { id: 'metaDescription', name: 'Meta Description (Autor-Seite)', type: 'Text', required: false, validations: [{ size: { max: 160 } }] },
    ],
  });

  console.log('Erstelle Blog Category (blogCategory)…');
  await ensureContentType(env, 'blogCategory', {
    name: 'Blog Category',
    description: 'Kategorien für Blog-Posts (z.B. API, Product).',
    displayField: 'name',
    fields: [
      { id: 'name', name: 'Name', type: 'Symbol', required: true, validations: [{ size: { max: 80 } }] },
      { id: 'slug', name: 'Slug', type: 'Symbol', required: true, validations: [{ regexp: { pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' } }] },
      { id: 'description', name: 'Description', type: 'Text', required: false },
      { id: 'metaTitle', name: 'Meta Title (Kategorie-Seite)', type: 'Symbol', required: false },
      { id: 'metaDescription', name: 'Meta Description (Kategorie-Seite)', type: 'Text', required: false, validations: [{ size: { max: 160 } }] },
    ],
  });

  console.log('Erstelle Blog Post (blogPost)…');
  await ensureContentType(env, 'blogPost', {
    name: 'Blog Post',
    description: 'Blog-Artikel mit vollem SEO-Set. Beim Build statisch generiert.',
    displayField: 'title',
    fields: [
      { id: 'title', name: 'Title', type: 'Symbol', required: true, validations: [{ size: { max: 200 } }] },
      { id: 'slug', name: 'Slug', type: 'Symbol', required: true, validations: [{ regexp: { pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' } }] },
      { id: 'excerpt', name: 'Excerpt', type: 'Text', required: false, validations: [{ size: { max: 320 } }] },
      { id: 'body', name: 'Body', type: 'RichText', required: true },
      { id: 'featuredImage', name: 'Featured Image', type: 'Link', linkType: 'Asset', required: false },
      { id: 'featuredImageAlt', name: 'Featured Image Alt', type: 'Symbol', required: false },
      { id: 'publishedAt', name: 'Published At', type: 'Date', required: false },
      { id: 'author', name: 'Author', type: 'Link', linkType: 'Entry', required: false, validations: [{ linkContentType: ['blogAuthor'] }] },
      { id: 'category', name: 'Category', type: 'Link', linkType: 'Entry', required: false, validations: [{ linkContentType: ['blogCategory'] }] },
      { id: 'tags', name: 'Tags', type: 'Array', items: { type: 'Symbol' }, required: false },
      { id: 'seoTitle', name: 'SEO Title', type: 'Symbol', required: false, validations: [{ size: { max: 60 } }] },
      { id: 'seoDescription', name: 'SEO Description', type: 'Text', required: false, validations: [{ size: { max: 160 } }] },
      { id: 'ogImage', name: 'OG Image', type: 'Link', linkType: 'Asset', required: false },
      { id: 'ogImageAlt', name: 'OG Image Alt', type: 'Symbol', required: false },
      { id: 'canonicalUrl', name: 'Canonical URL', type: 'Symbol', required: false },
      { id: 'noIndex', name: 'No Index', type: 'Boolean', required: false },
      { id: 'readingTimeMinutes', name: 'Reading Time (minutes)', type: 'Integer', required: false },
      { id: 'relatedPosts', name: 'Related Posts', type: 'Array', items: { type: 'Link', linkType: 'Entry' }, required: false, validations: [{ size: { max: 10 } }] },
    ],
  });

  console.log('\nBlog-Stack (blogAuthor, blogCategory, blogPost) bereit.');
  console.log('Optional: Bei „Related Posts“ in Contentful unter Validations den Content Type „Blog Post“ einschränken.');
}

main().catch((e) => {
  console.error('Fehler:', e.message);
  process.exit(1);
});
