// Ficha rápida de un ejercicio en una hoja: cómo se hace (imágenes e instrucciones) y músculos que trabaja.
// Se abre desde una rutina o en mitad del entreno sin salir de la pantalla.
import { ChevronRight, Pin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EXERCISE_KIND_LABELS, catalogLabel } from '../../../shared/exercises';
import { personalRecords, formatDuration } from '../../../shared/stats';
import { fmtWeight } from '../../../shared/units';
import { loadCatalog } from '../catalog';
import { cap, useStore } from '../store';
import { MuscleMap } from './BodyMap';
import { ExerciseMedia, Sheet } from './ui';

export default function ExerciseInfo({ id, onClose, onFull }: { id: string; onClose: () => void; onFull?: (id: string) => void }) {
  const { data } = useStore();
  const e = data.exercises.find((x) => x.id === id);
  const own = e?.instructions?.length ? e.instructions : null;
  const [fetched, setFetched] = useState<{ media: string; steps: string[] } | null>(null);
  useEffect(() => {
    if (own || !e?.media) return;
    const media = e.media;
    let live = true;
    loadCatalog()
      .then((c) => live && setFetched({ media, steps: c.find((x) => x.id === media)?.instructions ?? [] }))
      .catch(() => live && setFetched({ media, steps: [] }));
    return () => {
      live = false;
    };
  }, [own, e?.media]);
  if (!e) return null;
  const steps = own ?? (e.media ? (fetched?.media === e.media ? fetched.steps : null) : []);
  const pr = personalRecords(data).find((p) => p.exerciseId === id);
  const best =
    pr &&
    (e.kind === 'weight_reps'
      ? pr.bestWeight > 0 && `Mejor peso: ${fmtWeight(pr.bestWeight)}`
      : e.kind === 'duration'
        ? pr.maxDuration > 0 && `Mejor tiempo: ${formatDuration(pr.maxDuration)}`
        : e.kind === 'distance'
          ? pr.maxDistance > 0 && `Mejor distancia: ${pr.maxDistance} m`
          : pr.maxReps > 0 && `Máx. reps: ${pr.maxReps}`);

  return (
    <Sheet title={e.name} onClose={onClose}>
      <div className="exinfo">
        <p className="muted small">
          {cap(catalogLabel(e.equipment))} · {EXERCISE_KIND_LABELS[e.kind]}
          {best ? ` · ${best}` : ''}
        </p>
        <ExerciseMedia exercise={e} />
        {e.stickyNote && (
          <p className="sticky-note small">
            <Pin size={16} className="ico" /> {e.stickyNote}
          </p>
        )}
        <div className="sec">Músculos que trabaja</div>
        <MuscleMap exercise={e} />
        <div className="sec">Cómo se hace</div>
        {steps === null ? (
          <p className="muted small">Cargando instrucciones…</p>
        ) : steps.length ? (
          <ol className="exinfo-steps">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        ) : (
          <p className="muted small">Sin instrucciones para este ejercicio.</p>
        )}
        {onFull && (
          <button className="line" onClick={() => onFull(id)}>
            <span className="grow left">
              <b>Ver ficha completa</b>
              <small className="muted">Historial, progreso y récords</small>
            </span>
            <ChevronRight size={16} className="muted" aria-hidden="true" />
          </button>
        )}
      </div>
    </Sheet>
  );
}
