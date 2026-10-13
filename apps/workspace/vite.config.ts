import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { powerApps } from '@microsoft/power-apps-vite/plugin'

// Same plugins as the official microsoft/PowerAppsCodeApps vite template.
// One deviation: the powerApps() plugin is only added once power.config.json
// exists (created by `pa app init`). Without it the plugin logs an error on
// every dev start, which is noise when working offline against mock data.
const hasPowerConfig = existsSync(fileURLToPath(new URL('./power.config.json', import.meta.url)))

// https://vite.dev/config/
export default defineConfig({
  // powerApps() also sets this; repeated here so offline builds match.
  base: './',
  plugins: [react(), ...(hasPowerConfig ? [powerApps()] : [])],
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks: cached across app releases.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(id)) return 'react'
          if (id.includes('@radix-ui')) return 'radix'
          return undefined
        },
      },
    },
  },
})
