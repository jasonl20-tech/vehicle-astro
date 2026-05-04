import { lexicalJsonValueToHtml, normalizeLexicalSerializedState } from '../../_lib/lexical-to-html';

const MAX_BODY = 2 * 1024 * 1024;

function corsHeaders(): HeadersInit {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders() },
  });
}

type BodyShape = { lexical?: unknown };

export async function onRequest(context: { request: Request }): Promise<Response> {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const cl = request.headers.get('content-length');
  if (cl && Number(cl) > MAX_BODY) {
    return json({ error: 'Payload too large' }, 413);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return json({ error: 'Payload too large' }, 413);
  }

  let body: BodyShape;
  try {
    body = JSON.parse(raw) as BodyShape;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const lexicalRaw = body.lexical;
  if (lexicalRaw === undefined || lexicalRaw === null) {
    return json({ error: 'Missing "lexical" (string oder Objekt mit root)' }, 400);
  }

  try {
    if (!normalizeLexicalSerializedState(lexicalRaw)) {
      return json({ error: 'Not a Lexical SerializedEditorState', ok: false }, 422);
    }
    const html = lexicalJsonValueToHtml(lexicalRaw);
    if (html === null || html.trim() === '') {
      return json({ error: 'Could not render (parser returned empty)', ok: false }, 422);
    }
    return json({ ok: true, html }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[render-lexical]', e);
    return json({ error: 'Lexical render error', detail: msg, ok: false }, 500);
  }
}
