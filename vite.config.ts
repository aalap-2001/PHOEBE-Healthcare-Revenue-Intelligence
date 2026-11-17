import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Served from https://aalap-2001.github.io/PHOEBE-Healthcare-Revenue-Intelligence/ on GitHub Pages.
// Change base to '/' if you later host at a domain root (custom domain, Vercel, Netlify).
export default defineConfig({
  base: '/PHOEBE-Healthcare-Revenue-Intelligence/',
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
})
