import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/** Orígenes por defecto si el .env no los define. */
const DEFAULT_API_LOCAL = 'http://localhost:3010'
const DEFAULT_API_PROD = 'https://apisye.mobilsoft.co'

/** Quita las barras finales para poder concatenar '/api' sin duplicarlas. */
const stripTrailingSlash = (url: string) => url.replace(/\/+$/, '')

/**
 * Normaliza el valor de ENV del .env. Acepta las variantes que solemos
 * escribir (local/dev/desarrollo vs prod/produccion/production).
 * Si no está definido, se deduce del modo de Vite.
 */
const resolveAppEnv = (raw: string | undefined, mode: string): 'local' | 'prod' => {
  const valor = (raw ?? '').trim().toLowerCase()
  if (['prod', 'produccion', 'producción', 'production'].includes(valor)) return 'prod'
  if (['local', 'dev', 'desarrollo', 'development'].includes(valor)) return 'local'
  return mode === 'production' ? 'prod' : 'local'
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Prefijo '' para poder leer también variables sin el prefijo VITE_ (ej. ENV).
  const env = loadEnv(mode, process.cwd(), '')

  // ENV manda: 'local' → API local, 'prod' → API de producción.
  // Se acepta VITE_ENV como alias por si se prefiere el prefijo estándar.
  const appEnv = resolveAppEnv(env.ENV || env.VITE_ENV, mode)

  const apiLocal = stripTrailingSlash(env.VITE_API_URL_LOCAL || env.VITE_API_BASE_URL_DEV || DEFAULT_API_LOCAL)
  const apiProd = stripTrailingSlash(env.VITE_API_URL_PROD || env.VITE_API_BASE_URL_PROD || DEFAULT_API_PROD)

  // Origen del backend elegido (sin '/api'): es el target del proxy en dev y
  // la base absoluta que usa axios en el build.
  const apiOrigin = appEnv === 'prod' ? apiProd : apiLocal

  const port = parseInt(env.VITE_PORT || '5173', 10)

  console.log(`\n🌐 ENV=${appEnv} → API: ${apiOrigin}/api\n`)

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // ENV y VITE_API_URL_* no llegan solas al cliente (Vite solo expone VITE_*
    // declaradas en el .env), así que se inyectan ya resueltas.
    define: {
      'import.meta.env.VITE_APP_ENV': JSON.stringify(appEnv),
      'import.meta.env.VITE_API_ORIGIN': JSON.stringify(apiOrigin),
    },
    server: {
      port,
      proxy: {
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
          secure: true,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log(
                `[PROXY] ${req.method} ${req.url} → ${apiOrigin}${req.url}`
              )
            })
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log(
                `[PROXY] ${req.method} ${req.url} → ${proxyRes.statusCode}`
              )
            })
            proxy.on('error', (err, _req, _res) => {
              console.error('[PROXY ERROR]', err.message)
            })
          },
        },
      },
    },
  }
})
