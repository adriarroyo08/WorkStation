import { describe, expect, it } from 'vitest';
import { needsDaily, prune, type BackupMeta } from './backups';

const b = (id: string, at: string, reason: BackupMeta['reason'] = 'diaria'): BackupMeta => ({ id, at, reason, workouts: 0, routines: 0 });

describe('copias automáticas', () => {
  it('una diaria por día', () => {
    expect(needsDaily([], new Date('2026-10-23T10:00:00Z'))).toBe(true);
    expect(needsDaily([b('a', '2026-10-23T08:00:00Z')], new Date('2026-10-23T10:00:00Z'))).toBe(false);
    expect(needsDaily([b('a', '2026-10-23T08:00:00Z', 'manual')], new Date('2026-10-23T10:00:00Z'))).toBe(true);
  });
  it('conserva 7 diarias y 5 del resto', () => {
    const list = [
      ...Array.from({ length: 10 }, (_, i) => b(`d${i}`, `2026-10-${String(10 + i).padStart(2, '0')}T08:00:00Z`)),
      b('dup', '2026-10-19T09:00:00Z'),
      ...Array.from({ length: 7 }, (_, i) => b(`o${i}`, `2026-10-0${i + 1}T08:00:00Z`, 'antes de importar')),
    ];
    const { keep, drop } = prune(list);
    expect(keep.filter((x) => x.reason === 'diaria').map((x) => x.id)).toEqual(['dup', 'd8', 'd7', 'd6', 'd5', 'd4', 'd3']);
    expect(keep.filter((x) => x.reason !== 'diaria')).toHaveLength(5);
    expect(drop.map((x) => x.id)).toEqual(expect.arrayContaining(['d9', 'd0', 'o0', 'o1']));
  });
});
