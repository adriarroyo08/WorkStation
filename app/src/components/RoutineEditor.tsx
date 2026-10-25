// Editor de rutinas serie a serie (se carga bajo demanda).
import { useState } from 'react';
import { ReorderSheet, moveItem } from './Reorder';
import type { Routine, RoutineExercise, SetType } from '../../../shared/types';
import { uid } from '../../../shared/types';
import { clock, useStore } from '../store';
import ExercisePicker from './ExercisePicker';
import { ArrowUpDown, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { Back, ExerciseMedia, NumberField, WeightField } from './ui';
import { weightUnit } from '../../../shared/units';

export default function RoutineEditor({ initial, onClose }: { initial: Routine; onClose: () => void }) {
  const { data, update, settings } = useStore();
  const [r, setR] = useState<Routine>(structuredClone(initial));
  const [picker, setPicker] = useState<{ replace?: number } | null>(null);
  const [reorder, setReorder] = useState(false);
  const ex = new Map(data.exercises.map((e) => [e.id, e]));
  const edit = (fn: (r: Routine) => void) =>
    setR((cur) => {
      const n = structuredClone(cur);
      fn(n);
      return n;
    });
  const exists = data.routines.some((x) => x.id === r.id);

  const save = () => {
    if (!r.name.trim()) return alert('Ponle un nombre a la rutina');
    update((d) => {
      const i = d.routines.findIndex((x) => x.id === r.id);
      if (i >= 0) d.routines[i] = r;
      else d.routines.push(r);
    });
    onClose();
  };

  const newEx = (exerciseId: string, supersetId?: string): RoutineExercise => {
    const kind = ex.get(exerciseId)?.kind;
    const set = kind === 'duration' ? { type: 'normal' as SetType, durationSec: 60 } : { type: 'normal' as SetType, reps: 10 };
    return { exerciseId, restSec: settings.defaultRestSec, supersetId, sets: [{ ...set }, { ...set }, { ...set }] };
  };

  return (
    <section>
      <Back
        onClick={() => (JSON.stringify(r) === JSON.stringify(initial) || confirm('¿Salir sin guardar?')) && onClose()}
        label="Cancelar"
        right={
          <button className="primary" onClick={save}>
            Guardar
          </button>
        }
      />
      <input className="title" value={r.name} onChange={(e) => edit((n) => void (n.name = e.target.value))} placeholder="Nombre de la rutina" />
      <textarea className="notes" rows={1} placeholder="Notas de la rutina" value={r.notes ?? ''} onChange={(e) => edit((n) => void (n.notes = e.target.value || undefined))} />
      {data.folders.length > 0 && (
        <label>
          Carpeta
          <select value={r.folderId ?? ''} onChange={(e) => edit((n) => void (n.folderId = e.target.value || undefined))}>
            <option value="">Sin carpeta</option>
            {data.folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {r.exercises.length > 1 && (
        <button className="ghost small icon-btn" onClick={() => setReorder(true)}>
          <ArrowUpDown size={15} /> Reordenar ejercicios
        </button>
      )}
      {reorder && (
        <ReorderSheet
          items={r.exercises}
          keyOf={(e, i) => `${e.exerciseId}-${r.exercises.slice(0, i).filter((x) => x.exerciseId === e.exerciseId).length}`}
          render={(e) => (
            <span className="row">
              <ExerciseMedia exercise={ex.get(e.exerciseId)} size="thumb" />
              <span className="grow">
                <b>{ex.get(e.exerciseId)?.name ?? e.exerciseId}</b>
                <small className="muted">
                  {' '}
                  · {e.sets.length} {e.sets.length === 1 ? 'serie' : 'series'}
                </small>
              </span>
            </span>
          )}
          onMove={(from, to) => edit((n) => void (n.exercises = moveItem(n.exercises, from, to)))}
          onClose={() => setReorder(false)}
        />
      )}
      {r.exercises.map((e, i) => {
        const kind = ex.get(e.exerciseId)?.kind ?? 'weight_reps';
        const dur = kind === 'duration';
        const ssPrev = i > 0 && e.supersetId && r.exercises[i - 1].supersetId === e.supersetId;
        return (
          <div key={i} className={`card ${e.supersetId ? 'superset' : ''} ${ssPrev ? 'ss-mid' : ''}`}>
            {e.supersetId && !ssPrev && <div className="ss-label">Superserie</div>}
            <div className="row">
              <ExerciseMedia exercise={ex.get(e.exerciseId)} size="thumb" />
              <b className="grow">{ex.get(e.exerciseId)?.name}</b>
              <button className="ghost small icon-btn" aria-label="Quitar ejercicio" onClick={() => edit((n) => void n.exercises.splice(i, 1))}>
                <Trash2 size={16} />
              </button>
            </div>
            <div className="row small">
              <label className="grow">
                Descanso
                <select aria-label="Descanso" value={e.restSec} onChange={(ev) => edit((n) => void (n.exercises[i].restSec = Number(ev.target.value)))}>
                  {[0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map((s) => (
                    <option key={s} value={s}>
                      {s ? clock(s) : 'Off'}
                    </option>
                  ))}
                </select>
              </label>
              {i < r.exercises.length - 1 && (
                <button
                  className="ghost small"
                  onClick={() =>
                    edit((n) => {
                      const a = n.exercises[i],
                        b = n.exercises[i + 1];
                      if (a.supersetId && a.supersetId === b.supersetId) b.supersetId = undefined;
                      else a.supersetId = b.supersetId = a.supersetId ?? b.supersetId ?? uid();
                    })
                  }
                >
                  {e.supersetId && r.exercises[i + 1].supersetId === e.supersetId ? 'Separar' : 'Superserie con siguiente'}
                </button>
              )}
              <button className="ghost small icon-btn" aria-label="Reemplazar ejercicio" onClick={() => setPicker({ replace: i })}>
                <RefreshCw size={16} />
              </button>
            </div>
            <div className="rset head small muted">
              <span>Serie</span>
              <span>{dur ? '' : weightUnit()}</span>
              <span>{dur ? 'Seg' : 'Reps'}</span>
              <span />
            </div>
            {e.sets.map((s, si) => (
              <div key={si} className="rset">
                <button
                  className={`settype ${s.type}`}
                  onClick={() =>
                    edit(
                      (n) =>
                        void (n.exercises[i].sets[si].type = (['normal', 'warmup', 'drop', 'failure'] as SetType[])[((['normal', 'warmup', 'drop', 'failure'] as SetType[]).indexOf(s.type) + 1) % 4]),
                    )
                  }
                >
                  {{ normal: si + 1, warmup: 'C', drop: 'D', failure: 'F' }[s.type]}
                </button>
                {dur ? <span /> : <WeightField aria-label={`Peso (${weightUnit()})`} kg={s.weight} placeholder="-" onChange={(v) => edit((n) => void (n.exercises[i].sets[si].weight = v))} />}
                {dur ? (
                  <NumberField decimals={false} aria-label="Segundos" value={s.durationSec} onChange={(v) => edit((n) => void (n.exercises[i].sets[si].durationSec = v))} />
                ) : (
                  <NumberField decimals={false} aria-label="Repeticiones" value={s.reps} placeholder="-" onChange={(v) => edit((n) => void (n.exercises[i].sets[si].reps = v))} />
                )}
                <button className="ghost small" onClick={() => edit((n) => void n.exercises[i].sets.splice(si, 1))} disabled={e.sets.length === 1} aria-label="Quitar serie">
                  <X size={16} />
                </button>
              </div>
            ))}
            <button className="ghost full small" onClick={() => edit((n) => void n.exercises[i].sets.push({ ...(n.exercises[i].sets.at(-1) ?? { type: 'normal' }) }))}>
              + Añadir serie
            </button>
          </div>
        );
      })}
      <button className="primary full" onClick={() => setPicker({})}>
        <Plus size={18} strokeWidth={2.6} /> Añadir ejercicio
      </button>
      {exists && (
        <button className="danger full" onClick={() => confirm('¿Borrar esta rutina?') && (update((d) => void (d.routines = d.routines.filter((x) => x.id !== r.id))), onClose())}>
          Borrar rutina
        </button>
      )}
      {picker && (
        <ExercisePicker
          single={picker.replace !== undefined}
          onClose={() => setPicker(null)}
          onPick={(es, ss) => {
            const sid = ss ? uid() : undefined;
            edit((n) => {
              if (picker.replace !== undefined) n.exercises[picker.replace] = { ...n.exercises[picker.replace], exerciseId: es[0].id };
              else n.exercises.push(...es.map((x) => newEx(x.id, sid)));
            });
            setPicker(null);
          }}
        />
      )}
    </section>
  );
}
