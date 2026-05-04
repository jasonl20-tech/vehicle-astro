import type { CmsContentRow } from './cms-d1-types';

export type CmsListApiResponse = { items: CmsContentRow[]; count: number };
export type CmsOneApiResponse = { item: CmsContentRow } | { error: string; item: null };

export function buildCmsContentsQuery(params: {
  contentModelId: string;
  locale?: string;
  status?: string;
  limit?: number;
}): string {
  const p = new URLSearchParams();
  p.set('contentModelId', params.contentModelId);
  if (params.locale != null) p.set('locale', params.locale);
  if (params.status != null) p.set('status', params.status);
  if (params.limit != null) p.set('limit', String(params.limit));
  return p.toString();
}

/** GET /api/cms/contents relativ zur gleichen Origin (z. B. Astro.url.origin im Build). */
export async function fetchCmsContentsPublished(
  baseOptions: {
    origin: string;
    contentModelId: string;
    locale?: string;
    limit?: number;
  },
  init?: RequestInit,
): Promise<CmsContentRow[]> {
  const { origin, contentModelId, locale, limit } = baseOptions;
  const qs = buildCmsContentsQuery({ contentModelId, locale, status: 'published', limit });
  const res = await fetch(`${origin.replace(/\/$/, '')}/api/cms/contents?${qs}`, {
    ...init,
    method: 'GET',
  });
  if (!res.ok) {
    throw new Error(`CMS fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as CmsListApiResponse;
  return data.items ?? [];
}
