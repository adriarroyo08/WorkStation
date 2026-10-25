import { useState } from 'react';
import { EQUIPMENT, EXERCISE_KIND_LABELS, MUSCLE_LABELS } from '../../../shared/exercises';
import type { Exercise, ExerciseKind, MuscleGroup } from '../../../shared/types';
import { uid } from '../../../shared/types';
import { useStore } from '../store';

export default function ExerciseEditor({ initial, initialName = '', onSaved }: { initial?: Exercise; initialName?: string; onSaved: (e: Exercise) => void }) {
  const { update } = useStore();
  const [e, setE] = useState<Exercise>(initial ?? { id: `custom-${uid()}`, name: initialName, muscle: 'pecho', equipment: 'barra', kind: 'weight_reps', custom: true, secondary: [] });
  const save = () => {
    if (!e.name.trim()) return alert('Ponle un nombre');
    update((d) => {
      const i = d.exercises.findIndex((x) => x.id === e.id);
      if (i >= 0) d.exercises[i] = e;
      else d.exercises.push(e);
    });
    onSaved(e);
  };
  return (
    <div>
      <label>
        Nombre
        <input value={e.name} onChange={(ev) => setE({ ...e, name: ev.target.value })} autoFocus />
      </label>
      <label>
        Tipo
        <select value={e.kind} onChange={(ev) => setE({ ...e, kind: ev.target.value as ExerciseKind })}>
          {Object.entries(EXERCISE_KIND_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Material
        <select value={e.equipment} onChange={(ev) => setE({ ...e, equipment: ev.target.value })}>
          {EQUIPMENT.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      <label>
        Músculo principal
        <select value={e.muscle} onChange={(ev) => setE({ ...e, muscle: ev.target.value as MuscleGroup })}>
          {Object.entries(MUSCLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label id="ex-secondary">Músculos secundarios</label>
      <div className="chips" role="group" aria-labelledby="ex-secondary">
        {(Object.keys(MUSCLE_LABELS) as MuscleGroup[])
          .filter((m) => m !== e.muscle)
          .map((m) => (
            <button
              key={m}
              className={e.secondary?.includes(m) ? 'on' : ''}
              aria-pressed={!!e.secondary?.includes(m)}
              onClick={() => setE({ ...e, secondary: e.secondary?.includes(m) ? e.secondary.filter((x) => x !== m) : [...(e.secondary ?? []), m] })}
            >
              {MUSCLE_LABELS[m]}
            </button>
          ))}
      </div>
      <button className="primary full" onClick={save}>
        Guardar ejercicio
      </button>
    </div>
  );
}
