// Reconstruit le serpent : Blender (modèle + aperçus) puis compression glTF pour le web.
// Usage : npm run model   (variable BLENDER pour un autre chemin de Blender)
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const blender = process.env.BLENDER ?? 'C:/Program Files/Blender Foundation/Blender 5.3/blender.exe';
const models = resolve(root, 'public/models');
const raw = resolve(models, 'atheris-raw.glb');
const out = resolve(models, 'atheris.glb');

if (!existsSync(blender)) {
  console.error(`Blender introuvable : ${blender} (définir la variable BLENDER)`);
  process.exit(1);
}

execFileSync(blender, ['--background', '--factory-startup', '--python', resolve(root, 'blender/atheris.py'), '--', models, resolve(root, 'blender/previews')], { stdio: 'inherit' });

// quantification + compression meshopt (décodeur léger côté navigateur)
const cli = resolve(root, 'node_modules/@gltf-transform/cli/bin/cli.js');
execFileSync(process.execPath, [cli, 'optimize', raw, out, '--compress', 'meshopt', '--texture-compress', 'false', '--simplify', 'false', '--instance', 'false', '--join', 'false', '--flatten', 'false'], { stdio: 'inherit' });
rmSync(raw);
console.log(`atheris.glb : ${(statSync(out).size / 1024).toFixed(0)} Ko`);
