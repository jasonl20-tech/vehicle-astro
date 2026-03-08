import { defaultLocale, locales, type Locale, contentfulLocaleMap, ogLocaleMap, dateLocaleMap } from './config';
import { ui, type TranslationKey } from './ui';

export function getLocaleFromUrl(url: URL): Locale {
  const [, segment] = url.pathname.split('/');
  if (segment && locales.includes(segment as Locale) && segment !== defaultLocale) {
    return segment as Locale;
  }
  return defaultLocale;
}

export function useTranslations(locale: Locale) {
  return function t(key: TranslationKey): string {
    return (ui[locale] as Record<string, string>)?.[key] ?? (ui[defaultLocale] as Record<string, string>)[key] ?? key;
  };
}

export function localizeUrl(url: string, locale: Locale): string {
  const clean = url.startsWith('/') ? url : `/${url}`;
  if (locale === defaultLocale) return clean;
  return `/${locale}${clean}`;
}

export function stripLocalePrefix(pathname: string): string {
  for (const loc of locales) {
    if (loc === defaultLocale) continue;
    if (pathname === `/${loc}`) return '/';
    if (pathname.startsWith(`/${loc}/`)) return pathname.slice(loc.length + 1);
  }
  return pathname;
}

export function getAlternateUrls(pathname: string, siteUrl: string): Array<{ locale: Locale; href: string }> {
  const stripped = stripLocalePrefix(pathname);
  return locales.map((loc) => ({
    locale: loc,
    href: `${siteUrl}${localizeUrl(stripped, loc)}`,
  }));
}

export function getContentfulLocale(locale: Locale): string {
  return contentfulLocaleMap[locale] || contentfulLocaleMap[defaultLocale];
}

export function getOgLocale(locale: Locale): string {
  return ogLocaleMap[locale] || ogLocaleMap[defaultLocale];
}

export function getDateLocale(locale: Locale): string {
  return dateLocaleMap[locale] || dateLocaleMap[defaultLocale];
}

export { defaultLocale, locales, type Locale } from './config';
export { localeNames } from './config';
