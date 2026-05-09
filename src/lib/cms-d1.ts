/**
 * Build-Time D1-CMS-Loader.
 * Spricht die Cloudflare D1 REST-API an (kein Worker-Kontext n\u00f6tig) und liefert
 * Rows im Contentful-\u00e4hnlichen Shape, damit bestehende Astro-Templates kaum
 * angepasst werden m\u00fcssen.
 *
 * Tabelle (Production):
 *   cms_contents (
 *     id           TEXT NOT NULL,
 *     locale       TEXT NOT NULL,
 *     content_type TEXT NOT NULL,
 *     content      TEXT NOT NULL,   -- JSON-String
 *     updated_at   TEXT NOT NULL,
 *     PRIMARY KEY (id, locale)
 *   )
 *
 * .env / Pages-Env Variablen (alle drei zwingend):
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_D1_DATABASE_ID
 *   CLOUDFLARE_API_TOKEN
 */
import type { Document } from '@contentful/rich-text-types';

export type CmsRowRaw = {
  id: string;
  locale: string;
  content_type: string;
  content: string;
  updated_at: string;
};

export type CmsRow<TPayload = unknown> = {
  id: string;
  locale: string;
  contentType: string;
  payload: TPayload;
  updatedAt: string;
};

function readEnv(name: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  if (fromProcess) return fromProcess;
  try {
    return import.meta.env?.[name] as string | undefined;
  } catch {
    return undefined;
  }
}

function getCloudflareCreds(): { accountId: string; databaseId: string; token: string } | null {
  const accountId = readEnv('CLOUDFLARE_ACCOUNT_ID');
  const databaseId = readEnv('CLOUDFLARE_D1_DATABASE_ID');
  const token = readEnv('CLOUDFLARE_API_TOKEN');
  if (!accountId || !databaseId || !token) return null;
  return { accountId, databaseId, token };
}

let warnedMissingCreds = false;

/**
 * F\u00fchrt eine SQL-Query gegen D1 (REST) aus.
 * Liefert immer eine Row-Liste. Bei fehlenden Credentials oder Fehler: leeres Array.
 */
export async function d1Query<T = CmsRowRaw>(sql: string, params: unknown[] = []): Promise<T[]> {
  const creds = getCloudflareCreds();
  if (!creds) {
    if (!warnedMissingCreds) {
      console.warn(
        '[cms-d1] CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_DATABASE_ID / CLOUDFLARE_API_TOKEN fehlen \u2014 D1-Build-Loader liefert leere Listen.',
      );
      warnedMissingCreds = true;
    }
    return [];
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/d1/database/${creds.databaseId}/query`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.token}`,
      },
      body: JSON.stringify({ sql, params }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`[cms-d1] HTTP ${res.status} \u2014 ${txt.slice(0, 300)}`);
      return [];
    }
    const data = (await res.json()) as {
      success?: boolean;
      errors?: Array<{ message?: string }>;
      result?: Array<{ results?: T[] }>;
    };
    if (!data.success) {
      console.error('[cms-d1] D1-Fehler:', data.errors);
      return [];
    }
    return data.result?.[0]?.results ?? [];
  } catch (e) {
    console.error('[cms-d1] Request fehlgeschlagen:', e);
    return [];
  }
}

function parsePayload<T>(raw: CmsRowRaw): CmsRow<T> {
  let payload: unknown;
  try {
    payload = JSON.parse(raw.content);
  } catch {
    payload = raw.content;
  }
  return {
    id: raw.id,
    locale: raw.locale,
    contentType: raw.content_type,
    payload: payload as T,
    updatedAt: raw.updated_at,
  };
}

/** Alle Rows eines content_type / locale (sortiert nach updated_at desc). */
export async function getCmsRows<T = unknown>(
  contentType: string,
  locale: string,
  limit = 200,
): Promise<CmsRow<T>[]> {
  const rows = await d1Query<CmsRowRaw>(
    `SELECT id, locale, content_type, content, updated_at
     FROM cms_contents
     WHERE content_type = ? AND locale = ?
     ORDER BY datetime(updated_at) DESC
     LIMIT ?`,
    [contentType, locale, limit],
  );
  return rows.map((r) => parsePayload<T>(r));
}

/** Single Row by id+locale. */
export async function getCmsRowById<T = unknown>(
  id: string,
  locale: string,
): Promise<CmsRow<T> | null> {
  const rows = await d1Query<CmsRowRaw>(
    `SELECT id, locale, content_type, content, updated_at
     FROM cms_contents
     WHERE id = ? AND locale = ?
     LIMIT 1`,
    [id, locale],
  );
  return rows.length > 0 ? parsePayload<T>(rows[0]) : null;
}

/* ---------------------------------------------------------------------------
 * Konkrete Payload-Typen (so wie aktuell in D1 geschrieben)
 * ------------------------------------------------------------------------- */

export type ContentfulLink = { sys?: { type?: string; linkType?: string; id?: string } };

export type CmsAssetPayload = {
  title?: string;
  description?: string;
  file?: {
    url?: string;
    fileName?: string;
    contentType?: string;
    details?: { size?: number; image?: { width?: number; height?: number } };
  };
};

export type CmsAuthorPayload = {
  name?: string;
  profilePicture?: ContentfulLink;
  biography?: string;
  autorTitle?: string;
};

export type CmsBlogPayload = {
  title?: string;
  body?: Document;
  excerpt?: Document;
  blogimage?: ContentfulLink;
  metaTitle?: string;
  metaDescription?: string;
  publishDate?: string;
  author?: ContentfulLink;
  /** Optionale, k\u00fcnftig pflegbare Felder \u2014 Templates lesen sie mit. */
  slug?: string;
  subtitle?: string;
  category?: string;
  categorySlug?: string;
  tags?: string[];
  readingTimeMinutes?: number;
  relatedPostSlugs?: string[];
  ogImage?: ContentfulLink;
  ogImageAlt?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  seoTitle?: string;
  seoDescription?: Document;
  featuredImageAlt?: string;
};
