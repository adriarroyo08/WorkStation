// Editor de rutinas serie a serie (se carga bajo demanda).
import { ask } from '../dialog';
import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { ReorderSheet, moveItem } from './Reorder';
import type { Routine, RoutineExercise, SetType } from '../../../shared/types';
import { uid } from '../../../shared/types';
import { useStore } from '../store';
import RestPicker from './RestPicker';
import ExercisePicker from './ExercisePicker';
import ExerciseInfo from './ExerciseInfo';
import { ArrowUpDown, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { Back, ExerciseMedia, NumberField, Sheet, WeightField } from './ui';
import { weightUnit } from '../../../shared/units';
import { SET_LABEL, SET_NAMES, SET_TYPES } from '../../../shared/set-types';
import { dragShift, dropIndex } from '../../../shared/reorder';
import { normalizeRepRange, repRangeError } from '../../../shared/progression';
import './RoutineEditor.css';

const HOLD_MS = 450;

export default function RoutineEditor({ initial, onClose }: { initial: Routine; onClose: () => void }) {
  const { data, update, settings } = useStore();
  const errorId = useId();
  const [r, setR] = useState<Routine>(structuredClone(initial));
  const [picker, setPicker] = useState<{ replace?: number } | null>(null);
  const [reorder, setReorder] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [typeMenu, setTypeMenu] = useState<{ i: number; si: number } | null>(null);
  // Mantener pulsado un ejercicio: las tarjetas se pliegan y se arrastra sin soltar el dedo.
  const [drag, setDrag] = useState<{ from: number; y: number } | null>(null);
  const [geo, setGeo] = useState<{ first: number; step: number } | null>(null);
  const hold = useRef<{ timer: number; x: number; y: number } | null>(null);
  const held = useRef(false);
  const list = useRef<HTMLDivElement>(null);
  const ex = new Map(data.exercises.map((e) => [e.id, e]));
  const edit = (fn: (r: Routine) => void) =>
    setR((cur) => {
      const n = structuredClone(cur);
      fn(n);
      return n;
    });
  const exists = data.routines.some((x) => x.id === r.id);
  const n = r.exercises.length;
  const dragging = drag !== null;
  const target = drag && geo ? dropIndex(drag.y, geo.first, geo.step, n) : -1;

  const cancelHold = () => {
    if (hold.current) clearTimeout(hold.current.timer);
    hold.current = null;
  };
  const startHold = (e: RPointerEvent, i: number) => {
    if (n < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const y = e.clientY;
    cancelHold();
    hold.current = {
      x: e.clientX,
      y,
      timer: window.setTimeout(() => {
        hold.current = null;
        held.current = true;
        navigator.vibrate?.(12);
        setDrag({ from: i, y });
      }, HOLD_MS),
    };
  };
  const moveHold = (e: RPointerEvent) => {
    if (hold.current && Math.hypot(e.clientX - hold.current.x, e.clientY - hold.current.y) > 8) cancelHold();
  };

  // Con las tarjetas ya plegadas: medir las filas y dejar la que se arrastra bajo el dedo.
  useLayoutEffect(() => {
    if (!drag || !list.current) return setGeo(null);
    const el = list.current;
    const measure = () => [...el.querySelectorAll<HTMLElement>(':scope > .excard')].map((c) => c.getBoundingClientRect());
    let rows = measure();
    window.scrollBy(0, rows[drag.from].top + rows[drag.from].height / 2 - drag.y);
    rows = measure();
    setGeo({ first: rows[0].top + rows[0].height / 2, step: rows.length > 1 ? rows[1].top - rows[0].top : rows[0].height });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setDrag((d) => d && { ...d, y: e.clientY });
    const end = (e: PointerEvent) => {
      if (drag && geo && e.type === 'pointerup') {
        const to = dropIndex(e.clientY, geo.first, geo.step, n);
        if (to !== drag.from) edit((x) => void (x.exercises = moveItem(x.exercises, drag.from, to)));
      }
      setDrag(null);
    };
    const stopScroll = (e: TouchEvent) => e.cancelable && e.preventDefault();
    const noMenu = (e: Event) => e.preventDefault();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('touchmove', stopScroll, { passive: false });
    window.addEventListener('contextmenu', noMenu);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('touchmove', stopScroll);
      window.removeEventListener('contextmenu', noMenu);
    };
  });
  useEffect(() => cancelHold, []);

  const save = () => {
    if (!r.name.trim()) return ask.notice('Ponle un nombre a la rutina');
    const normalized = structuredClone(r);
    normalized.exercises.forEach((e) => {
      e.sets = e.sets.map((s) => normalizeRepRange(s, ex.get(e.exerciseId)?.kind ?? 'weight_reps'));
    });
    update((d) => {
      const i = d.routines.findIndex((x) => x.id === r.id);
      if (i >= 0) d.routines[i] = normalized;
      else d.routines.push(normalized);
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
        onClick={async () =>
          (JSON.stringify(r) === JSON.stringify(initial) || (await ask.confirm('Perderás los cambios de esta rutina.', { title: '¿Salir sin guardar?', ok: 'Salir', danger: true }))) && onClose()
        }
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
      <div ref={list} className={dragging ? 'rx-list compact' : 'rx-list'}>
        {r.exercises.map((e, i) => {
          const kind = ex.get(e.exerciseId)?.kind ?? 'weight_reps';
          const dur = kind === 'duration';
          const hasReps = ['weight_reps', 'reps', 'assisted'].includes(kind);
          const ssPrev = i > 0 && e.supersetId && r.exercises[i - 1].supersetId === e.supersetId;
          return (
            <div
              key={i}
              className={`excard ${e.supersetId ? 'superset' : ''} ${ssPrev ? 'ss-mid' : ''} ${drag?.from === i ? 'rx-dragging' : ''}`}
              style={drag && geo ? { transform: `translateY(${i === drag.from ? drag.y - (geo.first + i * geo.step) : dragShift(i, drag.from, target) * geo.step}px)` } : undefined}
            >
              {e.supersetId && !ssPrev && !dragging && <div className="ss-label">Superserie</div>}
              <div
                className="row rx-head"
                onPointerDown={(ev) => startHold(ev, i)}
                onPointerMove={moveHold}
                onPointerUp={cancelHold}
                onPointerCancel={cancelHold}
                onDragStart={(ev) => ev.preventDefault()}
              >
                <button
                  className="plain row grow left exinfo-open"
                  aria-label={`Ver cómo se hace ${ex.get(e.exerciseId)?.name ?? ''}`}
                  aria-description={n > 1 ? 'Mantén pulsado para moverlo' : undefined}
                  disabled={!ex.has(e.exerciseId)}
                  onClick={() => {
                    if (held.current) return void (held.current = false);
                    setInfo(e.exerciseId);
                  }}
                >
                  <ExerciseMedia exercise={ex.get(e.exerciseId)} size="thumb" />
                  <b className="grow">{ex.get(e.exerciseId)?.name ?? e.exerciseId}</b>
                </button>
                <button className="ghost small icon-btn gray" aria-label="Quitar ejercicio" onClick={() => edit((n) => void n.exercises.splice(i, 1))}>
                  <Trash2 size={16} />
                </button>
              </div>
              {!dragging && (
                <>
                  <div className="row small editor-tools">
                    <span className="grow">
                      <RestPicker value={e.restSec} onChange={(v) => edit((n) => void (n.exercises[i].restSec = v))} />
                    </span>
                    {i < r.exercises.length - 1 && (
                      <button
                        className="ghost small gray"
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
                    <button className="ghost small icon-btn gray" aria-label="Reemplazar ejercicio" onClick={() => setPicker({ replace: i })}>
                      <RefreshCw size={16} />
                    </button>
                  </div>
                  <div className="rset head small muted">
                    <span>Serie</span>
                    <span>{dur ? '' : weightUnit()}</span>
                    {hasReps ? (
                      <span className="rx-range">
                        <span>Mín.</span>
                        <span>Máx.</span>
                      </span>
                    ) : (
                      <span>{dur ? 'Seg' : 'Reps'}</span>
                    )}
                    <span />
                  </div>
                  {e.sets.map((s, si) => (
                    <div key={si} className="rset">
                      <button className={`settype ${s.type}`} aria-label={`Serie ${si + 1}: ${SET_NAMES[s.type]}. Cambiar tipo`} aria-haspopup="dialog" onClick={() => setTypeMenu({ i, si })}>
                        {SET_LABEL[s.type] || si + 1}
                      </button>
                      {dur ? <span /> : <WeightField aria-label={`Peso (${weightUnit()})`} kg={s.weight} placeholder="-" onChange={(v) => edit((n) => void (n.exercises[i].sets[si].weight = v))} />}
                      {dur ? (
                        <NumberField decimals={false} aria-label="Segundos" value={s.durationSec} onChange={(v) => edit((n) => void (n.exercises[i].sets[si].durationSec = v))} />
                      ) : hasReps ? (
                        <div className="rx-range">
                          <NumberField
                            decimals={false}
                            aria-label={`Repeticiones mínimas, serie ${si + 1}`}
                            aria-invalid={!!repRangeError(s)}
                            aria-describedby={`${errorId}-${i}-${si}`}
                            value={s.repsMin}
                            placeholder="-"
                            onChange={(v) => edit((n) => void (n.exercises[i].sets[si].repsMin = v))}
                          />
                          <NumberField
                            decimals={false}
                            aria-label={`Repeticiones máximas, serie ${si + 1}`}
                            aria-invalid={!!repRangeError(s)}
                            aria-describedby={`${errorId}-${i}-${si}`}
                            value={s.reps}
                            placeholder="-"
                            onChange={(v) => edit((n) => void (n.exercises[i].sets[si].reps = v))}
                          />
                          <span id={`${errorId}-${i}-${si}`} className="small error" aria-live="polite">
                            {repRangeError(s)}
                          </span>
                        </div>
                      ) : (
                        <NumberField decimals={false} aria-label="Repeticiones" value={s.reps} placeholder="-" onChange={(v) => edit((n) => void (n.exercises[i].sets[si].reps = v))} />
                      )}
                      <button className="ghost small" onClick={() => edit((n) => void n.exercises[i].sets.splice(si, 1))} disabled={e.sets.length === 1} aria-label="Quitar serie">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {hasReps && (
                    <button
                      className="ghost small"
                      onClick={() =>
                        edit((n) => {
                          const sets = n.exercises[i].sets;
                          sets.forEach((s) => {
                            s.reps = sets[0].reps;
                            s.repsMin = sets[0].repsMin;
                          });
                        })
                      }
                    >
                      Mismo rango en todas las series
                    </button>
                  )}
                  <button className="ghost full icon-btn" onClick={() => edit((n) => void n.exercises[i].sets.push({ ...(n.exercises[i].sets.at(-1) ?? { type: 'normal' }) }))}>
                    <Plus size={16} /> Añadir serie
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      {r.exercises.some((e) => ['weight_reps', 'reps', 'assisted'].includes(ex.get(e.exerciseId)?.kind ?? 'weight_reps')) && (
        <p className="small muted">Con un rango, la app te sugiere subir peso cuando llegues al máximo en todas las series.</p>
      )}
      <button className="primary full icon-btn" onClick={() => setPicker({})}>
        <Plus size={18} strokeWidth={2.6} /> Añadir ejercicio
      </button>
      {exists && (
        <button
          className="danger full"
          onClick={async () => (await ask.confirm('¿Borrar esta rutina?', { ok: 'Borrar', danger: true })) && (update((d) => void (d.routines = d.routines.filter((x) => x.id !== r.id))), onClose())}
        >
          Borrar rutina
        </button>
      )}
      {typeMenu && r.exercises[typeMenu.i]?.sets[typeMenu.si] && (
        <Sheet title={`Tipo de la serie ${typeMenu.si + 1}`} onClose={() => setTypeMenu(null)}>
          <div className="list">
            {SET_TYPES.map((t) => (
              <button
                key={t}
                className={`item settype-item ${t}`}
                aria-pressed={r.exercises[typeMenu.i].sets[typeMenu.si].type === t}
                onClick={() => (edit((x) => void (x.exercises[typeMenu.i].sets[typeMenu.si].type = t)), setTypeMenu(null))}
              >
                <b>{SET_LABEL[t] || typeMenu.si + 1}</b> {SET_NAMES[t]}
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {info && <ExerciseInfo id={info} onClose={() => setInfo(null)} />}
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
