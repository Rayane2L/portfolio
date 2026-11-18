# Portfolio de Rayane LALI

Site de [Rayane LALI](https://rayane2l.github.io/portfolio/), étudiant en cybersécurité à Epitech Nice.

Esthétique terminal en bleu, mise en page pleine largeur. Un serpent 3D inspiré de l'Atheris hispida (vipère arboricole hérissée), modélisé dans Blender, descend le long du rail de gauche au fil de la lecture, tourne la tête vers chaque section atteinte, respire et sort la langue de temps en temps.

## Stack

- React 19 + TypeScript, Tailwind CSS 4, construit avec Vite
- Pages pré-rendues à la construction : le contenu se lit sans JavaScript et reste indexable
- three.js pour le serpent 3D, chargé à la demande sur grand écran uniquement
- Blender 5.3 (script Python) pour le modèle, compressé avec glTF-Transform (meshopt, 147 Ko)

## Pages

| Fichier | Contenu |
|---|---|
| `index.html` | Accueil : fenêtre de terminal, présentation, arborescence du site |
| `projets.html` | Projets : cybersécurité d'abord, puis dev (Epitech), perso et stages |
| `parcours.html` | Formation, expériences, compétences, langues |
| `contact.html` | GitHub, LinkedIn, e-mail |

## Commandes

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run preview
```

`npm run model` reconstruit le serpent : Blender génère le modèle et trois aperçus dans `blender/previews/`, puis le fichier est compressé dans `public/models/atheris.glb`. Le chemin de Blender se change avec la variable `BLENDER`.

## Structure

```
blender/atheris.py      modèle 3D de l'Atheris (script Blender) ; atheris.blend à ouvrir dans Blender
public/                 polices, SVG décoratifs, modèle 3D
scripts/                compression du modèle, pré-rendu des pages, génération des SVG
src/data/content.ts     tout le texte du site
src/pages.tsx           les quatre pages
src/components/         mise en page, rail, blocs réutilisables
src/snake/rail.ts       piste, repères de sections, suivi du scroll, serpent vectoriel de secours
src/snake/snake3d.ts    serpent 3D : courbé en temps réel par un shader le long du rail
```

## Comportement du serpent

- **Grand écran avec WebGL 2** : serpent 3D. Le vectoriel s'affiche pendant le chargement.
- **Mobile ou sans WebGL** : serpent vectoriel, sans télécharger three.js.
- **`prefers-reduced-motion`** : le serpent reste immobile, sans respiration ni langue.

## Déploiement

Chaque push sur `main` lance `.github/workflows/deploy.yml` : vérification des types, construction, publication sur GitHub Pages.

## Sécurité

- Content-Security-Policy stricte en production : `default-src 'none'`, tout en `'self'`. Seule exception, `'wasm-unsafe-eval'`, nécessaire au décodeur WebAssembly du modèle 3D.
- Aucune requête tierce : polices hébergées avec le site, pas de CDN ni de traceur.

## Polices

JetBrains Mono et IBM Plex Sans, sous licence SIL Open Font License 1.1.
