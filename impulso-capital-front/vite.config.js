import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ====================
// PROXY SOLO PARA DESARROLLO LOCAL
// Descomenta el bloque de abajo SOLO si trabajas en local y necesitas redirigir /api al backend local.
// En producción, déjalo comentado o elimínalo.
// ====================

/*
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
       '/api': 'http://localhost:4000' // SOLO USAR EN LOCAL. Para producción, no es necesario.
    }
  }
})
*/

// ====================
// CONFIGURACIÓN PARA PRODUCCIÓN:
// - Usa este bloque para el build y despliegue en Netlify, Vercel, etc.
// - El bloque de proxy arriba no afecta el build si está comentado.
// ====================


export default defineConfig({
  plugins: [react()]
})
