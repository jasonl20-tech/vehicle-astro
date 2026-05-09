export const defaultLocale = 'en' as const;
export const locales = ['en'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
};

export const ogLocaleMap: Record<Locale, string> = {
  en: 'en_US',
};

export const dateLocaleMap: Record<Locale, string> = {
  en: 'en-US',
};
