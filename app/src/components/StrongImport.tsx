import { useEffect, useMemo, useRef, useState } from 'react';
import { plural } from '../../../shared/plural';
import { previewStrongCsv, type StrongOptions } from '../../../shared/strong';
import { snapshot } from '../backups';
import { ask } from '../dialog';
import { useStore } from '../store';
import { Sheet } from './ui';

export default function StrongImport({ csv, onClose }: { csv: string; onClose: () => void }) {
  const { data, replace } = useStore();
  const [options, setOptions] = useState<StrongOptions>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const content = useRef<HTMLDivElement>(null);
  const initial = useMemo(() => previewStrongCsv(data, csv), [data, csv]);
  const preview = useMemo(() => previewStrongCsv(data, csv, options), [data, csv, options]);
  // La hoja mantiene el foco dentro del diálogo y lo devuelve al control de origen.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = content.current?.closest('[role="dialog"]');
    const controls = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), summary') ?? []);
    controls()[0]?.focus();
    const trap = (e: Event) => {
      const key = e as KeyboardEvent;
      if (key.key !== 'Tab') return;
      const items = controls();
      const first = items[0],
        last = items.at(-1);
      if (key.shiftKey && document.activeElement === first) {
        key.preventDefault();
        last?.focus();
      } else if (!key.shiftKey && document.activeElement === last) {
        key.preventDefault();
        first?.focus();
      }
    };
    dialog?.addEventListener('keydown', trap);
    return () => {
      dialog?.removeEventListener('keydown', trap);
      previous?.focus();
    };
  }, []);
  const close = () => {
    if (!busy) onClose();
  };
  const confirm = async () => {
    if (!preview.canConfirm || busy) return;
    setBusy(true);
    setError('');
    try {
      await snapshot(data, 'antes de importar');
      replace(preview.data);
      onClose();
      ask.notice(`${preview.workouts.length === 1 ? 'Importado' : 'Importados'} ${plural(preview.workouts.length, 'entrenamiento')} y ${plural(preview.sets, 'serie')} desde Strong.`);
    } catch (e) {
      setError(`No se ha importado: ${(e as Error).message}`);
      setBusy(false);
    }
  };
  return (
    <Sheet
      title="Vista previa de Strong"
      onClose={close}
      full
      footer={
        <div className="row">
          <button className="outline" onClick={close} disabled={busy}>
            Cancelar
          </button>
          <button className="primary" onClick={confirm} disabled={!preview.canConfirm || busy}>
            {busy ? 'Importando…' : 'Confirmar importación'}
          </button>
        </div>
      }
    >
      <div ref={content}>
        <p>Revisa los datos antes de importar. Se guardará una copia automática de tus datos actuales al confirmar.</p>
        {initial.needsWeightUnit && (
          <label>
            Unidad de peso del CSV
            <select value={options.weightUnit ?? ''} onChange={(e) => setOptions({ ...options, weightUnit: (e.target.value || undefined) as StrongOptions['weightUnit'] })}>
              <option value="">Elige kg o lb</option>
              <option value="kg">Kilos (kg)</option>
              <option value="lb">Libras (lb)</option>
            </select>
            <span className="small muted">Se aplica solo a los pesos sin unidad. Si el archivo mezcla unidades sin identificarlas, corrígelo antes de importar.</span>
          </label>
        )}
        {initial.needsDistanceUnit && (
          <label>
            Unidad de distancia del CSV
            <select value={options.distanceUnit ?? ''} onChange={(e) => setOptions({ ...options, distanceUnit: (e.target.value || undefined) as StrongOptions['distanceUnit'] })}>
              <option value="">Elige la unidad</option>
              <option value="m">Metros</option>
              <option value="km">Kilómetros</option>
              <option value="mi">Millas</option>
            </select>
          </label>
        )}
        <div role="status">
          <p>
            {plural(preview.workouts.length, 'entrenamiento')} · {plural(preview.sets, 'serie')} ·{' '}
            {plural(preview.customExercises, 'ejercicio personalizado nuevo', 'ejercicios personalizados nuevos')}.
          </p>
          <p>{plural(preview.skippedRows, 'registro omitido', 'registros omitidos')}.</p>
        </div>
        {preview.unsupportedColumns.length > 0 && <p>Columnas no compatibles (no se importarán): {preview.unsupportedColumns.join(', ')}.</p>}
        {preview.diagnostics.length > 0 && (
          <div className="card">
            <h2>Diagnóstico</h2>
            <ul>
              {preview.diagnostics.slice(0, 100).map((message, i) => (
                <li key={i}>{message}</li>
              ))}
            </ul>
            {preview.diagnostics.length > 100 && <p>Y {preview.diagnostics.length - 100} diagnósticos más. Corrige el CSV y vuelve a seleccionarlo para revisarlos.</p>}
          </div>
        )}
        {preview.workouts.map((workout) => (
          <details className="card" key={workout.id}>
            <summary>
              {workout.name} · {new Date(workout.startedAt).toLocaleString('es-ES')}
            </summary>
            <p>{workout.endedAt ? `${Math.round((Date.parse(workout.endedAt) - Date.parse(workout.startedAt)) / 1000)} s de duración` : 'Sin duración de sesión'}</p>
            {workout.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{workout.notes}</p>}
            <ul>
              {workout.exercises.map((exercise, index) => (
                <li key={index}>
                  {preview.data.exercises.find((e) => e.id === exercise.exerciseId)?.name} · {plural(exercise.sets.length, 'serie')}
                  {exercise.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{exercise.notes}</p>}
                </li>
              ))}
            </ul>
          </details>
        ))}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
