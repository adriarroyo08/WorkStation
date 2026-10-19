import { useMemo, useState } from 'react';
import { EQUIPMENT, MUSCLE_LABELS } from '../../../shared/exercises';
import type { Exercise, MuscleGroup } from '../../../shared/types';
import { useStore } from '../store';
import ExerciseEditor from './ExerciseEditor';
import { ExerciseMedia, Sheet } from './ui';

export function useExerciseFilter(exercises: Exercise[]) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('');
  const [equipment, setEquipment] = useState('');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const list = useMemo(
    () => exercises.filter((e) => (!muscle || e.muscle === muscle || e.secondary?.includes(muscle)) && (!equipment || e.equipment === equipment) && norm(e.name).includes(norm(q))),
    [exercises, q, muscle, equipment],
  );
  const filters = (
    <>
      <input placeholder="Buscar ejercicio…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="row">
        <select value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup | '')}>
          <option value="">Todos los músculos</option>
          {Object.entries(MUSCLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
          <option value="">Todo el material</option>
          {EQUIPMENT.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>
    </>
  );
  return { q, list, filters };
}

export function ExerciseRow({ e, right, onClick, selected }: { e: Exercise; right?: React.ReactNode; onClick?: () => void; selected?: boolean }) {
  return (
    <button className={`exrow ${selected ? 'selected' : ''}`} onClick={onClick}>
      <ExerciseMedia exercise={e} size="thumb" />
      <span className="grow">
        <b>{e.name}</b>
        <small className="muted">
          {MUSCLE_LABELS[e.muscle]} · {e.equipment}
        </small>
      </span>
      {right}
    </button>
  );
}

// Selector: un toque añade; con "Selección múltiple" puedes añadir varios o como superserie.
export default function ExercisePicker({
  onPick,
  onClose,
  title = 'Añadir ejercicio',
  single = false,
}: {
  onPick: (es: Exercise[], superset: boolean) => void;
  onClose: () => void;
  title?: string;
  single?: boolean;
}) {
  const { data } = useStore();
  const [sel, setSel] = useState<string[]>([]);
  const [multi, setMulti] = useState(false);
  const [creating, setCreating] = useState(false);
  const recent = useMemo(() => {
    const seen: string[] = [];
    for (const w of [...data.workouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt))) for (const e of w.exercises) if (!seen.includes(e.exerciseId)) seen.push(e.exerciseId);
    return seen;
  }, [data.workouts]);
  const sorted = useMemo(() => {
    const rank = (id: string) => {
      const i = recent.indexOf(id);
      return i < 0 ? 1e6 : i;
    };
    return [...data.exercises].sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name));
  }, [data.exercises, recent]);
  const { q, list, filters } = useExerciseFilter(sorted);
  const byId = new Map(data.exercises.map((e) => [e.id, e]));

  if (creating)
    return (
      <Sheet title="Nuevo ejercicio" onClose={() => setCreating(false)}>
        <ExerciseEditor initialName={q} onSaved={(e) => onPick([e], false)} />
      </Sheet>
    );

  return (
    <Sheet title={title} onClose={onClose}>
      {filters}
      {!single && (
        <label className="toggle small">
          <span className="grow">Selección múltiple</span>
          <input type="checkbox" checked={multi} onChange={(e) => (setMulti(e.target.checked), setSel([]))} />
        </label>
      )}
      <div className="list">
        <button className="item accent" onClick={() => setCreating(true)}>
          + Crear ejercicio personalizado{q ? ` “${q}”` : ''}
        </button>
        {list.map((e, i) => (
          <div key={e.id}>
            {i === 0 && recent.includes(e.id) && !q && <h3 className="muted small">Recientes</h3>}
            {i > 0 && recent.includes(list[i - 1].id) && !recent.includes(e.id) && !q && <h3 className="muted small">Todos</h3>}
            <ExerciseRow
              e={e}
              selected={sel.includes(e.id)}
              right={multi ? <span className="checkmark">{sel.includes(e.id) ? sel.indexOf(e.id) + 1 : ''}</span> : undefined}
              onClick={() => (multi ? setSel((s) => (s.includes(e.id) ? s.filter((x) => x !== e.id) : [...s, e.id])) : onPick([e], false))}
            />
          </div>
        ))}
      </div>
      {multi && sel.length > 0 && (
        <div className="row picker-actions">
          <button
            className="primary grow"
            onClick={() =>
              onPick(
                sel.map((id) => byId.get(id)!),
                false,
              )
            }
          >
            Añadir {sel.length}
          </button>
          {sel.length > 1 && (
            <button
              className="primary grow"
              onClick={() =>
                onPick(
                  sel.map((id) => byId.get(id)!),
                  true,
                )
              }
            >
              Como superserie
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
