import { describe, expect, it } from 'vitest';
import { deletionConfirmed, deletionErrorMessage } from './account-deletion';

describe('borrado de cuenta', () => {
  it.each(['BORRAR', 'borrar', '  Borrar '])('acepta la palabra de confirmación: "%s"', (typed) => {
    expect(deletionConfirmed(typed)).toBe(true);
  });

  it.each(['', 'BORRA', 'BORRAR CUENTA', 'si'])('rechaza cualquier otro texto: "%s"', (typed) => {
    expect(deletionConfirmed(typed)).toBe(false);
  });

  it('explica cada tipo de fallo', () => {
    expect(deletionErrorMessage()).toMatch(/conexión/);
    expect(deletionErrorMessage(401)).toMatch(/sesión ha caducado/);
    expect(deletionErrorMessage(502)).toMatch(/No se ha podido borrar/);
    expect(deletionErrorMessage(404)).toMatch(/No se ha podido borrar/);
  });
});
