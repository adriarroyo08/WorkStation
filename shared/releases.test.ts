import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { releaseTag } from './releases';

describe('releaseTag', () => {
  it('publica la versión nueva', () => {
    expect(releaseTag('1.19.0', '1.25.0', ['v1.19.0'])).toBe('v1.25.0');
  });
  it('no publica si la versión no cambia aunque falte su etiqueta', () => {
    expect(releaseTag('1.25.0', '1.25.0', [])).toBeNull();
  });
  it('no vuelve a publicar una etiqueta existente', () => {
    expect(releaseTag('1.19.0', '1.25.0', ['v1.25.0'])).toBeNull();
  });
  it('rechaza versiones que no sean numéricas de tres componentes', () => {
    for (const version of ['1.2', 'v1.2.3', '1.2.3;echo fallo', '1.2.3-beta']) {
      expect(() => releaseTag('1.0.0', version, [])).toThrow('Versión no válida');
    }
  });
});

// Comprueba la barrera real del script antes de acceder a Git o a la API.
describe('publish-release', () => {
  it.each([
    ['pull_request', 'refs/heads/main'],
    ['push', 'refs/heads/otra'],
  ])('rechaza %s en %s', (event, ref) => {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', fileURLToPath(new URL('../scripts/publish-release.mjs', import.meta.url))], {
      env: { ...process.env, GITHUB_EVENT_NAME: event, GITHUB_REF: ref, GITHUB_EVENT_PATH: '/no-debe-leerse' },
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Solo se publican releases desde un push a main');
  });
});
