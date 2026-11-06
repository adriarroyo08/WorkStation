import { useEffect, useMemo, useState } from 'react';
import { catalogExtras } from '../../../shared/catalog';
import { catalogToExercise, loadCatalog, type CatalogItem } from '../catalog';
import { EQUIPMENT, MUSCLE_LABELS, catalogLabel } from '../../../shared/exercises';
import { MuscleThumb } from './BodyMap';
import type { Exercise, MuscleGroup } from '../../../shared/types';
import { cap, useStore } from '../store';
import ExerciseEditor from './ExerciseEditor';
import { ExerciseMedia, Sheet, useGrowingList } from './ui';

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
        <select aria-label="Filtrar por músculo" value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup | '')}>
          <option value="">Todos los músculos</option>
          {Object.entries(MUSCLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select aria-label="Filtrar por material" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
          <option value="">Todo el material</option>
          {EQUIPMENT.map((k) => (
            <option key={k} value={k}>
              {cap(k)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
  return { q, list, filters, muscle, setMuscle };
}

export function ExerciseRow({ e, right, onClick, selected }: { e: Exercise; right?: React.ReactNode; onClick?: () => void; selected?: boolean }) {
  return (
    <button className={`exrow ${selected ? 'selected' : ''}`} onClick={onClick}>
      <ExerciseMedia exercise={e} size="thumb" />
      <span className="grow">
        <b>{e.name}</b>
        <small className="muted">
          {MUSCLE_LABELS[e.muscle]} · {catalogLabel(e.equipment)}
        </small>
      </span>
      <MuscleThumb exercise={e} />
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
  const { data, update } = useStore();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  useEffect(() => {
    loadCatalog().then(setCatalog, () => {}); // sin red: solo la biblioteca
  }, []);
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
    // Una sola lista: recientes primero y después todos (biblioteca y catálogo) por orden alfabético.
    return [...data.exercises, ...catalogExtras(data.exercises, catalog).map(catalogToExercise)].sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name, 'es'));
  }, [data.exercises, recent, catalog]);
  const { q, list, filters } = useExerciseFilter(sorted);
  const { shown, end } = useGrowingList(list);
  const own = new Set(data.exercises.map((e) => e.id));
  const byId = new Map(sorted.map((e) => [e.id, e]));
  // Los del catálogo pasan a la biblioteca al elegirlos.
  const pick = (es: Exercise[], superset: boolean) => {
    const add = es.filter((e) => !own.has(e.id));
    if (add.length) update((d) => void d.exercises.push(...add.filter((e) => !d.exercises.some((x) => x.id === e.id)).map((e) => structuredClone(e))));
    onPick(es, superset);
  };

  if (creating)
    return (
      <Sheet title="Nuevo ejercicio" onClose={() => setCreating(false)}>
        <ExerciseEditor initialName={q} onSaved={(e) => onPick([e], false)} />
      </Sheet>
    );

  return (
    <Sheet
      full
      title={title}
      onClose={onClose}
      header={
        <>
          {filters}
          {!single && (
            <label className="toggle small">
              <span className="grow">Selección múltiple</span>
              <input type="checkbox" checked={multi} onChange={(e) => (setMulti(e.target.checked), setSel([]))} />
            </label>
          )}
        </>
      }
      footer={
        multi && sel.length > 0 ? (
          <div className="row">
            <button
              className="primary grow"
              onClick={() =>
                pick(
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
                  pick(
                    sel.map((id) => byId.get(id)!),
                    true,
                  )
                }
              >
                Como superserie
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="list picker-list">
        <button className="item accent" onClick={() => setCreating(true)}>
          + Crear ejercicio personalizado{q ? ` “${q}”` : ''}
        </button>
        {shown.map((e, i) => (
          <div key={e.id}>
            {i === 0 && recent.includes(e.id) && !q && <h3 className="muted small">Recientes</h3>}
            {i > 0 && recent.includes(list[i - 1].id) && !recent.includes(e.id) && !q && <h3 className="muted small">Todos</h3>}
            <ExerciseRow
              e={e}
              selected={sel.includes(e.id)}
              right={multi ? <span className="checkmark">{sel.includes(e.id) ? sel.indexOf(e.id) + 1 : ''}</span> : undefined}
              onClick={() => (multi ? setSel((s) => (s.includes(e.id) ? s.filter((x) => x !== e.id) : [...s, e.id])) : pick([e], false))}
            />
          </div>
        ))}
        {end}
      </div>
    </Sheet>
  );
}
