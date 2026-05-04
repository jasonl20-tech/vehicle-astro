/**
 * Lexical → HTML für CMS-Payload (headless, ohne Editor-UI).
 * Knotenliste orientiert sich an typischen Rich-Text-Playground-Konfigurationen.
 */
import { createHeadlessEditor } from '@lexical/headless';
import { $generateHtmlFromNodes } from '@lexical/html';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import {
  createEditor,
  LineBreakNode,
  ParagraphNode,
  type SerializedEditorState,
  TextNode,
} from 'lexical';

const CMS_LEXICAL_NODES = [
  ParagraphNode,
  TextNode,
  LineBreakNode,
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  LinkNode,
  AutoLinkNode,
  TableNode,
  TableRowNode,
  TableCellNode,
];

function logLexicalError(e: Error): void {
  console.error('[lexical-to-html]', e);
}

function createCmsLexicalEditor() {
  return createHeadlessEditor({
    namespace: 'vehicleimagery-cms',
    nodes: CMS_LEXICAL_NODES,
    onError: logLexicalError,
  });
}

/** Fallback ohne Headless falls ein Knotentyp zur Laufzeit fehlt. */
function createFallbackEditor() {
  return createEditor({
    namespace: 'vehicleimagery-cms-fallback',
    nodes: CMS_LEXICAL_NODES,
    onError: logLexicalError,
  });
}

export function normalizeLexicalSerializedState(input: unknown): SerializedEditorState | null {
  if (input == null) return null;
  if (typeof input === 'string') {
    const t = input.trim();
    if (!t.startsWith('{')) return null;
    try {
      const parsed: unknown = JSON.parse(t);
      if (parsed && typeof parsed === 'object' && 'root' in (parsed as object)) {
        return parsed as SerializedEditorState;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (typeof input === 'object' && 'root' in (input as object)) {
    return input as SerializedEditorState;
  }
  return null;
}

/** Rendert Lexical-Serialisierung zu HTML-Snippet. */
export function lexicalSerializedStateToHtml(
  serialized: SerializedEditorState,
  opts?: { useHeadless?: boolean },
): string {
  const useHeadless = opts?.useHeadless !== false;
  try {
    const editor = useHeadless ? createCmsLexicalEditor() : createFallbackEditor();
    const state = editor.parseEditorState(serialized);
    editor.setEditorState(state);

    let html = '';
    editor.getEditorState().read(() => {
      html = $generateHtmlFromNodes(editor, null);
    });
    return html;
  } catch (e) {
    if (useHeadless) {
      return lexicalSerializedStateToHtml(serialized, { useHeadless: false });
    }
    throw e;
  }
}

export function lexicalJsonValueToHtml(value: unknown): string | null {
  const st = normalizeLexicalSerializedState(value);
  if (!st) return null;
  try {
    return lexicalSerializedStateToHtml(st);
  } catch (err) {
    console.warn('[lexical-to-html] render failed:', err);
    return null;
  }
}
