import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './pages';
import type { PageId } from './data/content';

/** Pré-rendu à la construction : le contenu reste lisible sans JavaScript et par les moteurs de recherche. */
export function render(page: PageId): string {
  return renderToString(
    <StrictMode>
      <App page={page} />
    </StrictMode>,
  );
}
