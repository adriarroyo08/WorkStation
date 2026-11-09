import { missingAndroidSigningSecrets } from '../shared/android-signing.ts';

const missing = missingAndroidSigningSecrets(process.env);
if (missing.length) {
  console.error(`::error::Faltan secrets de firma Android: ${missing.join(', ')}. No se permite publicar con una clave temporal ni credenciales por defecto.`);
  process.exitCode = 1;
}
