// Política de contraseñas al crear cuenta o elegir una nueva (entrar no la exige: las cuentas antiguas pueden tener una más corta).
export const PASSWORD_RULES: { label: string; ok: (pw: string) => boolean }[] = [
  { label: 'Al menos 8 caracteres', ok: (pw) => pw.length >= 8 },
  { label: 'Una mayúscula', ok: (pw) => /\p{Lu}/u.test(pw) },
  { label: 'Una minúscula', ok: (pw) => /\p{Ll}/u.test(pw) },
  { label: 'Un número', ok: (pw) => /\d/.test(pw) },
];

export const passwordOk = (pw: string) => PASSWORD_RULES.every((r) => r.ok(pw));

/** 0 vacía · 1 débil · 2 aceptable · 3 fuerte. Fuerte = cumple la política y además es larga o lleva símbolos. */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  if (!passwordOk(pw)) return 1;
  return pw.length >= 12 || /[^\p{L}\d]/u.test(pw) ? 3 : 2;
}
