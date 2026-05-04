/**
 * Mapping zur D1-Tabelle `cms_contents` (eigenes CMS).
 * `payload_json` ist ein Objekt mit modellabhängigen Keys; oft sind Rich-Text-Felder
 * als eingebettete JSON-Strings gespeichert (z. B. Lexical).
 */
export type CmsContentStatus = 'draft' | 'published' | string;

export interface CmsContentRow<TPayload = Record<string, unknown>> {
  id: string;
  contentModelId: string;
  payload: TPayload;
  status: CmsContentStatus;
  locale: string;
  createdAt: string;
  updatedAt: string;
  lastUpdatedBy: string | null;
  scheduledPublishAt: string | null;
}
