/**
 * Build-time loader for all CMS content from Cloudflare D1.
 * Talks to the REST API of the `cms_contents` table and returns rows in the
 * expected shape per domain (Blog, CaseStudy, Changelog, FAQ, Press,
 * LandingPage, Team authors).
 *
 * No Worker context required — works in any build (local, GitHub Actions,
 * Cloudflare Pages build). Bindings are not used.
 */
import type { Document } from '@contentful/rich-text-types';
import {
  getCmsRows,
  type CmsRow,
  type EntryLink,
  type CmsAssetPayload,
  type CmsAuthorPayload,
  type CmsBlogPayload,
} from './cms-d1';

/* =========================================================================
 * Helpers
 * ======================================================================= */

export function slugify(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' und ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function plainTextDocument(text: string | undefined | null): Document | undefined {
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

/** Asset entry shape (matches what our Astro templates expect). */
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

export type AssetMap = Record<string, CfAssetEntry>;

export function assetRowToEntry(row: CmsRow<CmsAssetPayload>): CfAssetEntry {
  return {
    sys: { id: row.id, type: 'Asset' },
    fields: {
      title: row.payload.title,
      description: row.payload.description,
      file: row.payload.file,
    },
  };
}

/** Resolved-URL aus einem Asset-Link (`{sys: {id}}`) + Asset-Map. */
export function resolveAssetUrl(
  link: EntryLink | null | undefined,
  assets: AssetMap,
): string | undefined {
  const id = link?.sys?.id;
  if (!id) return undefined;
  const a = assets[id];
  const url = a?.fields?.file?.url;
  if (!url) return undefined;
  return url.startsWith('//') ? `https:${url}` : url;
}

/** L\u00e4dt alle Assets f\u00fcr eine Locale und liefert sie als ID-Map zur\u00fcck. */
export async function loadAssetMap(locale: string): Promise<AssetMap> {
  const rows = await getCmsRows<CmsAssetPayload>('assets', locale, 5000);
  const map: AssetMap = {};
  for (const r of rows) map[r.id] = assetRowToEntry(r);
  return map;
}

/* =========================================================================
 * Blog
 * ======================================================================= */

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
  featuredImage?: EntryLink;
  featuredImageAlt?: string;
  authorName?: string;
  authorSlug?: string;
  authorAvatar?: EntryLink;
  authorBio?: Document;
  authorWebsite?: string;
  authorTwitter?: string;
  authorLinkedIn?: string;
  readingTimeMinutes?: number;
  relatedPostSlugs?: string[];
  seoTitle?: string;
  seoDescription?: Document;
  ogImage?: EntryLink;
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

function blogRowToEntry(row: CmsRow<CmsBlogPayload>, authors: Map<string, CmsAuthorPayload>): CfBlogEntry {
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
    authorWebsite: authorPayload?.webseite,
    authorLinkedIn: authorPayload?.linkedin,
  };

  return { sys: { id: row.id, type: 'Entry', updatedAt: row.updatedAt }, fields };
}

export async function loadBlogsWithIncludes(opts: { locale?: string; limit?: number } = {}): Promise<BlogQueryResult> {
  const locale = opts.locale ?? 'en-US';
  const limit = opts.limit ?? 200;

  const [blogRows, assetRows, authorRows] = await Promise.all([
    getCmsRows<CmsBlogPayload>('blogs', locale, limit),
    getCmsRows<CmsAssetPayload>('assets', locale, 5000),
    getCmsRows<CmsAuthorPayload>('autoren', locale, 500),
  ]);

  const authors = new Map<string, CmsAuthorPayload>();
  for (const a of authorRows) authors.set(a.id, a.payload);

  const items = blogRows.map((r) => blogRowToEntry(r, authors));
  const includes: BlogIncludes = { Asset: assetRows.map(assetRowToEntry) };
  return { items, includes };
}

/* =========================================================================
 * Team / Autoren  (eigenst\u00e4ndige Page nutzt `autoren`)
 * ======================================================================= */

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string | null;
  linkedin: string;
  website: string;
};

