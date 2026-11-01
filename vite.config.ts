import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

// True only when the real Earth images were added to public/textures (see docs/living-globe.md).
const earthTextures = ['daymap', 'nightmap', 'clouds'].every((n) =>
  fs.existsSync(path.resolve(import.meta.dirname, `public/textures/earth-${n}-2k.jpg`)),
);

export default defineConfig({
  define: {__EARTH_TEXTURES__: JSON.stringify(earthTextures)},
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
});
