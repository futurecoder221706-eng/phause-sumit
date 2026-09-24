import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vireo React 19 edition — Vite + React + Tailwind v4.
//
// DEV PROXY — all backend API calls go through /api/*.  Vite proxies them to
// the real backend so the browser sees same-origin requests (no CORS).
// The /admin proxy rule has been removed — admin login is POST /api/admin/login.
const BACKEND = 'https://phishingsimulation.webandappdevelopmenttech.com';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        secure: true,
        // Only proxy requests that carry an Authorization header OR are not
        // plain GET page navigations.  This lets React Router handle any
        // /api/* routes that exist only on the frontend.
        bypass(req) {
          if (req.method === 'GET' && !req.headers['authorization']) {
            return req.url ?? '/';
          }
        },
      },
    },
  },
});
