import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.cucchisascesena.it',
  output: 'static',
  build: {
    format: 'file',
  },
});