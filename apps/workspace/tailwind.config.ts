import preset from '@codeapps/ui/tailwind-preset'
import type { Config } from 'tailwindcss'

// Tailwind CSS 3.4 (pure JS). Do NOT upgrade to v4: its oxide engine is a
// native binary (see README "Corporate laptop pitfalls").
export default {
  presets: [preset],
  // Every source that may contain class names: this app, the UI kit, the
  // platform shell and all modules.
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/platform/src/**/*.{ts,tsx}',
    '../../modules/*/src/**/*.{ts,tsx}',
  ],
} satisfies Config
