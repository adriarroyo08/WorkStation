// Programa (mesociclo) de una carpeta: crearlo desde una plantilla, ajustarlo y seguir su progreso.
import { useState } from 'react';
import {
  MAX_WEEKS,
  MESO_TEMPLATES,
  MIN_WEEKS,
  PHASE_LABELS,
  activeProgram,
  liftPlan,
  mesocycleError,
  mesocycleFromTemplate,
  mesoProgress,
  programOneRm,
  programRoutines,
  type Mesocycle,
  type MesoPhase,
  type MesoWeek,
} from '../../../shared/mesocycle';
import type { RoutineFolder } from '../../../shared/types';
import { fmtWeight } from '../../../shared/units';
import { ask } from '../dialog';
import { useStore } from '../store';
import { NumberField, Sheet, WeightField } from './ui';
import './Program.css';

const PHASES: MesoPhase[] = ['acumulacion', 'intensificacion', 'descarga'];

/** "4×8 · 70 % 1RM" */
export function targetText(t: MesoWeek['main']): string {
  return `${t.sets}×${t.repsMin !== undefined ? `${t.repsMin}-` : ''}${t.reps} · ${t.pct !== undefined ? `${String(t.pct).replace('.', ',')} % 1RM` : `RPE ${String(t.rpe).replace('.', ',')}`}`;
}

export default function ProgramSheet({ folderId, onClose }: { folderId: string; onClose: () => void }) {
  const { data, update } = useStore();
  const folder = data.folders.find((f) => f.id === folderId);
  const [draft, setDraft] = useState<Mesocycle | null>(null);
  if (!folder) return null;
  const active = activeProgram(folder) ? folder : undefined;
  const title = `Programa · ${folder.name}`;
  if (active && !draft)
    return (
      <Sheet title={title} onClose={onClose}>
        <Tracking
          folder={active}
          onAdjust={() => setDraft(structuredClone(active.mesocycle))}
          onRestart={() => setDraft({ ...structuredClone(active.mesocycle), startedAt: new Date().toISOString(), oneRm: undefined, overrides: undefined })}
          onEnd={async () => {
            if (await ask.confirm('Las rutinas de la carpeta vuelven a ser normales. El historial se conserva.', { title: '¿Terminar el programa?', ok: 'Terminar' }))
              update((d) => {
                const f = d.folders.find((x) => x.id === folderId);
                if (f?.mesocycle) f.mesocycle.endedAt = new Date().toISOString();
              });
          }}
        />
      </Sheet>
    );
  return (
    <Sheet title={title} onClose={onClose}>
      <ProgramForm
        folder={folder}
        initial={draft ?? undefined}
        editing={!!active && draft?.startedAt === active.mesocycle.startedAt}
        onCancel={active ? () => setDraft(null) : onClose}
        onSave={(m) => {
          update((d) => {
            const f = d.folders.find((x) => x.id === folderId);
            if (f) f.mesocycle = m;
          });
          setDraft(null);
        }}
      />
    </Sheet>
  );
}

