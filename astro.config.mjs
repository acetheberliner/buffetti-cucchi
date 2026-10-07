import { defineConfig } from 'astro/config';
import { siteUrl } from './src/data/site-config.js';

export default defineConfig({
  site: siteUrl,
  output: 'static',
  build: {
    format: 'file',
  },
});
