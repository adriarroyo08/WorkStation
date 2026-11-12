import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { ANDROID_SIGNING_SECRETS, missingAndroidSigningSecrets } from './android-signing';

describe('firma de publicaciones Android', () => {
  it('el workflow ejecuta el control antes de preparar la clave y pasa los cuatro secrets', () => {
    const workflow = readFileSync('.github/workflows/android.yml', 'utf8');
    expect(workflow.indexOf('run: node --experimental-strip-types scripts/check-android-signing.mjs')).toBeLessThan(workflow.indexOf('- name: Clave de firma'));
    for (const key of ANDROID_SIGNING_SECRETS) expect(workflow).toContain(`${key}: ${'${{ secrets.'}${key} }}`);
    expect(workflow).not.toContain("|| 'workstation'");
  });
  it('el comando del workflow falla con un mensaje claro sin mostrar valores privados', () => {
    const env = { ...process.env, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main', ...Object.fromEntries(ANDROID_SIGNING_SECRETS.map((key) => [key, ''])) };
    const rejected = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/check-android-signing.mjs'], { env, encoding: 'utf8' });
    expect(rejected.status).toBe(1);
    for (const key of ANDROID_SIGNING_SECRETS) expect(rejected.stderr).toContain(key);
    const accepted = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/check-android-signing.mjs'], { env: { ...env, ...secrets }, encoding: 'utf8' });
    expect(accepted.status).toBe(0);
    expect(accepted.stdout + accepted.stderr).not.toContain('valor-privado');
    const pr = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/check-android-signing.mjs'], { env: { ...env, GITHUB_EVENT_NAME: 'pull_request' }, encoding: 'utf8' });
    expect(pr.status).toBe(0);
  });
  const secrets = Object.fromEntries(ANDROID_SIGNING_SECRETS.map((key) => [key, 'valor-privado']));
  for (const ref of ['refs/heads/main', 'refs/tags/v1.0', 'refs/tags/beta']) {
    for (const event of ['push', 'workflow_dispatch']) {
      const env = { GITHUB_REF: ref, GITHUB_EVENT_NAME: event };
      it(`exige todos los secrets en ${event} ${ref}`, () => {
        expect(missingAndroidSigningSecrets(env)).toEqual([...ANDROID_SIGNING_SECRETS]);
        expect(missingAndroidSigningSecrets({ ...env, ...secrets })).toEqual([]);
        for (const key of ANDROID_SIGNING_SECRETS) {
          expect(missingAndroidSigningSecrets({ ...env, ...secrets, [key]: '' })).toEqual([key]);
          expect(missingAndroidSigningSecrets({ ...env, ...secrets, [key]: '  ' })).toEqual([key]);
        }
      });
    }
  }
  it('permite PR y builds locales sin secrets', () => {
    expect(missingAndroidSigningSecrets({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_REF: 'refs/heads/main' })).toEqual([]);
    expect(missingAndroidSigningSecrets({})).toEqual([]);
    expect(missingAndroidSigningSecrets({ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/feature' })).toEqual([]);
  });
});