function Tracking({ folder, onAdjust, onRestart, onEnd }: { folder: RoutineFolder & { mesocycle: Mesocycle }; onAdjust: () => void; onRestart: () => void; onEnd: () => void }) {
  const { data } = useStore();
  const m = folder.mesocycle;
  const p = mesoProgress(data, folder);
  const week = m.weeks[Math.min(p.week, m.weeks.length - 1)];
  const names = new Map(data.exercises.map((e) => [e.id, e.name]));
  return (
    <div className="program">
      <div className="program-head">
        <h3>{p.finished ? 'Programa completado' : `Semana ${p.week + 1} de ${m.weeks.length}`}</h3>
        {!p.finished && <span className={`pill phase-pill ${week.phase}`}>{PHASE_LABELS[week.phase]}</span>}
      </div>
      <ol className="phase-strip" aria-label="Semanas del programa">
        {m.weeks.map((w, i) => {
          const state = i < p.week ? 'hecha' : i === p.week && !p.finished ? 'actual' : 'pendiente';
          return <li key={i} className={`${w.phase} ${state}`} aria-label={`Semana ${i + 1}: ${PHASE_LABELS[w.phase]}, ${state}`} aria-current={state === 'actual' ? 'step' : undefined} />;
        })}
      </ol>
      <ul className="phase-legend small muted" aria-hidden="true">
        {PHASES.filter((ph) => m.weeks.some((w) => w.phase === ph)).map((ph) => (
          <li key={ph}>
            <i className={ph} /> {PHASE_LABELS[ph]}
          </li>
        ))}
      </ul>
      <div className="progress" role="progressbar" aria-label="Sesiones hechas" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.done}>
        <div style={{ width: `${(p.done / p.total) * 100}%` }} />
      </div>
      <p className="small muted">
        {p.done} de {p.total} sesiones · {p.perWeek} por semana (una vuelta a las rutinas de la carpeta)
      </p>
      {!p.finished && (
        <>
          <div className="sec">Esta semana</div>
          <ul className="program-lifts">
            {m.lifts.map((id) => {
              const plan = liftPlan(data, m, p.week, id);
              return (
                <li key={id}>
                  <b>{names.get(id) ?? id}</b>
                  <span className="small">
                    {targetText(plan.target)}
                    {plan.weight !== undefined && (
                      <>
                        {' '}
                        → <b>{fmtWeight(plan.weight)}</b>
                      </>
                    )}
                  </span>
                  {plan.missingOneRm && <span className="small warn-text">Sin 1RM: escríbelo en Ajustar o elige el peso en la sesión.</span>}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <div className="row actions">
        {p.finished ? (
          <button className="primary grow" onClick={onRestart}>
            Empezar otro bloque
          </button>
        ) : (
          <button className="outline grow" onClick={onAdjust}>
            Ajustar
          </button>
        )}
        <button className="outline grow" onClick={onEnd}>
          Terminar programa
        </button>
      </div>
    </div>
  );
}

function ProgramForm({
  folder,
  initial,
  editing,
  onCancel,
  onSave,
}: {
  folder: RoutineFolder;
  initial?: Mesocycle;
  editing: boolean;
  onCancel: () => void;
  onSave: (m: Mesocycle) => void;
}) {
  const { data } = useStore();
  const routines = programRoutines(data, folder.id);
  const [m, setM] = useState<Mesocycle>(() => initial ?? mesocycleFromTemplate(MESO_TEMPLATES[0].id, routines, data.exercises));
  if (!routines.length)
    return (
      <div className="program">
        <p className="muted">Añade rutinas con ejercicios a esta carpeta: cada rutina será un día del programa.</p>
      </div>
    );
  const byId = new Map(data.exercises.map((e) => [e.id, e]));
  const candidates = [...new Set(routines.flatMap((r) => r.exercises.map((e) => e.exerciseId)))].filter((id) => byId.get(id)?.kind === 'weight_reps');
  const error = mesocycleError(m);
  const setWeek = (i: number, fn: (w: MesoWeek) => void) =>
    setM((cur) => {
      const n = structuredClone(cur);
      fn(n.weeks[i]);
      return n;
    });
  return (
    <div className="program">
      {!editing && (
        <fieldset className="program-templates">
          <legend className="sec">Plantilla</legend>
          {MESO_TEMPLATES.map((t) => (
            <button
              key={t.id}
              className={`line ${m.template === t.id ? 'on' : ''}`}
              aria-pressed={m.template === t.id}
              onClick={() => setM((cur) => ({ ...cur, template: t.id, weeks: structuredClone(t.weeks) }))}
            >
              <span className="grow left">
                <b>{t.name}</b>
                <small className="muted">{t.description}</small>
              </span>
            </button>
          ))}
        </fieldset>
      )}

      <div className="sec">Semanas</div>
      <p className="small muted">Prescripción de los ejercicios principales. El resto sigue la rutina y, en descarga, hace la mitad de series.</p>
      <div className="week-table">
        <div className="week-row head" aria-hidden="true">
          <span>Series</span>
          <span>Reps</span>
          <span>Carga</span>
          <span>Tipo</span>
        </div>
        {m.weeks.map((w, i) => {
          const n = i + 1;
          const byPct = w.main.pct !== undefined;
          return (
            <div key={i} className={`week-row ${w.phase}`}>
              <b className="week-n">Semana {n}</b>
              <select
               
                aria-label={`Fase de la semana ${n}`}
                value={w.phase}
                onChange={(e) =>
                  setWeek(i, (x) => {
                    x.phase = e.target.value as MesoPhase;
                    if (x.phase === 'descarga') x.accessorySets = 0.5;
                    else delete x.accessorySets;
                  })
                }
              >
                {PHASES.map((ph) => (
                  <option key={ph} value={ph}>
                    {PHASE_LABELS[ph]}
                  </option>
                ))}
              </select>
              <NumberField decimals={false} aria-label={`Series de la semana ${n}`} value={w.main.sets} onChange={(v) => setWeek(i, (x) => void (x.main.sets = v ?? 0))} />
              <NumberField decimals={false} aria-label={`Repeticiones de la semana ${n}`} value={w.main.reps} onChange={(v) => setWeek(i, (x) => void (x.main.reps = v ?? 0))} />
              <>
                <NumberField
                  aria-label={`${byPct ? '% de 1RM' : 'RPE'} de la semana ${n}`}
                  value={byPct ? w.main.pct : w.main.rpe}
                  onChange={(v) => setWeek(i, (x) => (byPct ? (x.main.pct = v) : (x.main.rpe = v)))}
                />
                <select
                  aria-label={`Tipo de carga de la semana ${n}`}
                  value={byPct ? 'pct' : 'rpe'}
                  onChange={(e) =>
                    setWeek(i, (x) => {
                      if (e.target.value === 'pct') {
                        x.main.pct = 70;
                        delete x.main.rpe;
                      } else {
                        x.main.rpe = 8;
                        delete x.main.pct;
                      }
                    })
                  }
                >
                  <option value="pct">%</option>
                  <option value="rpe">RPE</option>
                </select>
              </>
            </div>
          );
        })}
      </div>
      <div className="row actions">
        <button className="outline grow" disabled={m.weeks.length >= MAX_WEEKS} onClick={() => setM((cur) => ({ ...cur, weeks: [...cur.weeks, structuredClone(cur.weeks[cur.weeks.length - 1])] }))}>
          Añadir semana
        </button>
        <button className="outline grow" disabled={m.weeks.length <= MIN_WEEKS} onClick={() => setM((cur) => ({ ...cur, weeks: cur.weeks.slice(0, -1) }))}>
          Quitar la última
        </button>
      </div>

      <div className="sec">Ejercicios principales</div>
      <p className="small muted">El peso sale del 1RM antes de empezar: el que escribas o el mejor estimado de los últimos 120 días.</p>
      <ul className="program-lifts edit">
        {candidates.map((id) => {
          const on = m.lifts.includes(id);
          const est = programOneRm(data, { ...m, oneRm: undefined }, id);
          const name = byId.get(id)?.name ?? id;
          return (
            <li key={id}>
              <label className="row">
                <input type="checkbox" checked={on} onChange={(e) => setM((cur) => ({ ...cur, lifts: e.target.checked ? [...cur.lifts, id] : cur.lifts.filter((x) => x !== id) }))} />
                <b className="grow">{name}</b>
              </label>
              {on && (
                <div className="row onerm">
                  <span className="small muted grow">{est ? `Estimado: ${fmtWeight(est.kg)}` : 'Sin 1RM estimado'}</span>
                  <WeightField
                    aria-label={`1RM de ${name}`}
                    placeholder="1RM"
                    kg={m.oneRm?.[id]}
                    onChange={(kg) =>
                      setM((cur) => {
                        const oneRm = { ...cur.oneRm };
                        if (kg) oneRm[id] = kg;
                        else delete oneRm[id];
                        return { ...cur, oneRm };
                      })
                    }
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!candidates.length && <p className="small muted">Las rutinas no tienen ejercicios con peso y repeticiones.</p>}

      {error && (
        <p className="small warn-text" role="alert">
          {error}
        </p>
      )}
      <div className="row actions">
        <button className="outline grow" onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary grow" disabled={!!error} onClick={() => onSave(editing ? m : { ...m, startedAt: new Date().toISOString(), endedAt: undefined })}>
          {editing ? 'Guardar cambios' : 'Empezar programa'}
        </button>
      </div>
    </div>
  );
}
