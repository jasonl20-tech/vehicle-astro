// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const site = process.env.SITE_URL || 'https://vehicleimagery.com';

// https://astro.build/config
export default defineConfig({
  site,
  output: 'static',
  build: {
    format: 'file', // page.html statt page/index.html → keine 308-Redirects auf Cloudflare Pages
  },
  trailingSlash: 'never',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', es: 'es' },
      },
      serialize(item) {
        const url = item.url;
        const path = url.replace(site, '') || '/';
        const cleanPath = path.replace(/^\/es/, '') || '/';

        if (cleanPath === '/' || cleanPath === '') {
          item.priority = 1;
          item.changefreq = 'weekly';
        } else if (/\/blog\//.test(cleanPath) || /\/changelog\//.test(cleanPath)) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        } else if (/^\/(?!blog|changelog|faq|coverage|pricing|es)[^/]+\/?$/.test(cleanPath)) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        } else {
          item.priority = item.priority ?? 0.7;
          item.changefreq = item.changefreq ?? 'monthly';
        }
        item.lastmod = item.lastmod ?? new Date();
        return item;
      }
    })
  ],

  vite: {
    plugins: [tailwindcss()]
  }
});