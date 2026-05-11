/**
 * Build-time loader for all CMS content from Cloudflare D1.
 * Talks to the REST API of the `cms_contents` table and returns rows in the
 * expected shape per domain (Blog, CaseStudy, Changelog, FAQ, Press,
 * LandingPage, Team authors, contactPages).
 *
 * No Worker context required — works in any build (local, GitHub Actions,
 * Cloudflare Pages build). Bindings are not used.
 */
import type { Document } from '@contentful/rich-text-types';
import { richTextToPlainText } from './rich-text';
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

export type CmsCategoryPayload = { categoryName?: string; entrys?: EntryLink[] };
export type CmsLayoutPayload = { layoutName?: string; layoutDeskription?: string; number?: number };

export type CategoryEntry = {
  id: string;
  name: string;
  slug: string;
  entryIds: string[];
};
export type LayoutEntry = { id: string; name: string; description: string; number: number | null };

export async function loadCategories(opts: { locale?: string } = {}): Promise<Map<string, CategoryEntry>> {
  const locale = opts.locale ?? 'en-US';
  const rows = await getCmsRows<CmsCategoryPayload>('category', locale, 200);
  const map = new Map<string, CategoryEntry>();
  for (const r of rows) {
    const name = r.payload.categoryName ?? r.id;
    const entryIds = (r.payload.entrys ?? [])
      .map((link) => link?.sys?.id)
      .filter((id): id is string => Boolean(id));
    map.set(r.id, { id: r.id, name, slug: slugify(name), entryIds });
  }
  return map;
}

