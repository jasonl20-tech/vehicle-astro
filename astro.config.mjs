// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://vehicleimagery.com',
  output: 'static',

  integrations: [sitemap()],

  vite: {
    plugins: [tailwindcss()]
  }
});