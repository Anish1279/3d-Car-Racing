import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  assetsInclude: ['**/*.glb', '**/*.hdr'],
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('three') || id.includes('@react-three') || id.includes('three-stdlib')) {
            return 'three'
          }

          if (id.includes('react')) {
            return 'react'
          }

          if (id.includes('zustand') || id.includes('lodash-es')) {
            return 'state'
          }
        },
      },
    },
  },
})
