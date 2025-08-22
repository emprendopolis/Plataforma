import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ====================
// CONFIGURACIÓN INTELIGENTE:
// - En desarrollo: usa proxy para /api -> localhost:4000
// - En producción: las llamadas /api van directamente al servidor de producción
// ====================

export default defineConfig(({ command, mode }) => {
  const isDevelopment = command === 'serve' && mode === 'development'
  
  return {
    plugins: [react()],
    server: isDevelopment ? {
      proxy: {
        '/api': 'http://localhost:4000'
      }
    } : undefined,
    build: {
      // Configuraciones adicionales para el build de producción
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild', // Cambiado de 'terser' a 'esbuild' (incluido por defecto)
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            utils: ['axios']
          }
        }
      }
    }
  }
})
