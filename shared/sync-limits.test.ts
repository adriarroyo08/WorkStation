import { describe, expect, it, vi } from 'vitest';
import { syncLimitMessage, uploadRecords, type SendError } from './sync-limits';

const row = (id: string, deleted = false) => ({ id, deleted });
type Row = ReturnType<typeof row>;
const rows = (n: number) => Array.from({ length: n }, (_, i) => row(`r${i}`));
const TOO_BIG: SendError = { code: 'WS413', message: 'demasiado grande' };
const QUOTA: SendError = { code: 'WS403', message: 'cuota' };

// Servidor simulado: un lote con algún registro inválido se rechaza entero, como una transacción.
function server(bad: (r: Row) => SendError | null) {
  const saved: string[] = [];
  const send = vi.fn(async (chunk: Row[]) => {
    const error = chunk.map(bad).find(Boolean);
    if (error) return error;
    saved.push(...chunk.map((r) => r.id));
    return null;
  });
  return { saved, send };
}

describe('uploadRecords', () => {
  it('sube por lotes sin reintentos si no hay rechazos', async () => {
    const { saved, send } = server(() => null);
    await expect(uploadRecords(rows(450), send)).resolves.toEqual({ rejected: [], deferred: [] });
    expect(send).toHaveBeenCalledTimes(3);
    expect(saved).toHaveLength(450);
  });

  it('un registro demasiado grande no bloquea al resto de su lote', async () => {
    const { saved, send } = server((r) => (r.id === 'r57' ? TOO_BIG : null));
    const res = await uploadRecords(rows(200), send);
    expect(res.rejected).toEqual([{ row: row('r57'), code: 'WS413' }]);
    expect(saved).toHaveLength(199);
    expect(saved).not.toContain('r57');
    expect(send.mock.calls.length).toBeLessThanOrEqual(20);
  });

  it('el número de peticiones está acotado aunque se rechace todo', async () => {
    const { saved, send } = server(() => QUOTA);
    const res = await uploadRecords(rows(1000), send, { maxSplits: 25 });
    expect(saved).toEqual([]);
    expect(send.mock.calls.length).toBeLessThanOrEqual(5 + 2 * 25);
    expect(res.rejected.length + res.deferred.length).toBeGreaterThan(0);
  });

  it('envía primero los borrados, que liberan espacio', async () => {
    const { send } = server(() => null);
    await uploadRecords([row('a'), row('b', true), row('c'), row('d', true)], send);
    expect(send.mock.calls[0][0].map((r) => r.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('otros errores se lanzan sin partir el lote y lo no enviado no cuenta como guardado', async () => {
    const send = vi.fn(async () => ({ code: '500', message: 'caído' }));
    await expect(uploadRecords(rows(10), send)).rejects.toThrow('caído');
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('syncLimitMessage', () => {
  it('explica el motivo y que los datos siguen en el dispositivo', () => {
    expect(syncLimitMessage(['WS403'])).toMatch(/límite de datos.*Siguen guardados en este dispositivo/);
    expect(syncLimitMessage(['WS413', 'WS413'])).toMatch(/demasiado grandes.*Siguen guardados/);
    expect(syncLimitMessage(['WS413', 'WS403']).match(/Siguen guardados/g)).toHaveLength(1);
  });
});
