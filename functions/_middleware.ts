import './_lib/prism-ssr-shim';

/** Pass-through — der Import lädt Prism.global vor Lexical im Worker-Bundle (zusätzlich Shim in lexical-to-html). */
export async function onRequest(context: { next: () => Promise<Response> }): Promise<Response> {
  return context.next();
}
