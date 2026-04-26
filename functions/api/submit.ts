/** Minimal D1-Types; Cloudflare bundelt die echten Laufzeittypen. */
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

type Env = {
  database: D1Database;
};

const MAX_BODY_BYTES = 64 * 1024;

/** Footer-Newsletter: gleiches hidden `subject` wie in Footer.astro */
const NEWSLETTER_SUBJECT = 'Newsletter Subscribe';

function buildRequestMetadata(request: Request): Record<string, string> {
  const h = (name: string) => request.headers.get(name) ?? '';
  const cfConnecting = h('cf-connecting-ip');
  const xff = h('x-forwarded-for');
  const ip = cfConnecting || (xff ? xff.split(',')[0].trim() : '');

  const meta: Record<string, string> = {
    ip,
    userAgent: h('user-agent'),
    acceptLanguage: h('accept-language'),
    referer: h('referer'),
    country: h('cf-ipcountry'),
    asn: h('cf-asn'),
    ray: h('cf-ray'),
  };

  for (const k of Object.keys(meta)) {
    if (meta[k] === '') delete meta[k];
  }

  return meta;
}

function buildMetadata(request: Request): string {
  return JSON.stringify(buildRequestMetadata(request));
}

function normalizeEmail(record: Record<string, unknown>): string | null {
  const v = record.email;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (!s || !s.includes('@')) return null;
  return s;
}

function businessNameFromRecord(record: Record<string, unknown>): string | null {
  const v = record.company;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t || null;
}

type PagesContext = { request: Request; env: Env };

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context;

  if (!env.database) {
    return new Response(JSON.stringify({ error: 'D1 not configured' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  const cl = request.headers.get('content-length');
  if (cl && Number(cl) > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Payload too large' }), {
      status: 413,
      headers: { 'content-type': 'application/json' },
    });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Payload too large' }), {
      status: 413,
      headers: { 'content-type': 'application/json' },
    });
  }

  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return new Response(JSON.stringify({ error: 'Expected JSON object' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const record = data as Record<string, unknown>;
  const subject = record.subject;
  const formTag =
    typeof subject === 'string' && subject.trim() ? subject.trim().slice(0, 500) : 'unknown';

  const id = crypto.randomUUID();
  const metadata = buildMetadata(request);

  try {
    if (formTag === NEWSLETTER_SUBJECT) {
      const nlMeta = JSON.stringify({
        form: { email: record.email, subject: record.subject },
        request: buildRequestMetadata(request),
      });
      await env.database
        .prepare(
          `INSERT INTO newsletter (id, metadata, active) VALUES (?, ?, 1)`,
        )
        .bind(id, nlMeta)
        .run();
    } else {
      const payload = JSON.stringify(record);
      const email = normalizeEmail(record);
      const businessName = businessNameFromRecord(record);
      const crmId = crypto.randomUUID();

      const subStmt = env.database
        .prepare(
          `INSERT INTO submissions (id, form_tag, payload, metadata, spam)
           VALUES (?, ?, ?, ?, 0)`,
        )
        .bind(id, formTag, payload, metadata);

      if (email) {
        const crmStmt = env.database
          .prepare(
            `INSERT INTO crm_customers (id, email, status, business_name)
             VALUES (?, ?, 'unbearbeitet', ?)
             ON CONFLICT(email) DO UPDATE SET
               updated_at = CURRENT_TIMESTAMP,
               business_name = COALESCE(excluded.business_name, crm_customers.business_name)`,
          )
          .bind(crmId, email, businessName);
        await env.database.batch([subStmt, crmStmt]);
      } else {
        await subStmt.run();
      }
    }
  } catch (e) {
    console.error('D1 insert failed', e);
    return new Response(JSON.stringify({ error: 'Storage failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, id }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  });
};