export async function loadLayouts(opts: { locale?: string } = {}): Promise<Map<string, LayoutEntry>> {
  const locale = opts.locale ?? 'en-US';
  const rows = await getCmsRows<CmsLayoutPayload>('layouts', locale, 200);
  const map = new Map<string, LayoutEntry>();
  for (const r of rows) {
    const num = typeof r.payload.number === 'number' ? r.payload.number : Number.parseInt(String(r.payload.number ?? ''), 10);
    map.set(r.id, {
      id: r.id,
      name: r.payload.layoutName ?? r.id,
      description: r.payload.layoutDeskription ?? '',
      number: Number.isFinite(num) ? num : null,
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
  ogImage?: EntryLink;
  metaTitle?: string;
  metaDescription?: string;
};

export type LandingPage = {
  id: string;
  slug: string;
  title: string;
  body?: Document;
  layoutName: string;
  layoutNumber: number | null;
  ogImage?: EntryLink;
  ogImageUrl?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  ogImageAlt?: string;
  metaTitle: string;
  metaDescription: string;
  updatedAt: string;
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
      const ogAsset = p.ogImage?.sys?.id ? assets[p.ogImage.sys.id] : undefined;
      const ogImageUrl = resolveAssetUrl(p.ogImage, assets);
      return {
        id: r.id,
        slug,
        title: p.title ?? slug,
        body: p.body,
        layoutName: (layoutEntry?.name ?? '').toLowerCase().replace(/\s+/g, '-'),
        layoutNumber: layoutEntry?.number ?? null,
        ogImage: p.ogImage,
        ogImageUrl,
        ogImageWidth: ogAsset?.fields?.file?.details?.image?.width,
        ogImageHeight: ogAsset?.fields?.file?.details?.image?.height,
        ogImageAlt: ogAsset?.fields?.description || ogAsset?.fields?.title || (p.title ?? slug),
        metaTitle: p.metaTitle ?? p.title ?? slug,
        metaDescription: p.metaDescription ?? '',
        updatedAt: r.updatedAt,
      };
    })
    .filter((it) => it.slug);
  return { items, assets, categories };
}

/* =========================================================================
 * Documentation Page (3 content types: documentationPage, dcoumentationEntrys, dcoumentationExtras)
 * Note: D1 schema field names are kept 1:1 with the user's spelling (incl. typos).
 * ======================================================================= */

export type CmsDocEntryPayload = {
  type?: string;
  title?: string;
  describtion?: string;
  endpointUrl?: string;
  queryParameters?: string[];
  exampleResponse?: unknown;
};

export type CmsDocExtraPayload = {
  name?: string;
  inhalt?: Document;
};

export type CmsDocPagePayload = {
  title?: string;
  describtion?: string;
  endpointsTitleName?: string;
  endpoints?: EntryLink[];
  elementsTitleName?: string;
  otherElements?: EntryLink[];
  ogimage?: EntryLink;
  metaTitle?: string;
  metaDescribtion?: string;
};

export type DocEndpoint = {
  id: string;
  slug: string;
  type?: string;
  title: string;
  describtion?: string;
  endpointUrl?: string;
  queryParameters: string[];
  exampleResponseJson?: string;
};

export type DocExtra = {
  id: string;
  slug: string;
  name: string;
  inhalt?: Document;
};

export type DocumentationPage = {
  title: string;
  describtion: string;
  endpointsTitleName: string;
  elementsTitleName: string;
  endpoints: DocEndpoint[];
  otherElements: DocExtra[];
  ogImageUrl?: string;
  metaTitle: string;
  metaDescribtion: string;
  assets: AssetMap;
};

function uniqueSlug(base: string, fallback: string, used: Set<string>): string {
  let s = base || fallback;
  if (!s) s = 'item';
  let candidate = s;
  let i = 2;
  while (used.has(candidate)) {
    candidate = `${s}-${i++}`;
  }
  used.add(candidate);
  return candidate;
}

export async function loadDocumentationPage(opts: { locale?: string } = {}): Promise<DocumentationPage | null> {
  const locale = opts.locale ?? 'en-US';
  const [pageRows, entryRows, extraRows, assets] = await Promise.all([
    getCmsRows<CmsDocPagePayload>('documentationPage', locale, 5),
    getCmsRows<CmsDocEntryPayload>('dcoumentationEntrys', locale, 200),
    getCmsRows<CmsDocExtraPayload>('dcoumentationExtras', locale, 200),
    loadAssetMap(locale),
  ]);

  const pageRow = pageRows[0];
  if (!pageRow) return null;
  const p = pageRow.payload;

  const entriesById = new Map(entryRows.map((r) => [r.id, r]));
  const extrasById = new Map(extraRows.map((r) => [r.id, r]));

  /** Verlinkte Endpoints zuerst (CMS-Reihenfolge), dann alle übrigen D1-Zeilen — sonst erscheinen neue Rows nicht ohne Parent-Update. */
  const linkedEndpointIds = (p.endpoints ?? [])
    .map((link) => link?.sys?.id)
    .filter((id): id is string => Boolean(id));
  const endpointRowsOrdered: CmsRow<CmsDocEntryPayload>[] = [];
  const seenEndpointIds = new Set<string>();
  for (const id of linkedEndpointIds) {
    const row = entriesById.get(id);
    if (row && !seenEndpointIds.has(row.id)) {
      endpointRowsOrdered.push(row);
      seenEndpointIds.add(row.id);
    }
  }
  for (const row of entryRows) {
    if (!seenEndpointIds.has(row.id)) {
      endpointRowsOrdered.push(row);
      seenEndpointIds.add(row.id);
    }
  }

  const endpointSlugs = new Set<string>();
  const endpoints: DocEndpoint[] = endpointRowsOrdered.map((r) => {
    const title = r.payload.title ?? r.id;
    let exampleResponseJson: string | undefined;
    const ex = r.payload.exampleResponse;
    if (ex !== undefined && ex !== null) {
      try {
        exampleResponseJson = typeof ex === 'string' ? ex : JSON.stringify(ex, null, 2);
      } catch {
        exampleResponseJson = String(ex);
      }
    }
    return {
      id: r.id,
      slug: uniqueSlug(slugify(title), `endpoint-${r.id}`, endpointSlugs),
      type: r.payload.type,
      title,
      describtion: r.payload.describtion,
      endpointUrl: r.payload.endpointUrl,
      queryParameters: Array.isArray(r.payload.queryParameters) ? r.payload.queryParameters : [],
      exampleResponseJson,
    };
  });

  const extraSlugs = new Set<string>();
  const otherElements: DocExtra[] = (p.otherElements ?? [])
    .map((link) => extrasById.get(link?.sys?.id ?? ''))
    .filter((r): r is CmsRow<CmsDocExtraPayload> => Boolean(r))
    .map((r) => {
      const name = r.payload.name ?? r.id;
      return {
        id: r.id,
        slug: uniqueSlug(slugify(name), `extra-${r.id}`, extraSlugs),
        name,
        inhalt: r.payload.inhalt,
      };
    });

  return {
    title: p.title ?? 'Documentation',
    describtion: p.describtion ?? '',
    endpointsTitleName: p.endpointsTitleName ?? 'Endpoints',
    elementsTitleName: p.elementsTitleName ?? '',
    endpoints,
    otherElements,
    ogImageUrl: resolveAssetUrl(p.ogimage, assets),
    metaTitle: p.metaTitle ?? p.title ?? 'Documentation',
    metaDescribtion: p.metaDescribtion ?? p.describtion ?? '',
    assets,
  };
}

/* =========================================================================
 * Main Page (single content type: mainPage)
 * Note: D1 schema field names are kept 1:1 with the user's spelling
 * (mixed German/English, including typos like "Describtion" or "Titel").
 * ======================================================================= */

export type CmsMainPagePayload = {
  heroTitle?: string;
  heroDescribtion?: string;
  heroImage?: EntryLink;
  heroButton1?: string;
  heroButton1Link?: string;
  heroButton2?: string;
  heroButton2Link?: string;
  perspectiveAbschnittTitle?: string;
  perspectiveAbschnittBeschreibung?: string;
  perspectiveImages?: EntryLink[];
  developerAbschnittTitle?: string;
  developerAbschnittBeschreibung?: Document;
  developerButtonText?: string;
  developerButtonLink?: string;
  exampleRequest?: string;
  industriesAbschnittTitel?: string;
  industriesAbschnittBeschreibung?: string;
  industriesAbschnittNote?: string;
  industriesAbschnittText?: Document;
  transparentTitle?: string;
  transparentBeschreibung?: string;
  colorTitle?: string;
  colorBeschreibung?: string;
  freeSektionTitel?: string;
  freeSektionBeschreibung?: string;
  freeSektionButton?: string;
  freeSektionEmailDescribtion?: string;
  freeSektionLink?: string;
  contactTitle?: string;
  contactBeschreibung?: string;
  contactDemoLinkBeschreibung?: string;
  contactName?: string;
  contactEmail?: string;
  contactMessage?: string;
  contactSendButton?: string;
  latestUpdatesTitle?: string;
  blogChangelogButtons?: string;
  viewArchive?: string;
  blog?: string;
  changelog?: string;
  ogImage?: EntryLink;
  metaTitle?: string;
  metaBeschreibung?: string;
};

export type MainPageImage = {
  url: string;
  alt: string;
  title: string;
};

export type MainPage = {
  heroTitle: string;
  heroDescribtion: string;
  heroImageUrl?: string;
  heroImageAlt: string;
  heroButton1: string;
  heroButton1Link: string;
  heroButton2: string;
  heroButton2Link: string;
  perspectiveTitle: string;
  perspectiveBeschreibung: string;
  perspectiveImages: MainPageImage[];
  developerTitle: string;
  developerBeschreibung?: Document;
  developerButtonText: string;
  developerButtonLink: string;
  exampleRequest: string;
  industriesTitle: string;
  industriesBeschreibung: string;
  industriesNote: string;
  industriesText?: Document;
  transparentTitle: string;
  transparentBeschreibung: string;
  colorTitle: string;
  colorBeschreibung: string;
  freeTitle: string;
  freeBeschreibung: string;
  freeButton: string;
  freeEmailDescribtion: string;
  freeLink: string;
  contactTitle: string;
  contactBeschreibung: string;
  contactDemoLinkBeschreibung: string;
  contactNamePlaceholder: string;
  contactEmailPlaceholder: string;
  contactMessagePlaceholder: string;
  contactSendButton: string;
  latestUpdatesTitle: string;
  itemCtaLabel: string;
  viewArchiveLabel: string;
  blogLabel: string;
  changelogLabel: string;
  ogImageUrl?: string;
  metaTitle: string;
  metaBeschreibung: string;
  assets: AssetMap;
};

/* =========================================================================
 * Header + Footer (content types: headerEintrge, footerHeader)
 * Note: D1 schema field names are kept 1:1 with the user's spelling
 * (mixed German/English, including typos like "Eintrge" / "Describtion").
 * ======================================================================= */

export type CmsHeaderEntryPayload = {
  anzeigeName?: string;
  ausgeschrieberName?: string;
  kleineBeschreibung?: string;
  link?: string;
};

export type CmsFooterHeaderPayload = {
  exploreTranslation?: string;
  latestTranslation?: string;
  needHelpTranslation?: string;
  needHelpDescribtion?: string;
  updatesTranslation?: string;
  contactButton?: string;
  button1Text?: string;
  button1Link?: string;
  button2Text?: string;
  button2Link?: string;
  headerFields?: EntryLink[];
  footerBeschreibung?: string;
  footerButton1Text?: string;
  footerButton1Link?: string;
  footerButton2Text?: string;
  footerButton2Link?: string;
  productTranslation?: string;
  coverageTranslation?: string;
  resourcesTranslation?: string;
  companyTranslation?: string;
  stayUpdatedTranslation?: string;
  subscribeTranslation?: string;
  footerAbschluss?: string;
};

export type HeaderSubItem = {
  id: string;
  groupName: string;
  label: string;
  description: string;
  href: string;
};

export type HeaderGroup = {
  name: string;
  items: HeaderSubItem[];
};

export type HeaderFooter = {
  exploreLabel: string;
  latestLabel: string;
  needHelpLabel: string;
  needHelpDescription: string;
  updatesLabel: string;
  contactButtonLabel: string;
  ctaButton1Text: string;
  ctaButton1Link: string;
  ctaButton2Text: string;
  ctaButton2Link: string;
  subItemsByGroup: Record<string, HeaderSubItem[]>;
  groups: HeaderGroup[];
  footerDescription: string;
  footerButton1Text: string;
  footerButton1Link: string;
  footerButton2Text: string;
  footerButton2Link: string;
  productLabel: string;
  coverageLabel: string;
  resourcesLabel: string;
  companyLabel: string;
  stayUpdatedLabel: string;
  subscribeLabel: string;
  footerCloser: string;
};

function normalizeKey(s: string): string {
  return (s ?? '').trim().toLowerCase();
}

export async function loadHeaderFooter(opts: { locale?: string } = {}): Promise<HeaderFooter | null> {
  const locale = opts.locale ?? 'en-US';
  const [pageRows, entryRows] = await Promise.all([
    getCmsRows<CmsFooterHeaderPayload>('footerHeader', locale, 5),
    getCmsRows<CmsHeaderEntryPayload>('headerEintrge', locale, 200),
  ]);

  const pageRow = pageRows[0];
  if (!pageRow) return null;
  const p = pageRow.payload;

  const entriesById = new Map(entryRows.map((r) => [r.id, r]));

  /** Verlinkte Header-Zeilen zuerst (CMS-Reihenfolge), dann alle übrigen D1-Zeilen — sonst fehlen neue Einträge ohne footerHeader-Update. */
  const linkedIds = (p.headerFields ?? [])
    .map((link) => link?.sys?.id)
    .filter((id): id is string => Boolean(id));
  const allHeaderEntryIds = entryRows.map((r) => r.id);
  const orderedIds: string[] = [];
  const seenHeaderId = new Set<string>();
  for (const id of linkedIds) {
    if (!seenHeaderId.has(id)) {
      seenHeaderId.add(id);
      orderedIds.push(id);
    }
  }
  for (const id of allHeaderEntryIds) {
    if (!seenHeaderId.has(id)) {
      seenHeaderId.add(id);
      orderedIds.push(id);
    }
  }

  const subItemsByGroup: Record<string, HeaderSubItem[]> = {};
  const groupOrder: string[] = [];
  const groupDisplayName: Record<string, string> = {};
  for (const id of orderedIds) {
    const row = entriesById.get(id);
    if (!row) continue;
    const groupName = (row.payload.anzeigeName ?? '').trim();
    if (!groupName) continue;
    const item: HeaderSubItem = {
      id: row.id,
      groupName,
      label: row.payload.ausgeschrieberName ?? '',
      description: row.payload.kleineBeschreibung ?? '',
      href: row.payload.link ?? '',
    };
    const key = normalizeKey(groupName);
    if (!subItemsByGroup[key]) {
      subItemsByGroup[key] = [];
      groupOrder.push(key);
      groupDisplayName[key] = groupName;
    }
    subItemsByGroup[key].push(item);
  }

  const groups: HeaderGroup[] = groupOrder.map((k) => ({
    name: groupDisplayName[k] ?? k,
    items: subItemsByGroup[k],
  }));

  return {
    exploreLabel: p.exploreTranslation ?? '',
    latestLabel: p.latestTranslation ?? '',
    needHelpLabel: p.needHelpTranslation ?? '',
    needHelpDescription: p.needHelpDescribtion ?? '',
    updatesLabel: p.updatesTranslation ?? '',
    contactButtonLabel: p.contactButton ?? '',
    ctaButton1Text: p.button1Text ?? '',
    ctaButton1Link: p.button1Link ?? '',
    ctaButton2Text: p.button2Text ?? '',
    ctaButton2Link: p.button2Link ?? '',
    subItemsByGroup,
    groups,
    footerDescription: p.footerBeschreibung ?? '',
    footerButton1Text: p.footerButton1Text ?? '',
    footerButton1Link: p.footerButton1Link ?? '',
    footerButton2Text: p.footerButton2Text ?? '',
    footerButton2Link: p.footerButton2Link ?? '',
    productLabel: p.productTranslation ?? '',
    coverageLabel: p.coverageTranslation ?? '',
    resourcesLabel: p.resourcesTranslation ?? '',
    companyLabel: p.companyTranslation ?? '',
    stayUpdatedLabel: p.stayUpdatedTranslation ?? '',
    subscribeLabel: p.subscribeTranslation ?? '',
    footerCloser: p.footerAbschluss ?? '',
  };
}

/* =========================================================================
 * Payment landing pages (/trial, /pricing, …) — content type `paymentSeiten`
 * `title` in D1 = slug (e.g. trial, pricing, startups)
 * ======================================================================= */

export type CmsPaymentSeitenPayload = {
  title?: string;
  topText?: Document;
  /** Rich Text links/rechts neben dem Formular (Desktop) */
  midText?: Document;
  bottomText?: Document;
  formularId?: string[];
  emailTranslation?: string;
  companyNameTranslation?: string;
  nameTranslation?: string;
  messageTranslation?: string;
  metaTitle?: string;
  metaDescription?: string;
  /** Falls leer: abgeleitet aus slug (Trial → Free Trial Request, …) */
  formSubject?: string;
  submitButtonTranslation?: string;
  requestAccessLabel?: string;
  /** CMS-Feld (Contentful): Titel über dem Formular */
  formName?: string;
  /** Legacy-Alias zu formName */
  formTitle?: string;
  formDescription?: string;
};

export type PaymentLandingField = 'email' | 'name' | 'company' | 'message';

export type PaymentLandingPage = {
  slug: string;
  topText?: Document;
  midText?: Document;
  bottomText?: Document;
  formFields: PaymentLandingField[];
  labels: Partial<Record<PaymentLandingField, string>>;
  formSubject: string;
  metaTitle: string;
  metaDescription: string;
  submitButtonLabel: string;
  requestAccessLabel?: string;
  formTitle?: string;
  formDescription?: string;
};

function defaultPaymentFormSubject(slug: string): string {
  const s = slug.trim().toLowerCase();
  if (s === 'trial') return 'Free Trial Request';
  if (s === 'pricing') return 'Pricing – Custom Plan Request';
  if (s === 'startups') return 'Pricing – Startup Plan Request';
  return `Payment page — ${slug}`;
}

function normalizePaymentFormField(raw: string): PaymentLandingField | null {
  const x = String(raw).trim().toLowerCase();
  if (x === 'email') return 'email';
  if (x === 'name') return 'name';
  if (x === 'company' || x === 'companyname') return 'company';
  if (x === 'message') return 'message';
  return null;
}

const defaultPaymentFieldLabels: Record<PaymentLandingField, string> = {
  email: 'Email',
  name: 'Name',
  company: 'Company',
  message: 'Message',
};

export async function loadPaymentLandingPage(
  slug: string,
  opts: { locale?: string } = {},
): Promise<{ page: PaymentLandingPage | null; assets: AssetMap }> {
  const locale = opts.locale ?? 'en-US';
  const want = slug.trim().toLowerCase();

  const [rows, assets] = await Promise.all([
    getCmsRows<CmsPaymentSeitenPayload>('paymentSeiten', locale, 200),
    loadAssetMap(locale),
  ]);

  const row = rows.find((r) => (r.payload.title ?? '').trim().toLowerCase() === want);
  if (!row) {
    return { page: null, assets };
  }

  const p = row.payload;
  const rawIds = Array.isArray(p.formularId) ? p.formularId : [];
  const parsed = rawIds
    .map(normalizePaymentFormField)
    .filter((f): f is PaymentLandingField => f !== null);
  /** Exakt wie in formularId; ohne Eintrag nur E-Mail. */
  const formFields: PaymentLandingField[] =
    parsed.length > 0 ? parsed : (['email'] as PaymentLandingField[]);

  const labels: Partial<Record<PaymentLandingField, string>> = {
    email: p.emailTranslation?.trim() || defaultPaymentFieldLabels.email,
    name: p.nameTranslation?.trim() || defaultPaymentFieldLabels.name,
    company: p.companyNameTranslation?.trim() || defaultPaymentFieldLabels.company,
    message: p.messageTranslation?.trim() || defaultPaymentFieldLabels.message,
  };

  const formSubject = (p.formSubject ?? '').trim() || defaultPaymentFormSubject(want);
  const plainIntro = richTextToPlainText(p.topText, 400);
  const metaTitle =
    (p.metaTitle ?? '').trim() ||
    (plainIntro ? plainIntro.slice(0, 72).trim() : `${want.charAt(0).toUpperCase()}${want.slice(1)} | Vehicle Imagery API`);
  const metaDescription = (p.metaDescription ?? '').trim() || richTextToPlainText(p.topText, 165);

  return {
    page: {
      slug: want,
      topText: p.topText,
      midText: p.midText,
      bottomText: p.bottomText,
      formFields,
      labels,
      formSubject,
      metaTitle,
      metaDescription,
      submitButtonLabel: (p.submitButtonTranslation ?? '').trim() || 'Send',
      requestAccessLabel: (p.requestAccessLabel ?? '').trim() || undefined,
      formTitle: (p.formName ?? p.formTitle ?? '').trim() || undefined,
      formDescription: (p.formDescription ?? '').trim() || undefined,
    },
    assets,
  };
}

/* =========================================================================
 * Contact / Book-a-Call (content_type: contactPages, Feld which[])
 * ======================================================================= */

type CmsContactPagesPayload = {
  title?: string;
  topText?: Document;
  bottomText?: Document;
  /** z. B. ["Book a Call"] oder ["Contact"] */
  which?: string[];
  metaTitle?: string;
  metaDescription?: string;
};

export type ContactPageContent = {
  title: string;
  topText?: Document;
  bottomText?: Document;
  metaTitle: string;
  metaDescription: string;
};

function normalizeContactWhichTag(raw: string): string {
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, ' ');
}

