/** Secrets obligatorios para mantener la firma de las publicaciones Android. */
export const ANDROID_SIGNING_SECRETS = ['WS_KEYSTORE_B64', 'WS_KEYSTORE_PASSWORD', 'WS_KEY_ALIAS', 'WS_KEY_PASSWORD'] as const;

export function missingAndroidSigningSecrets(env: Record<string, string | undefined>): string[] {
  const published = env.GITHUB_EVENT_NAME !== 'pull_request' && (env.GITHUB_REF === 'refs/heads/main' || env.GITHUB_REF?.startsWith('refs/tags/'));
  return published ? ANDROID_SIGNING_SECRETS.filter((name) => !env[name]?.trim()) : [];
}
