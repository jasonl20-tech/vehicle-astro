/// <reference types="@cloudflare/workers-types" />

type Env = {
  database: D1Database;
};

const MAX_BODY_BYTES = 64 * 1024;

function buildMetadata(request: Request): string {
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

  return JSON.stringify(meta);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
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
  const payload = JSON.stringify(record);
  const metadata = buildMetadata(request);

  try {
    await env.database
      .prepare(
        `INSERT INTO submissions (id, form_tag, payload, metadata, spam)
         VALUES (?, ?, ?, ?, 0)`,
      )
      .bind(id, formTag, payload, metadata)
      .run();
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
