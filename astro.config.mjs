import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';

export default defineConfig({
  adapter: cloudflare(),
  output: 'server',
  site: process.env.PUBLIC_SITE_URL ?? 'https://gisgis.eu.cc',
});
