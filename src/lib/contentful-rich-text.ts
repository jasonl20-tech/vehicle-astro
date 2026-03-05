import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import type { Document } from '@contentful/rich-text-types';

/** Rich-Text-Document zu reinem Text (z.B. für meta description). Max. maxLength Zeichen. */
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

export function renderRichText(doc: Document | null | undefined, assetMap?: AssetMap): string {
  if (!doc) return '';
  return documentToHtmlString(doc, {
    renderNode: {
      'embedded-asset-block': (node: { data?: { target?: { sys?: { id?: string }; fields?: { file?: { url?: string }; title?: string } } } }) => {
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
