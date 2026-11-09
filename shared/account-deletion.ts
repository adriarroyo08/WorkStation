// Borrado de cuenta: palabra de confirmación y mensajes de error que ve el usuario.
export const DELETE_ACCOUNT_WORD = 'BORRAR';

export const deletionConfirmed = (typed: string) => typed.trim().toUpperCase() === DELETE_ACCOUNT_WORD;

/** `status` es el código HTTP de la función; sin él, la petición no llegó a responderse. */
export function deletionErrorMessage(status?: number): string {
  if (status === undefined) return 'Sin conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  if (status === 401) return 'Tu sesión ha caducado. Vuelve a iniciar sesión y repite el borrado.';
  return 'No se ha podido borrar la cuenta. Inténtalo de nuevo en un momento.';
}
