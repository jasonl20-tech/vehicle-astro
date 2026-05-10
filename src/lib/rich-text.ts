import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { BLOCKS, INLINES, type Document } from '@contentful/rich-text-types';

// Rich-text rendering helpers. We still use the Contentful renderer packages because
// our D1 `body` fields store Contentful-compatible Lexical/Rich-text JSON documents,
// but the data source itself is no longer Contentful.

/** Rich-text document to plain text (e.g. for meta descriptions). */
export function richTextToPlainText(doc: Document | null | undefined, maxLength = 160): string {
  if (!doc?.content) return '';
  const parts: string[] = [];
  function visit(n: { nodeType?: string; value?: string; content?: Array<{ value?: string; content?: unknown[] }> }) {
    if (n.value) parts.push(n.value);
    if (Array.isArray(n.content)) n.content.forEach(visit);
  }
  doc.content.forEach(visit);
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (maxLength > 0 && text.length > maxLength) return text.slice(0, maxLength - 1).trim() + '…';
  return text;
}

export type AssetMap = Record<string, { fields?: { file?: { url?: string }; title?: string } }>;

function getAssetUrl(asset: { fields?: { file?: { url?: string } } } | null | undefined): string | null {
  if (!asset?.fields?.file?.url) return null;
  const url = asset.fields.file.url;
  return url.startsWith('//') ? `https:${url}` : url;
}

type Next = (nodes: unknown) => string;

export function renderRichText(doc: Document | null | undefined, assetMap?: AssetMap): string {
  if (!doc) return '';
  return documentToHtmlString(doc, {
    preserveWhitespace: true,
    renderNode: {
      [BLOCKS.PARAGRAPH]: (_node: { content?: unknown[] }, next: Next) => `<p>${next(_node.content ?? [])}</p>`,
      [BLOCKS.HEADING_1]: (n: { content?: unknown[] }, next: Next) => `<h1>${next(n.content ?? [])}</h1>`,
      [BLOCKS.HEADING_2]: (n: { content?: unknown[] }, next: Next) => `<h2>${next(n.content ?? [])}</h2>`,
      [BLOCKS.HEADING_3]: (n: { content?: unknown[] }, next: Next) => `<h3>${next(n.content ?? [])}</h3>`,
      [BLOCKS.HEADING_4]: (n: { content?: unknown[] }, next: Next) => `<h4>${next(n.content ?? [])}</h4>`,
      [BLOCKS.HEADING_5]: (n: { content?: unknown[] }, next: Next) => `<h5>${next(n.content ?? [])}</h5>`,
      [BLOCKS.HEADING_6]: (n: { content?: unknown[] }, next: Next) => `<h6>${next(n.content ?? [])}</h6>`,
      [BLOCKS.UL_LIST]: (n: { content?: unknown[] }, next: Next) => `<ul>${next(n.content ?? [])}</ul>`,
      [BLOCKS.OL_LIST]: (n: { content?: unknown[] }, next: Next) => `<ol>${next(n.content ?? [])}</ol>`,
      [BLOCKS.LIST_ITEM]: (n: { content?: unknown[] }, next: Next) => `<li>${next(n.content ?? [])}</li>`,
      [BLOCKS.QUOTE]: (n: { content?: unknown[] }, next: Next) => `<blockquote>${next(n.content ?? [])}</blockquote>`,
      [BLOCKS.HR]: () => '<hr/>',
      [BLOCKS.TABLE]: (n: { content?: unknown[] }, next: Next) => {
        const rows = (n.content ?? []) as Array<{ content?: Array<{ nodeType?: string }> }>;
        const firstRow = rows[0];
        const hasHeader = !!firstRow?.content?.some((c) => c?.nodeType === 'table-header-cell');
        if (hasHeader) {
          const head = next([firstRow]);
          const body = next(rows.slice(1));
          return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
        }
        return `<table><tbody>${next(rows)}</tbody></table>`;
      },
      [BLOCKS.TABLE_ROW]: (n: { content?: unknown[] }, next: Next) => `<tr>${next(n.content ?? [])}</tr>`,
      [BLOCKS.TABLE_CELL]: (n: { content?: unknown[] }, next: Next) => `<td>${next(n.content ?? [])}</td>`,
      [BLOCKS.TABLE_HEADER_CELL]: (n: { content?: unknown[] }, next: Next) => `<th>${next(n.content ?? [])}</th>`,
      [INLINES.HYPERLINK]: (node: { data?: { uri?: string }; content?: unknown[] }, next: Next) => {
        const uri = node.data?.uri ?? '#';
        const isExternal = /^https?:\/\//i.test(uri) && !uri.includes('vehicleimagery.com');
        const rel = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${escapeHtml(uri)}"${rel}>${next(node.content ?? [])}</a>`;
      },
      [INLINES.ASSET_HYPERLINK]: (node: { data?: { target?: { sys?: { id?: string }; fields?: { file?: { url?: string } } } }; content?: unknown[] }, next: Next) => {
        let target = node.data?.target;
        if (!getAssetUrl(target) && assetMap && target?.sys?.id) {
          target = assetMap[target.sys.id] as typeof target;
        }
        const url = getAssetUrl(target);
        if (!url) return next(node.content ?? []);
        return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${next(node.content ?? [])}</a>`;
      },
      [BLOCKS.EMBEDDED_ASSET]: (node: { data?: { target?: { sys?: { id?: string }; fields?: { file?: { url?: string }; title?: string } } } }) => {
        let target = node.data?.target;
        if (!getAssetUrl(target) && assetMap && target?.sys?.id) {
          target = assetMap[target.sys.id] as typeof target;
        }
        const url = getAssetUrl(target);
        const alt = target?.fields?.title ?? '';
        if (!url) return '';
        return `<figure class="my-8"><img src="${url}" alt="${escapeHtml(alt)}" class="w-full h-auto rounded-lg" loading="lazy" decoding="async"/></figure>`;
      },
    },
  });
}

export function buildAssetMap(includes?: { Asset?: Array<{ sys: { id: string }; fields?: { file?: { url?: string }; title?: string } }> }): AssetMap {
  const map: AssetMap = {};
  includes?.Asset?.forEach((a) => {
    if (a.sys?.id) map[a.sys.id] = a;
  });
  return map;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
