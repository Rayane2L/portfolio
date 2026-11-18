// Insère le HTML pré-rendu par React dans chaque page construite par Vite.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const { render } = await import(pathToFileURL(resolve(root, 'dist-ssr/entry-server.js')).href);

for (const page of ['index', 'projets', 'parcours', 'contact']) {
  const file = resolve(root, 'dist', `${page}.html`);
  const html = readFileSync(file, 'utf8');
  if (!html.includes('<!--app-html-->')) throw new Error(`marqueur absent dans ${page}.html`);
  writeFileSync(file, html.replace('<!--app-html-->', render(page)));
  console.log(`pré-rendu : ${page}.html`);
}
rmSync(resolve(root, 'dist-ssr'), { recursive: true, force: true });
