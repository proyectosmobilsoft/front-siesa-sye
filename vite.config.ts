import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno
  const env = loadEnv(mode, process.cwd(), '')

  // Obtener la URL del backend según el modo
  const backendUrl =
    mode === 'production'
      ? env.VITE_API_BASE_URL_PROD || 'https://apisye.mobilsoft.co'
      : env.VITE_API_BASE_URL_DEV || 'http://localhost:3010'

  const port = parseInt(env.VITE_PORT || '5173', 10)

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: true,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log(
                `[PROXY] ${req.method} ${req.url} → ${backendUrl}${req.url}`
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
