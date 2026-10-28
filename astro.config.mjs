import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

// The publish script supplies the Pages origin and repository subpath.
export default defineConfig({
  site: process.env.SITE_URL || 'https://adityapolisetty.github.io',
  base: process.env.BASE_PATH || '/',
  output: 'static',
  trailingSlash: 'always',
  vite: { cacheDir: '.cache/vite' },
  integrations: [svelte()],
  devToolbar: { enabled: false }
});
