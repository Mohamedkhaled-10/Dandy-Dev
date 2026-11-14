// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';

const isVercel = process.env.VERCEL === '1';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: isVercel
    ? vercel()
    : node({
        mode: 'standalone'
      }),
  build: {
    format: 'directory'
  }
});

