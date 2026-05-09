/**
 * Build-Time-Adapter: liest Blogs/Assets/Autoren aus D1 und liefert sie im
 * Contentful-Entries-/Includes-Shape. Damit funktionieren die bestehenden
 * Blog-Templates ohne tiefe Umbauten.
 */
import type { Document } from '@contentful/rich-text-types';
import {
  getCmsRows,
  type CmsAssetPayload,
  type CmsAuthorPayload,
  type CmsBlogPayload,
  type CmsRow,
  type ContentfulLink,
} from './cms-d1';

/* ---------- Contentful-\u00e4hnliche Shapes (was die Templates erwarten) -------- */

export type CfAssetEntry = {
  sys: { id: string; type: 'Asset' };
  fields: {
    title?: string;
    description?: string;
    file?: {
      url?: string;
      contentType?: string;
      fileName?: string;
      details?: { size?: number; image?: { width?: number; height?: number } };
    };
  };
};

export type CfBlogFields = {
  slug: string;
  title?: string;
  subtitle?: string;
  body?: Document;
  excerpt?: Document;
  publishedAt?: string;
  category?: string;
  categorySlug?: string;
  tags?: string[];
  featuredImage?: ContentfulLink;
  featuredImageAlt?: string;
  authorName?: string;
  authorSlug?: string;
  authorAvatar?: ContentfulLink;
  authorBio?: Document;
  authorWebsite?: string;
  authorTwitter?: string;
  authorLinkedIn?: string;
  readingTimeMinutes?: number;
  relatedPostSlugs?: string[];
  seoTitle?: string;
  seoDescription?: Document;
  ogImage?: ContentfulLink;
  ogImageAlt?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
};

export type CfBlogEntry = {
  sys: { id: string; type: 'Entry'; updatedAt?: string };
  fields: CfBlogFields;
};

export type BlogIncludes = { Asset?: CfAssetEntry[] };

export type BlogQueryResult = {
  items: CfBlogEntry[];
  includes: BlogIncludes;
};

/* ---------- Konvertierung -------------------------------------------------- */

function plainTextDocument(text: string | undefined | null): Document | undefined {
  const value = (text ?? '').trim();
  if (!value) return undefined;
  return {
    nodeType: 'document',
    data: {},
    content: [
      {
        nodeType: 'paragraph',
        data: {},
        content: [{ nodeType: 'text', value, marks: [], data: {} }],
      },
    ],
  } as Document;
}

function assetRowToEntry(row: CmsRow<CmsAssetPayload>): CfAssetEntry {
  return {
    sys: { id: row.id, type: 'Asset' },
    fields: {
      title: row.payload.title,
      description: row.payload.description,
      file: row.payload.file,
    },
  };
}

function blogRowToEntry(
  row: CmsRow<CmsBlogPayload>,
  authors: Map<string, CmsAuthorPayload>,
): CfBlogEntry {
  const p = row.payload;
  const slug = (typeof p.slug === 'string' && p.slug.trim()) ? p.slug.trim() : row.id;

  const authorPayload = p.author?.sys?.id ? authors.get(p.author.sys.id) : undefined;

  const fields: CfBlogFields = {
    slug,
    title: p.title,
    subtitle: p.subtitle,
    body: p.body,
    excerpt: p.excerpt,
    publishedAt: p.publishDate,
    category: p.category,
    categorySlug: p.categorySlug,
    tags: p.tags,
    featuredImage: p.blogimage,
    featuredImageAlt: p.featuredImageAlt,
    readingTimeMinutes: p.readingTimeMinutes,
    relatedPostSlugs: p.relatedPostSlugs,
    seoTitle: p.seoTitle ?? p.metaTitle,
    seoDescription: p.seoDescription ?? plainTextDocument(p.metaDescription),
    ogImage: p.ogImage,
    ogImageAlt: p.ogImageAlt,
    canonicalUrl: p.canonicalUrl,
    noIndex: p.noIndex,
    authorName: authorPayload?.name,
    authorAvatar: authorPayload?.profilePicture,
    authorBio: plainTextDocument(authorPayload?.biography),
  };

  return {
    sys: { id: row.id, type: 'Entry', updatedAt: row.updatedAt },
    fields,
  };
}

/* ---------- Public API ----------------------------------------------------- */

export type LoadBlogOptions = {
  /** D1-locale-Wert. Default 'en-US'. F\u00fcr ES typischerweise 'es' (an euer D1-Schema anpassen). */
  locale?: string;
  /** maximale Anzahl Blog-Eintr\u00e4ge. Default 200. */
  limit?: number;
};

/**
 * L\u00e4dt Blogs + zugeh\u00f6rige Assets + Autoren aus D1 und liefert sie als
 * Contentful-\u00e4hnliches `{ items, includes }`-Result.
 *
 * Liefert bei fehlenden Credentials oder leerer Tabelle ein leeres Result.
 */
export async function loadBlogsWithIncludes(opts: LoadBlogOptions = {}): Promise<BlogQueryResult> {
  const locale = opts.locale ?? 'en-US';
  const limit = opts.limit ?? 200;

  const [blogRows, assetRows, authorRows] = await Promise.all([
    getCmsRows<CmsBlogPayload>('blogs', locale, limit),
    getCmsRows<CmsAssetPayload>('assets', locale, 1000),
    getCmsRows<CmsAuthorPayload>('autoren', locale, 500),
  ]);

  const authors = new Map<string, CmsAuthorPayload>();
  for (const a of authorRows) authors.set(a.id, a.payload);

  const items = blogRows.map((r) => blogRowToEntry(r, authors));
  const includes: BlogIncludes = { Asset: assetRows.map(assetRowToEntry) };
  return { items, includes };
}

/** Findet einen Blog-Entry anhand Slug oder D1-id. Liefert das gleiche Result wie oben (gefiltert). */
export function pickBlogBySlug(
  data: BlogQueryResult,
  slug: string,
): { entry: CfBlogEntry | null; includes: BlogIncludes } {
  const entry = data.items.find((it) => it.fields.slug === slug || it.sys.id === slug) ?? null;
  return { entry, includes: data.includes };
}
