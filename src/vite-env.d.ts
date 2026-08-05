/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Entorno resuelto desde ENV en vite.config.ts: 'local' | 'prod' */
  readonly VITE_APP_ENV?: string
  /** Origen del backend (sin '/api') elegido según ENV */
  readonly VITE_API_ORIGIN?: string
  readonly VITE_API_URL_LOCAL?: string
  readonly VITE_API_URL_PROD?: string
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
