import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Same rule set as the official microsoft/PowerAppsCodeApps vite template,
// applied once at the workspace root.
export default defineConfig([
  globalIgnores(['**/dist', '**/node_modules', '**/.power', '**/generated']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    files: ['scripts/**/*.mjs', '**/*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
])