function contactRowMatchesVariant(
  which: string[] | undefined,
  variant: 'contact' | 'book-a-call',
): boolean {
  const tags = (Array.isArray(which) ? which : []).map(normalizeContactWhichTag);
  if (variant === 'book-a-call') {
    return tags.some((t) => t === 'book a call' || t === 'book-a-call');
  }
  return tags.some((t) => t === 'contact');
}

/**
 * Liest eine Zeile aus D1 `contactPages`, passend zu `which` (Contact vs. Book a Call).
 * Reihenfolge: neuestes updated_at zuerst (wie getCmsRows).
 */
export async function loadContactPage(
  variant: 'contact' | 'book-a-call',
  opts: { locale?: string } = {},
): Promise<{ page: ContactPageContent | null; assets: AssetMap }> {
  const locale = opts.locale ?? 'en-US';
  const [rows, assets] = await Promise.all([
    getCmsRows<CmsContactPagesPayload>('contactPages', locale, 200),
    loadAssetMap(locale),
  ]);

  const row = rows.find((r) => contactRowMatchesVariant(r.payload.which, variant));
  if (!row) {
    return { page: null, assets };
  }

  const p = row.payload;
  const plainTop = richTextToPlainText(p.topText, 400);
  const fallbackTitle = variant === 'book-a-call' ? 'Book a Call' : 'Contact';
  const metaTitle =
    (p.metaTitle ?? '').trim() ||
    (p.title ?? '').trim() ||
    (plainTop ? plainTop.slice(0, 72).trim() : fallbackTitle);
  const metaDescription =
    (p.metaDescription ?? '').trim() ||
    richTextToPlainText(p.topText, 165) ||
    richTextToPlainText(p.bottomText, 165);

  return {
    page: {
      title: (p.title ?? '').trim() || metaTitle,
      topText: p.topText,
      bottomText: p.bottomText,
      metaTitle,
      metaDescription,
    },
    assets,
  };
}

