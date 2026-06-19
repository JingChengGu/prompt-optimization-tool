import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const difyTarget = env.VITE_DIFY_BASE_URL ?? ''

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/dify': {
          target: difyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/dify/, ''),
        },
      },
    },
  }
})
