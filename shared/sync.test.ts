import { describe, expect, it } from 'vitest';
import { emptyData } from './data';
import { applyRemote, diff, initialUpload, recordKey, snapshot } from './sync';
import type { Workout } from './types';

const w = (id: string, name = id): Workout => ({ id, name, startedAt: '2026-10-01T10:00:00Z', exercises: [] });

describe('sync', () => {
  it('detecta altas, cambios y bajas', () => {
    const a = emptyData();
    a.workouts.push(w('1'), w('2'));
    const prev = snapshot(a);
    const b = structuredClone(a);
    b.workouts[0].name = 'cambiado';
    b.workouts.splice(1, 1);
    b.workouts.push(w('3'));
    b.settings.weeklyGoal = 5;
    const ch = diff(prev, b, 'T');
    const keys = ch.map((r) => `${r.collection}:${r.id}:${r.deleted}`).sort();
    expect(keys).toEqual(['settings:settings:false', 'workouts:1:false', 'workouts:2:true', 'workouts:3:false']);
  });
  it('sin cambios no genera nada', () => {
    const a = emptyData();
    expect(diff(snapshot(a), structuredClone(a))).toEqual([]);
  });
  it('aplica remotos respetando cambios locales más nuevos', () => {
    const a = emptyData();
    a.workouts.push(w('1', 'local'));
    const rows = [
      { collection: 'workouts' as const, id: '1', doc: w('1', 'remoto'), deleted: false, client_updated_at: '2026-10-01T00:00:00Z' },
      { collection: 'workouts' as const, id: '9', doc: w('9'), deleted: false, client_updated_at: '2026-10-01T00:00:00Z' },
      { collection: 'settings' as const, id: 'settings', doc: { weeklyGoal: 6 }, deleted: false, client_updated_at: 'x' },
    ];
    const keep = applyRemote(a, rows, new Map([[recordKey('workouts', '1'), '2026-10-02T00:00:00Z']]));
    expect(keep.data.workouts.find((x) => x.id === '1')!.name).toBe('local');
    expect(keep.data.workouts.some((x) => x.id === '9')).toBe(true);
    expect(keep.data.settings.weeklyGoal).toBe(6);
    const take = applyRemote(a, rows);
    expect(take.data.workouts.find((x) => x.id === '1')!.name).toBe('remoto');
  });
  it('borrados remotos', () => {
    const a = emptyData();
    a.workouts.push(w('1'));
    const r = applyRemote(a, [{ collection: 'workouts', id: '1', doc: null, deleted: true, client_updated_at: 'z' }]);
    expect(r.data.workouts).toHaveLength(0);
    expect(r.changed).toBe(1);
  });
  it('subida inicial solo de lo que falta en remoto', () => {
    const a = emptyData();
    a.workouts.push(w('1'), w('2'));
    const up = initialUpload(a, new Set([recordKey('workouts', '1')]));
    expect(up.some((r) => r.id === '2')).toBe(true);
    expect(up.some((r) => r.id === '1')).toBe(false);
  });
});
