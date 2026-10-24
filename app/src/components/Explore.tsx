// Programas predefinidos para guardar como rutinas (se carga bajo demanda).
import { useState } from 'react';
import { PROGRAMS, instantiateProgram, type ProgramTemplate } from '../../../shared/templates';
import { useStore } from '../store';
import { Back, ExerciseMedia } from './ui';

export default function Explore({ onBack }: { onBack: () => void }) {
  const { data, update } = useStore();
  const [sel, setSel] = useState<ProgramTemplate | null>(null);
  const exMap = new Map(data.exercises.map((e) => [e.id, e]));
  if (sel) {
    return (
      <section>
        <Back onClick={() => setSel(null)} />
        <h1>{sel.name}</h1>
        <p className="muted small">
          {sel.level} · {sel.daysPerWeek} días/semana · {sel.goal} · {sel.equipment}
        </p>
        <p>{sel.description}</p>
        {sel.routines.map((r) => (
          <div key={r.name} className="card">
            <b>{r.name}</b>
            {r.exercises.map(([id, sets, reps]) => (
              <div key={id} className="row small exline">
                <ExerciseMedia exercise={exMap.get(id)} size="thumb" />
                <span className="grow">{exMap.get(id)?.name ?? id}</span>
                <span className="muted">
                  {sets} × {reps}
                </span>
              </div>
            ))}
          </div>
        ))}
        <button
          className="primary full"
          onClick={() => {
            const { folder, routines } = instantiateProgram(sel);
            update((d) => {
              d.folders.push(folder);
              d.routines.push(...routines);
            });
            alert(`Programa guardado en la carpeta "${folder.name}".`);
            onBack();
          }}
        >
          Guardar programa en mis rutinas
        </button>
        <p className="muted small">Después ajusta los pesos en cada rutina o simplemente empieza: la app recordará lo que levantes.</p>
      </section>
    );
  }
  return (
    <section>
      <Back onClick={onBack} />
      <h1>Explorar programas</h1>
      {PROGRAMS.map((p) => (
        <button key={p.id} className="card full left" onClick={() => setSel(p)}>
          <b>{p.name}</b>
          <div className="muted small">
            {p.level} · {p.daysPerWeek} días/semana · {p.goal}
          </div>
          <div className="small">{p.routines.map((r) => r.name).join(' · ')}</div>
        </button>
      ))}
      <p className="muted small">¿Quieres algo a medida? Pídeselo al Coach IA (en Perfil): «créame un programa de 4 días para ganar fuerza en banca».</p>
    </section>
  );
}
