/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `mock` (default) or `powerapps`. See .env. */
  readonly VITE_DATA_MODE?: string
  /** Dataverse publisher prefix, default `spg`. */
  readonly VITE_DATAVERSE_PREFIX?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
