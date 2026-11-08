// Subida de registros cuando el servidor puede rechazarlos por tamaño o cuota (supabase/migrations/009).
// Un rechazo deshace el lote entero: se parte para que un solo registro no bloquee a los demás, con un número
// máximo de reintentos por subida. Lo rechazado no se borra de la cola ni de los datos locales.

export const SYNC_LIMIT_CODES = ['WS413', 'WS403'] as const;
export type SyncLimitCode = (typeof SYNC_LIMIT_CODES)[number];

export interface SendError {
  code?: string;
  message: string;
}

export interface Rejected<T> {
  row: T;
  code: SyncLimitCode;
}

export interface UploadResult<T> {
  /** Registros que el servidor rechaza por sí mismos: no merece la pena reenviarlos sin cambios. */
  rejected: Rejected<T>[];
  /** Rechazos de lotes que ya no se han partido por agotar los reintentos: siguen en la cola para otra subida. */
  deferred: SyncLimitCode[];
}

export const isSyncLimit = (code: string | undefined): code is SyncLimitCode => SYNC_LIMIT_CODES.includes(code as SyncLimitCode);

/** `send` devuelve null si el lote se ha guardado o el error del servidor si no. Otros errores (red, sesión) se lanzan. */
export async function uploadRecords<T extends { deleted: boolean }>(
  rows: T[],
  send: (chunk: T[]) => Promise<SendError | null>,
  { chunkSize = 200, maxSplits = 25 }: { chunkSize?: number; maxSplits?: number } = {},
): Promise<UploadResult<T>> {
  const result: UploadResult<T> = { rejected: [], deferred: [] };
  let splits = 0;
  const upload = async (chunk: T[]): Promise<void> => {
    const error = await send(chunk);
    if (!error) return;
    if (!isSyncLimit(error.code)) throw new Error(error.message);
    if (chunk.length === 1) return void result.rejected.push({ row: chunk[0], code: error.code });
    if (splits >= maxSplits) return void result.deferred.push(error.code);
    splits++;
    const middle = chunk.length >> 1;
    await upload(chunk.slice(0, middle));
    await upload(chunk.slice(middle));
  };
  // Los borrados primero: son los que liberan espacio si la cuenta está en el límite.
  const ordered = [...rows].sort((a, b) => Number(b.deleted) - Number(a.deleted));
  for (let i = 0; i < ordered.length; i += chunkSize) await upload(ordered.slice(i, i + chunkSize));
  return result;
}

/** Texto para la pantalla de cuenta. */
export function syncLimitMessage(codes: Iterable<SyncLimitCode>): string {
  const seen = new Set(codes);
  const parts = [
    seen.has('WS403') && 'Has llegado al límite de datos de tu cuenta en la nube y no se han subido todos los cambios.',
    seen.has('WS413') && 'Algunos registros son demasiado grandes para la nube y no se han subido.',
  ].filter(Boolean);
  return `${parts.join(' ')} Siguen guardados en este dispositivo.`;
}
