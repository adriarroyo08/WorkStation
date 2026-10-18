import { useState } from 'react';
import { MUSCLE_LABELS } from '../../../shared/exercises';
import type { Exercise, MuscleGroup } from '../../../shared/types';
import { uid } from '../../../shared/types';
import { useStore } from '../store';

export default function ExercisePicker({ onPick, onClose }: { onPick: (e: Exercise) => void; onClose: () => void }) {
  const { data, update } = useStore();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('');
  const list = data.exercises
    .filter((e) => (!muscle || e.muscle === muscle) && e.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const createCustom = () => {
    const ex: Exercise = { id: `custom-${uid()}`, name: q.trim(), muscle: muscle || 'cuerpo_completo', equipment: 'otro', kind: 'weight_reps', custom: true };
    update((d) => void d.exercises.push(ex));
    onPick(ex);
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <input autoFocus placeholder="Buscar ejercicio…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <select value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup | '')}>
          <option value="">Todos los músculos</option>
          {Object.entries(MUSCLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="list">
          {list.map((e) => (
            <button key={e.id} className="item" onClick={() => onPick(e)}>
              <b>{e.name}</b>
              <small className="muted">
                {MUSCLE_LABELS[e.muscle]} · {e.equipment}
              </small>
            </button>
          ))}
          {q.trim() && !list.some((e) => e.name.toLowerCase() === q.trim().toLowerCase()) && (
            <button className="item accent" onClick={createCustom}>
              + Crear “{q.trim()}”
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
