import { describe, expect, it } from 'vitest';
import { passwordOk, passwordStrength } from './password';

describe('política de contraseñas', () => {
  it('exige 8 caracteres, mayúscula, minúscula y número', () => {
    expect(passwordOk('Secreto1')).toBe(true);
    expect(passwordOk('secreto1')).toBe(false);
    expect(passwordOk('SECRETO1')).toBe(false);
    expect(passwordOk('Secretos')).toBe(false);
    expect(passwordOk('Secr1')).toBe(false);
    expect(passwordOk('Ñandú2024')).toBe(true);
  });
  it('mide la fuerza', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('secreto')).toBe(1);
    expect(passwordStrength('Secreto1')).toBe(2);
    expect(passwordStrength('Secreto1!')).toBe(3);
    expect(passwordStrength('Secretolargo1')).toBe(3);
  });
});
