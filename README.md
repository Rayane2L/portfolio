# Portfolio de Rayane LALI

Site statique (HTML, CSS, JavaScript, sans dépendance ni étape de build) : étudiant en cybersécurité à Epitech Nice.

Esthétique terminal en bleu, mise en page pleine largeur. Un serpent descend le long du rail de gauche au fil de la lecture et allume le repère de chaque section atteinte.

## Pages

| Fichier | Contenu |
|---|---|
| `index.html` | Accueil : fenêtre de terminal (`whoami`, `cat focus.txt`, `./recherche`), présentation, arborescence du site |
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
assets/        réseau de noeuds, vague, favicon (SVG) et polices
css/style.css  charte : fond #0d1117, bleus #58a6ff / #2f81f7 / #a5d6ff
js/snake.js    serpent du rail, dessiné en SVG et piloté par le scroll
tools/         script qui régénère les SVG décoratifs
```

Régénérer les SVG après modification du script :

```bash
node tools/generer-assets.js assets
```

## Choix techniques

- Aucune requête tierce : polices hébergées avec le site, pas de CDN ni de traceur.
- Content-Security-Policy stricte (`default-src 'none'`, scripts et styles limités à `'self'`, aucun style ou script en ligne).
- Le contenu est du HTML statique : le site se lit sans JavaScript, seul le serpent en dépend.
- `prefers-reduced-motion` : le serpent reste immobile et le curseur ne clignote plus.
- Navigation au clavier : lien d'évitement, focus visible, cibles tactiles de 44 px.

## Polices

JetBrains Mono et IBM Plex Sans, sous licence SIL Open Font License 1.1.
