import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    /**
     * SD-1180. The flags moved under src/ so that Vite would fingerprint them,
     * and that put them in reach of asset inlining: 400 of the 540 are smaller
     * than the 4 KB default, so they would be folded straight back into the
     * stylesheet as data URIs. That is the 5 MB of render-blocking CSS SD-1013
     * unpacked and SD-1163 repaired, rebuilt by accident.
     *
     * Never inline a flag. `undefined` leaves everything else on Vite's default.
     */
    assetsInlineLimit: (filePath) => (/[\\/]assets[\\/]flags[\\/]/.test(filePath) ? false : undefined),
  },
})