/* =========================================================================
 * Firmen-Konfiguration (globales Branding & Embeds)
 * ======================================================================= */

type CmsFirmenKonfigurationPayload = {
  firmenLogo?: EntryLink;
  firmenName?: string;
  meetingEmbed?: string;
  defaultOgImage?: EntryLink;
  keywords?: string[];
  siteName?: string;
};

export type FirmenKonfiguration = {
  logoUrl: string | null;
  firmenName: string;
  meetingEmbed: string;
  defaultOgImageUrl: string | null;
  defaultOgImageWidth: number | null;
  defaultOgImageHeight: number | null;
  defaultOgImageAlt: string;
  keywords: string;
  siteName: string;
};

const firmenKonfigurationCache = new Map<string, FirmenKonfiguration | null>();

export async function loadFirmenKonfiguration(
  opts: { locale?: string } = {},
): Promise<FirmenKonfiguration | null> {
  const locale = opts.locale ?? 'en-US';
  if (firmenKonfigurationCache.has(locale)) {
    return firmenKonfigurationCache.get(locale) ?? null;
  }

  const rows = await getCmsRows<CmsFirmenKonfigurationPayload>('firmenKonfiguration', locale, 1);
  const row = rows[0];
  if (!row) {
    firmenKonfigurationCache.set(locale, null);
    return null;
  }
  const p = row.payload;

  const assets = await loadAssetMap(locale);
  const ogAsset = p.defaultOgImage?.sys?.id ? assets[p.defaultOgImage.sys.id] : undefined;

  const cfg: FirmenKonfiguration = {
    logoUrl: resolveAssetUrl(p.firmenLogo, assets) ?? null,
    firmenName: p.firmenName ?? '',
    meetingEmbed: p.meetingEmbed ?? '',
    defaultOgImageUrl: resolveAssetUrl(p.defaultOgImage, assets) ?? null,
    defaultOgImageWidth: ogAsset?.fields?.file?.details?.image?.width ?? null,
    defaultOgImageHeight: ogAsset?.fields?.file?.details?.image?.height ?? null,
    defaultOgImageAlt: ogAsset?.fields?.description || ogAsset?.fields?.title || (p.firmenName ?? ''),
    keywords: Array.isArray(p.keywords) ? p.keywords.filter(Boolean).join(', ') : '',
    siteName: p.siteName ?? '',
  };
  firmenKonfigurationCache.set(locale, cfg);
  return cfg;
}

