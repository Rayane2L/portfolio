import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './pages';
import type { PageId } from './data/content';
import './styles.css';

const root = document.getElementById('root')!;
const page = (root.dataset.page ?? 'index') as PageId;
const app = (
  <StrictMode>
    <App page={page} />
  </StrictMode>
);

// en production le HTML est pré-rendu : on l'hydrate ; en dev il est vide : on le rend
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
