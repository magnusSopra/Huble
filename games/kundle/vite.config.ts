import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Served from a subpath under the Huble hub (public/kundle/), not site root.
  base: '/kundle/',
  plugins: [react()],
})