export async function loadTeamMembers(opts: { locale?: string } = {}): Promise<TeamMember[]> {
  const locale = opts.locale ?? 'en-US';
  const [authorRows, assetMap] = await Promise.all([
    getCmsRows<CmsAuthorPayload>('autoren', locale, 500),
    loadAssetMap(locale),
  ]);
  return authorRows.map((row) => ({
    id: row.id,
    name: row.payload.name ?? '',
    role: row.payload.autorTitle ?? '',
    bio: (row.payload.biography ?? '').trim(),
    image: resolveAssetUrl(row.payload.profilePicture, assetMap) ?? null,
    linkedin: row.payload.linkedin ?? '',
    website: row.payload.webseite ?? '',
  }));
}

/* =========================================================================
 * Case Studies
 * ======================================================================= */

export type CmsCaseStudyPayload = {
  title?: string;
  body?: Document;
  layout?: EntryLink;
  ogImage?: EntryLink;
  metaTitle?: string;
  metaDescription?: string;
  /** optional, falls man k\u00fcnftig pflegt */
  slug?: string;
  publishDate?: string;
  publishedAt?: string;
  company?: string;
  industry?: string;
};

export type CaseStudyItem = {
  id: string;
  slug: string;
  title: string;
  body?: Document;
  ogImage?: EntryLink;
  ogImageUrl?: string;
  metaTitle: string;
  metaDescription: string;
  date?: string;
  company?: string;
  industry?: string;
  updatedAt: string;
};

export type CaseStudyResult = { items: CaseStudyItem[]; assets: AssetMap };

export async function loadCaseStudies(opts: { locale?: string; limit?: number } = {}): Promise<CaseStudyResult> {
  const locale = opts.locale ?? 'en-US';
  const limit = opts.limit ?? 200;
  const [rows, assets] = await Promise.all([
    getCmsRows<CmsCaseStudyPayload>('caseStudy', locale, limit),
    loadAssetMap(locale),
  ]);
  const items: CaseStudyItem[] = rows
    .map((r) => {
      const p = r.payload;
      const slug = (typeof p.slug === 'string' && p.slug.trim()) ? p.slug.trim() : (slugify(p.title) || r.id);
      return {
        id: r.id,
        slug,
        title: p.title ?? 'Untitled',
        body: p.body,
        ogImage: p.ogImage,
        ogImageUrl: resolveAssetUrl(p.ogImage, assets),
        metaTitle: p.metaTitle ?? p.title ?? 'Case Study',
        metaDescription: p.metaDescription ?? '',
        date: p.publishDate ?? p.publishedAt ?? r.updatedAt,
        company: p.company,
        industry: p.industry,
        updatedAt: r.updatedAt,
      };
    })
    .sort((a, b) => Date.parse(b.date ?? '') - Date.parse(a.date ?? ''));
  return { items, assets };
}

/* =========================================================================
 * Changelogs
 * ======================================================================= */

export type CmsChangelogPayload = {
  date?: string;
  body?: Document;
  /** optional, falls k\u00fcnftig erg\u00e4nzt */
  title?: string;
  slug?: string;
  version?: string;
};

export type ChangelogItem = {
  id: string;
  slug: string;
  title: string;
  date: string;
  body?: Document;
  version?: string;
  excerpt: string;
  updatedAt: string;
};

export type ChangelogResult = { items: ChangelogItem[]; assets: AssetMap };

function richTextSnippet(doc: Document | undefined, max = 200): string {
  if (!doc?.content) return '';
  const parts: string[] = [];
  function walk(n: { value?: string; content?: unknown[] }) {
    if (n.value) parts.push(n.value);
    if (Array.isArray(n.content)) {
      for (const c of n.content) walk(c as { value?: string; content?: unknown[] });
    }
  }
  doc.content.forEach((c) => walk(c as { value?: string; content?: unknown[] }));
  const txt = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (max > 0 && txt.length > max) return txt.slice(0, max - 1).trim() + '\u2026';
  return txt;
}

