/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `mock` (default) or `powerapps`. See .env. */
  readonly VITE_DATA_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
