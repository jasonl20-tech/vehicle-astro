import { resolveD1Database, type D1PagesEnv } from '../../_lib/d1';
import { lexicalJsonValueToHtml } from '../../_lib/lexical-to-html';

const MAX_LIMIT = 200;

function corsHeaders(): HeadersInit {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'Content-Type',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  });
}

type DbRow = {
  id: string;
  contentModelId: string;
  payloadJson: string;
  status: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
  lastUpdatedBy: string | null;
  scheduledPublishAt: string | null;
};

function parseRow(raw: DbRow) {
  let payload: unknown;
  try {
    payload = JSON.parse(raw.payloadJson);
  } catch {
    payload = raw.payloadJson;
  }
  return {
    id: raw.id,
    contentModelId: raw.contentModelId,
    payload,
    status: raw.status,
    locale: raw.locale,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    lastUpdatedBy: raw.lastUpdatedBy,
    scheduledPublishAt: raw.scheduledPublishAt,
  };
}

type ParsedContentRow = ReturnType<typeof parseRow>;

function withLexicalHtml(
  row: ParsedContentRow,
  lexicalFields: string[] | null,
): ParsedContentRow & { lexicalHtml?: Record<string, string | null> } {
  if (!lexicalFields?.length) return row;

  const p = row.payload;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return row;

  const record = p as Record<string, unknown>;
  const lexicalHtml: Record<string, string | null> = {};
  for (const key of lexicalFields) {
    if (!key) continue;
    lexicalHtml[key] = lexicalJsonValueToHtml(record[key]);
  }

  return { ...row, lexicalHtml };
}

function splitLexicalFieldParam(param: string | null): string[] | null {
  if (!param?.trim()) return null;
  return param
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

interface RequestContext {
  request: Request;
  env: D1PagesEnv;
}

export async function onRequest(context: RequestContext): Promise<Response> {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const db = resolveD1Database(env);
  if (!db) {
    return json({ error: 'D1 not configured (binding webseite or database)' }, 503);
  }

  const url = new URL(request.url);
  const lexicalFieldsRaw = splitLexicalFieldParam(url.searchParams.get('lexicalFields'));
  const singleId = url.searchParams.get('id');

  try {
    if (singleId) {
      const statement = `
        SELECT id,
               content_model_id AS contentModelId,
               payload_json AS payloadJson,
               status,
               locale,
               created_at AS createdAt,
               updated_at AS updatedAt,
               last_updated_by AS lastUpdatedBy,
               scheduled_publish_at AS scheduledPublishAt
        FROM cms_contents
        WHERE id = ?
        LIMIT 1
      `;
      const row = await db.prepare(statement).bind(singleId).first<DbRow>();
      if (!row) {
        return json({ error: 'Not found', item: null }, 404);
      }
      return json({ item: withLexicalHtml(parseRow(row), lexicalFieldsRaw) }, 200);
    }

    const contentModelId = url.searchParams.get('contentModelId');
    if (!contentModelId) {
      return json({ error: 'Missing contentModelId (or pass id for a single row)' }, 400);
    }

    const locale = url.searchParams.get('locale') ?? 'de-DE';
    const status = url.searchParams.get('status') ?? 'published';
    let limit = Number(url.searchParams.get('limit') ?? '50');
    if (!Number.isFinite(limit)) limit = 50;
    limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));

    const stmt = `
      SELECT id,
             content_model_id AS contentModelId,
             payload_json AS payloadJson,
             status,
             locale,
             created_at AS createdAt,
             updated_at AS updatedAt,
             last_updated_by AS lastUpdatedBy,
             scheduled_publish_at AS scheduledPublishAt
      FROM cms_contents
      WHERE content_model_id = ?
        AND locale = ?
        AND status = ?
      ORDER BY datetime(updated_at) DESC
      LIMIT ?
    `;

    const { results } = await db.prepare(stmt).bind(contentModelId, locale, status, limit).all<DbRow>();

    const items = (results ?? []).map((r) => withLexicalHtml(parseRow(r), lexicalFieldsRaw));

    return json({ items, count: items.length });
  } catch (e) {
    console.error('[cms/api/contents]', e);
    return json({ error: 'CMS query failed' }, 500);
  }
}