function dateLabel(iso: string | undefined, locale = 'en-US'): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export async function loadChangelogs(opts: { locale?: string; limit?: number } = {}): Promise<ChangelogResult> {
  const locale = opts.locale ?? 'en-US';
  const limit = opts.limit ?? 200;
  const [rows, assets] = await Promise.all([
    getCmsRows<CmsChangelogPayload>('changelogs', locale, limit),
    loadAssetMap(locale),
  ]);
  const items: ChangelogItem[] = rows
    .map((r) => {
      const p = r.payload;
      const date = p.date ?? r.updatedAt;
      const fallbackTitle = p.title ?? `Update \u2014 ${dateLabel(date, locale === 'es' ? 'es-ES' : 'en-US')}`;
      const slug = (typeof p.slug === 'string' && p.slug.trim()) ? p.slug.trim() : (slugify(p.title) || r.id);
      return {
        id: r.id,
        slug,
        title: fallbackTitle,
        date,
        body: p.body,
        version: p.version,
        excerpt: richTextSnippet(p.body, 180),
        updatedAt: r.updatedAt,
      };
    })
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return { items, assets };
}

/* =========================================================================
 * FAQ
 * ======================================================================= */

export type CmsFaqCategoryPayload = { categoryName?: string };
export type CmsFaqEntryPayload = {
  question?: string;
  answer?: string;
  faqCategory?: EntryLink;
};

export type FaqCategory = {
  id: string;
  slug: string;
  label: string;
  count: number;
};

export type FaqEntry = {
  id: string;
  question: string;
  answerHtml: string;
  answerText: string;
  categorySlug: string;
  categoryLabel: string;
  order: number;
};

export type FaqResult = { categories: FaqCategory[]; entries: FaqEntry[] };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainTextToHtml(text: string): string {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

export async function loadFaqs(opts: { locale?: string } = {}): Promise<FaqResult> {
  const locale = opts.locale ?? 'en-US';
  const [catRows, entryRows] = await Promise.all([
    getCmsRows<CmsFaqCategoryPayload>('faqCategorys', locale, 200),
    getCmsRows<CmsFaqEntryPayload>('faqEntrys', locale, 1000),
  ]);

  const catLabel = new Map<string, string>();
  const catOrder = new Map<string, number>();
  catRows.forEach((c, i) => {
    catLabel.set(c.id, c.payload.categoryName ?? c.id);
    catOrder.set(c.id, i);
  });

  const counts = new Map<string, number>();
  const entries: FaqEntry[] = [];
  entryRows.forEach((row, i) => {
    const p = row.payload;
    if (!p.question) return;
    const catId = p.faqCategory?.sys?.id ?? '';
    const catName = catLabel.get(catId) ?? 'general';
    const cSlug = slugify(catName) || 'general';
    counts.set(cSlug, (counts.get(cSlug) ?? 0) + 1);
    entries.push({
      id: row.id,
      question: p.question,
      answerHtml: plainTextToHtml(p.answer ?? ''),
      answerText: (p.answer ?? '').trim(),
      categorySlug: cSlug,
      categoryLabel: catName,
      order: i,
    });
  });

  const seen = new Map<string, FaqCategory>();
  catRows.forEach((c) => {
    const name = c.payload.categoryName ?? c.id;
    const cs = slugify(name) || c.id;
    if (!seen.has(cs)) {
      seen.set(cs, { id: c.id, slug: cs, label: name, count: counts.get(cs) ?? 0 });
    }
  });
  // Falls Eintr\u00e4ge ohne passende Kategorie referenziert sind, trotzdem listen.
  for (const [cs, n] of counts) {
    if (!seen.has(cs)) {
      seen.set(cs, { id: cs, slug: cs, label: cs.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()), count: n });
    }
  }

  const categories = Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  return { categories, entries };
}

/* =========================================================================
 * Press Releases
 * ======================================================================= */

export type CmsPressPayload = {
  pressTitle?: string;
  description?: string;
  date?: string;
  link?: string;
};

export type PressItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  link: string;
};

