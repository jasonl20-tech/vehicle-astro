import { createClient } from 'contentful';
import { getContentfulLocale, type Locale, defaultLocale } from '../i18n/utils';

function getClient() {
  const space = process.env.CONTENTFUL_SPACE_ID ?? import.meta.env.CONTENTFUL_SPACE_ID;
  const token = process.env.CONTENTFUL_ACCESS_TOKEN ?? import.meta.env.CONTENTFUL_ACCESS_TOKEN;
  if (!space || !token) {
    throw new Error('Contentful: CONTENTFUL_SPACE_ID und CONTENTFUL_ACCESS_TOKEN in .env oder Cloudflare Env setzen');
  }
  return createClient({ space, accessToken: token });
}

export const getEntries = (params?: Record<string, unknown>) => getClient().getEntries(params);
export const getEntry = (id: string) => getClient().getEntry(id);
export const getAsset = (id: string) => getClient().getAsset(id);

export function getLocalizedEntries(locale: Locale, params?: Record<string, unknown>) {
  return getEntries({ ...params, locale: getContentfulLocale(locale) });
}

export { type Locale };
