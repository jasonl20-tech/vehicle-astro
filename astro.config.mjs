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
  trailingSlash: 'never', // Dev/Prod konsistent, Sitemap/Canonicals ohne Slash

  integrations: [
    sitemap({
      serialize(item) {
        const url = item.url;
        const path = url.replace(site, '') || '/';
        // Homepage: höchste Priorität
        if (path === '/' || path === '') {
          item.priority = 1;
          item.changefreq = 'weekly';
        }
        // Blog, Changelog: häufig aktualisiert
        else if (/\/blog\//.test(path) || /\/changelog\//.test(path)) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        }
        // Dynamische Seiten (Contentful)
        else if (/^\/(?!blog|changelog|faq|coverage|pricing)[^/]+\/?$/.test(path)) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        }
        // FAQ, Coverage, Pricing, etc.
        else {
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