export async function loadPressReleases(opts: { locale?: string; limit?: number } = {}): Promise<PressItem[]> {
  const locale = opts.locale ?? 'en-US';
  const limit = opts.limit ?? 100;
  const rows = await getCmsRows<CmsPressPayload>('pressReleases', locale, limit);
  return rows
    .map((r) => ({
      id: r.id,
      title: r.payload.pressTitle ?? '',
      description: r.payload.description ?? '',
      date: r.payload.date ?? r.updatedAt,
      link: r.payload.link ?? '',
    }))
    .filter((p) => p.title)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

/* =========================================================================
 * Categories + Layouts (Footer / Landing-Pages)
 * ======================================================================= */

export type CmsCategoryPayload = { categoryName?: string };
export type CmsLayoutPayload = { layoutName?: string; layoutDeskription?: string };

export type CategoryEntry = { id: string; name: string; slug: string };
export type LayoutEntry = { id: string; name: string; description: string };

export async function loadCategories(opts: { locale?: string } = {}): Promise<Map<string, CategoryEntry>> {
  const locale = opts.locale ?? 'en-US';
  const rows = await getCmsRows<CmsCategoryPayload>('category', locale, 200);
  const map = new Map<string, CategoryEntry>();
  for (const r of rows) {
    const name = r.payload.categoryName ?? r.id;
    map.set(r.id, { id: r.id, name, slug: slugify(name) });
  }
  return map;
}

export async function loadLayouts(opts: { locale?: string } = {}): Promise<Map<string, LayoutEntry>> {
  const locale = opts.locale ?? 'en-US';
  const rows = await getCmsRows<CmsLayoutPayload>('layouts', locale, 200);
  const map = new Map<string, LayoutEntry>();
  for (const r of rows) {
    map.set(r.id, {
      id: r.id,
      name: r.payload.layoutName ?? r.id,
      description: r.payload.layoutDeskription ?? '',
    });
  }
  return map;
}

/* =========================================================================
 * Landing Pages  (= [...slug].astro)
 * ======================================================================= */

export type CmsLandingPagePayload = {
  title?: string;
  slug?: string;
  body?: Document;
  layout?: EntryLink;
  category?: EntryLink;
  ogImage?: EntryLink;
  metaTitle?: string;
  metaDescription?: string;
  footer?: boolean;
};

export type LandingPage = {
  id: string;
  slug: string;
  title: string;
  body?: Document;
  layoutName: string;
  categoryId?: string;
  categoryName?: string;
  ogImage?: EntryLink;
  ogImageUrl?: string;
  metaTitle: string;
  metaDescription: string;
  footer: boolean;
};

export type LandingResult = {
  items: LandingPage[];
  assets: AssetMap;
  categories: Map<string, CategoryEntry>;
};

export async function loadLandingPages(opts: { locale?: string; limit?: number } = {}): Promise<LandingResult> {
  const locale = opts.locale ?? 'en-US';
  const limit = opts.limit ?? 500;
  const [rows, assets, categories, layouts] = await Promise.all([
    getCmsRows<CmsLandingPagePayload>('landingPages', locale, limit),
    loadAssetMap(locale),
    loadCategories({ locale }),
    loadLayouts({ locale }),
  ]);
  const items: LandingPage[] = rows
    .map((r) => {
      const p = r.payload;
      const slug = (typeof p.slug === 'string' && p.slug.trim()) ? p.slug.trim() : (slugify(p.title) || r.id);
      const layoutId = p.layout?.sys?.id;
      const layoutEntry = layoutId ? layouts.get(layoutId) : undefined;
      const catId = p.category?.sys?.id;
      const catEntry = catId ? categories.get(catId) : undefined;
      return {
        id: r.id,
        slug,
        title: p.title ?? slug,
        body: p.body,
        layoutName: (layoutEntry?.name ?? '').toLowerCase().replace(/\s+/g, '-'),
        categoryId: catEntry?.id,
        categoryName: catEntry?.name,
        ogImage: p.ogImage,
        ogImageUrl: resolveAssetUrl(p.ogImage, assets),
        metaTitle: p.metaTitle ?? p.title ?? slug,
        metaDescription: p.metaDescription ?? '',
        footer: p.footer === true,
      };
    })
    .filter((it) => it.slug);
  return { items, assets, categories };
}
