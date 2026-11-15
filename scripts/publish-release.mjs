import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { releaseTag } from '../shared/releases.ts';

// Defensa adicional: este script nunca escribe desde un PR ni otra rama.
if (process.env.GITHUB_EVENT_NAME !== 'push' || process.env.GITHUB_REF !== 'refs/heads/main') {
  throw new Error('Solo se publican releases desde un push a main');
}
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const previous = JSON.parse(git('show', `${event.before}:app/package.json`)).version;
const current = JSON.parse(git('show', `${event.after}:app/package.json`)).version;
const tags = git('tag', '--list').split('\n');
const tag = releaseTag(previous, current, tags);
if (tag) {
  execFileSync('gh', ['release', 'create', tag, '--repo', process.env.GITHUB_REPOSITORY,
    '--target', event.after, '--title', tag, '--generate-notes'], { stdio: 'inherit' });
} else {
  console.log('Sin cambio de versión o etiqueta ya existente: no se publica.');
}
