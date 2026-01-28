import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://179.33.214.87:3010',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`[PROXY] ${req.method} ${req.url} → http://179.33.214.87:3010${req.url}`)
          })
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(`[PROXY] ${req.method} ${req.url} → ${proxyRes.statusCode}`)
          })
          proxy.on('error', (err, _req, _res) => {
            console.error('[PROXY ERROR]', err.message)
          })
        },
      },
    },
  },
})
