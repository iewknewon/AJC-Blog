import { defineConfig } from 'astro/config';

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://gisgis.eu.cc',
  adapter: cloudflare()
});