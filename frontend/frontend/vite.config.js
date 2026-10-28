import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cutter: resolve(__dirname, 'cutter.html'),
        aiStudio: resolve(__dirname, 'ai-studio.html'),
        artwork: resolve(__dirname, 'artwork.html'),
        validation: resolve(__dirname, 'validation.html'),
        account: resolve(__dirname, 'account.html')
      }
    }
  }
});
