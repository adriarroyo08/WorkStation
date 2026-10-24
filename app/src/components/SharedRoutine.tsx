// Compartir rutinas por enlace (#rutina=…) y pantalla para guardar la que te envían.
import { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import { decodeRoutine, encodeRoutine, importSharedRoutine, type SharedRoutine } from '../../../shared/routine-share';
import type { Routine } from '../../../shared/types';
import { workoutFromRoutine } from '../../../shared/data';
import { fmtWeight } from '../../../shared/units';
import { startWorkout } from '../controller';
import { useStore } from '../store';
import { toast } from '../toast';
import { ExerciseMedia, Sheet } from './ui';

const PUBLIC_URL = 'https://adriarroyo08.github.io/WorkStation/';
const HASH = '#rutina=';

// En la app Android la web se sirve desde un origen interno: el enlace apunta a la versión publicada.
const baseUrl = () => (location.protocol.startsWith('http') && !location.hostname.endsWith('androidplatform.net') ? `${location.origin}${location.pathname}` : PUBLIC_URL);

export async function shareRoutineLink(r: Routine, exercises: Parameters<typeof encodeRoutine>[1]) {
  const url = `${baseUrl()}${HASH}${await encodeRoutine(r, exercises)}`;
  const text = `Rutina "${r.name}" en Workstation`;
  if (navigator.share) {
    await navigator.share({ title: r.name, text, url }).catch(() => {});
  } else {
    await navigator.clipboard.writeText(url);
    toast.show('Enlace copiado: quien lo abra podrá guardar la rutina');
  }
}

/** Si la app se abre con #rutina=…, muestra la rutina y permite guardarla. */
export function SharedRoutineImport() {
  const store = useStore();
  const [shared, setShared] = useState<SharedRoutine | null>(null);
  useEffect(() => {
    const read = () => {
      if (!location.hash.startsWith(HASH)) return;
      const code = location.hash.slice(HASH.length);
      history.replaceState(null, '', location.pathname + location.search); // el enlace se usa una vez
      decodeRoutine(code, store.data.exercises)
        .then(setShared)
        .catch((e: Error) => toast.show(e.message));
    };
    read();
    addEventListener('hashchange', read);
    return () => removeEventListener('hashchange', read);
    // Solo al abrir la app o al cambiar el hash; los ejercicios del usuario no hacen falta para mostrarla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!shared) return null;

  const save = (start: boolean) => {
    let saved: Routine | undefined;
    store.update((d) => void (saved = importSharedRoutine(d, shared)));
    setShared(null);
    toast.show(`Rutina "${shared.name}" guardada`);
    if (start && saved) startWorkout(store, workoutFromRoutine(saved));
  };
  const exById = new Map(store.data.exercises.map((e) => [e.id, e]));
  return (
    <Sheet title="Rutina compartida" onClose={() => setShared(null)}>
      <p className="shared-head">
        <Link2 size={18} className="tile-ico inline" /> Te han enviado <b>{shared.name}</b>
      </p>
      {shared.notes && <p className="small muted">{shared.notes}</p>}
      <div className="list">
        {shared.exercises.map((e, i) => (
          <div key={i} className="row exline">
            <ExerciseMedia exercise={exById.get(e.exerciseId)} size="thumb" />
            <span className="grow">
              <b>{e.name}</b>
              {e.superset && <small className="muted"> · superserie</small>}
            </span>
            <span className="small muted">
              {e.sets.length} × {e.sets[0]?.durationSec ? `${e.sets[0].durationSec}s` : (e.sets[0]?.reps ?? '–')}
              {e.sets[0]?.weight ? ` · ${fmtWeight(e.sets[0].weight)}` : ''}
            </span>
          </div>
        ))}
      </div>
      {shared.custom.length > 0 && <p className="small muted">Incluye {shared.custom.length} ejercicio(s) personalizado(s) que se añadirán a tu biblioteca.</p>}
      <button className="primary full" onClick={() => save(false)}>
        Guardar en mis rutinas
      </button>
      {!store.active && (
        <button className="ghost full" onClick={() => save(true)}>
          Guardar y empezar ahora
        </button>
      )}
    </Sheet>
  );
}
