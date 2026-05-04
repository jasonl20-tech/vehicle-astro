/**
 * Ruft die Pages-Function POST /api/cms/render-lexical auf (Lexical → HTML).
 */
export async function renderLexicalField(
  lexical: unknown,
  options?: { origin?: string; fetchImpl?: typeof fetch },
): Promise<{ html?: string; error?: string; status: number }> {
  const origin = (options?.origin ?? '').replace(/\/$/, '');
  const url = `${origin}/api/cms/render-lexical`;
  const fetchFn = options?.fetchImpl ?? fetch;

  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ lexical }),
    });
    const data = (await res.json()) as { ok?: boolean; html?: string; error?: string };

    if (!res.ok) {
      return { error: data.error ?? res.statusText, status: res.status };
    }

    return { html: data.html ?? '', status: res.status };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), status: 0 };
  }
}
