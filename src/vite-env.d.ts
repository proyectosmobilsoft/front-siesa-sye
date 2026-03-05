/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_BASE_URL_DEV?: string
  readonly VITE_API_BASE_URL_PROD?: string
  readonly VITE_PORT?: string
  readonly VITE_BACKEND_PORT?: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