function resolveImageMeta(link: EntryLink | undefined, assets: AssetMap): MainPageImage | null {
  const url = resolveAssetUrl(link, assets);
  if (!url) return null;
  const id = link?.sys?.id ?? '';
  const a = id ? assets[id] : undefined;
  const title = a?.fields?.title ?? '';
  const alt = a?.fields?.description ?? title;
  return { url, alt, title };
}

export async function loadMainPage(opts: { locale?: string } = {}): Promise<MainPage | null> {
  const locale = opts.locale ?? 'en-US';
  const [pageRows, assets] = await Promise.all([
    getCmsRows<CmsMainPagePayload>('mainPage', locale, 5),
    loadAssetMap(locale),
  ]);

  const pageRow = pageRows[0];
  if (!pageRow) return null;
  const p = pageRow.payload;

  const heroImage = resolveImageMeta(p.heroImage, assets);
  const perspectiveImages: MainPageImage[] = (p.perspectiveImages ?? [])
    .map((link) => resolveImageMeta(link, assets))
    .filter((img): img is MainPageImage => Boolean(img));

  return {
    heroTitle: p.heroTitle ?? '',
    heroDescribtion: p.heroDescribtion ?? '',
    heroImageUrl: heroImage?.url,
    heroImageAlt: heroImage?.alt ?? p.heroTitle ?? '',
    heroButton1: p.heroButton1 ?? '',
    heroButton1Link: p.heroButton1Link ?? '',
    heroButton2: p.heroButton2 ?? '',
    heroButton2Link: p.heroButton2Link ?? '',
    perspectiveTitle: p.perspectiveAbschnittTitle ?? '',
    perspectiveBeschreibung: p.perspectiveAbschnittBeschreibung ?? '',
    perspectiveImages,
    developerTitle: p.developerAbschnittTitle ?? '',
    developerBeschreibung: p.developerAbschnittBeschreibung,
    developerButtonText: p.developerButtonText ?? '',
    developerButtonLink: p.developerButtonLink ?? '',
    exampleRequest: p.exampleRequest ?? '',
    industriesTitle: p.industriesAbschnittTitel ?? '',
    industriesBeschreibung: p.industriesAbschnittBeschreibung ?? '',
    industriesNote: p.industriesAbschnittNote ?? '',
    industriesText: p.industriesAbschnittText,
    transparentTitle: p.transparentTitle ?? '',
    transparentBeschreibung: p.transparentBeschreibung ?? '',
    colorTitle: p.colorTitle ?? '',
    colorBeschreibung: p.colorBeschreibung ?? '',
    freeTitle: p.freeSektionTitel ?? '',
    freeBeschreibung: p.freeSektionBeschreibung ?? '',
    freeButton: p.freeSektionButton ?? '',
    freeEmailDescribtion: p.freeSektionEmailDescribtion ?? '',
    freeLink: p.freeSektionLink ?? '',
    contactTitle: p.contactTitle ?? '',
    contactBeschreibung: p.contactBeschreibung ?? '',
    contactDemoLinkBeschreibung: p.contactDemoLinkBeschreibung ?? '',
    contactNamePlaceholder: p.contactName ?? '',
    contactEmailPlaceholder: p.contactEmail ?? '',
    contactMessagePlaceholder: p.contactMessage ?? '',
    contactSendButton: p.contactSendButton ?? '',
    latestUpdatesTitle: p.latestUpdatesTitle ?? '',
    itemCtaLabel: p.blogChangelogButtons ?? '',
    viewArchiveLabel: p.viewArchive ?? '',
    blogLabel: p.blog ?? '',
    changelogLabel: p.changelog ?? '',
    ogImageUrl: resolveAssetUrl(p.ogImage, assets),
    metaTitle: p.metaTitle ?? p.heroTitle ?? 'Vehicle Imagery',
    metaBeschreibung: p.metaBeschreibung ?? p.heroDescribtion ?? '',
    assets,
  };
}
