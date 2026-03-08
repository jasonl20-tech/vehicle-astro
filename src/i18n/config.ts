export const defaultLocale = 'en' as const;
export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

// Contentful locale codes – adjust if your space uses different codes
export const contentfulLocaleMap: Record<Locale, string> = {
  en: 'en-US',
  es: 'es',
};

export const ogLocaleMap: Record<Locale, string> = {
  en: 'en_US',
  es: 'es_ES',
};

export const dateLocaleMap: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
};
