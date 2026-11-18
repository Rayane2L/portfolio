import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const pages = ['index', 'projets', 'parcours', 'contact'];

// CSP stricte en production uniquement : le serveur de dev de Vite injecte des scripts en ligne.
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'", // décodeur meshopt du modèle 3D (WebAssembly)
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspInProduction(): Plugin {
  return {
    name: 'csp-in-production',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig({
  // chemins relatifs : le site est servi sous /portfolio/ sur GitHub Pages
  base: './',
  plugins: [react(), tailwindcss(), cspInProduction()],
  build: {
    assetsDir: 'bundle',
    // three.js (chargé à la demande, seulement sur grand écran) dépasse le seuil par défaut
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(import.meta.dirname, `${p}.html`)])),
    },
  },
  preview: { port: 4173 },
  server: { port: 5173 },
});
