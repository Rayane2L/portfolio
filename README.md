# Portfolio de Rayane LALI

Site statique (HTML, CSS, JavaScript, sans dépendance ni étape de build) : étudiant en cybersécurité à Epitech Nice.

## Pages

| Fichier | Contenu |
|---|---|
| `index.html` | Accueil : terminal interactif (`help`, `whoami`, `ls projets`, `cat contact`…) |
| `projets.html` | Projets : cybersécurité d'abord, puis dev (Epitech), perso et stages |
| `parcours.html` | Formation, expériences, compétences, langues |
| `contact.html` | GitHub, LinkedIn, e-mail |

## Lancer en local

Les pages utilisent des chemins relatifs : n'importe quel serveur statique suffit.

```bash
python -m http.server 4173
```

Puis ouvrir `http://localhost:4173`.

## Structure

```
assets/        serpent, réseau de noeuds, vague, favicon (SVG) et polices
css/style.css  charte : fond #0d1117, vert terminal #00ff9c, vert néon #39ff14
js/terminal.js terminal de la page d'accueil
js/main.js     apparition des blocs au scroll
tools/         script qui régénère les SVG décoratifs
```

Régénérer les SVG après modification du script :

```bash
node tools/generer-assets.js assets
```

## Choix techniques

- Aucune requête tierce : polices hébergées avec le site, pas de CDN ni de traceur.
- Content-Security-Policy stricte (`default-src 'none'`, scripts et styles limités à `'self'`, aucun style ou script en ligne).
- Le terminal insère tout le texte avec `textContent` : la saisie n'est jamais interprétée comme du HTML.
- Le site reste lisible sans JavaScript, et les animations respectent `prefers-reduced-motion`.

## Polices

JetBrains Mono et IBM Plex Sans, sous licence SIL Open Font License 1.1.
