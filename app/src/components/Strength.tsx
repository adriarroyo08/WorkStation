// Niveles de fuerza: tarjeta en la ficha del ejercicio y resumen en el perfil.
import { useState } from 'react';
import { Gauge } from 'lucide-react';
import { LEVELS, STANDARDS, latestBodyweight, strengthLevels, type StrengthLevel } from '../../../shared/strength';
import { uid } from '../../../shared/types';
import { useStore } from '../store';

const fmtVal = (l: StrengthLevel, v = l.value) => (l.unit === 'kg' ? `${Math.round(v * 10) / 10} kg` : `${v} reps`);
const levelName = (i: number) => (i < 0 ? 'Iniciándote' : LEVELS[i]);

// Escala de cinco tramos; el actual se rellena según el progreso hacia el siguiente.
function LevelScale({ l }: { l: StrengthLevel }) {
  return (
    <div className="lvl-scale" role="img" aria-label={`Nivel ${levelName(l.level)}`}>
      {LEVELS.map((name, i) => (
        <div key={name} className={`lvl-seg l${i} ${i <= l.level ? 'on' : ''}`}>
          {i === l.level + 1 && <div className="lvl-fill" style={{ width: `${l.progress * 100}%` }} />}
          <small>{name}</small>
        </div>
      ))}
    </div>
  );
}

function SetupBodyweight() {
  const { update, settings, setSettings } = useStore();
  const [bw, setBw] = useState('');
  return (
    <div className="lvl-setup">
      <p className="small muted">Indica tu peso corporal para comparar tu fuerza con los estándares.</p>
      <div className="row">
        <input inputMode="decimal" placeholder="Peso (kg)" aria-label="Peso corporal (kg)" value={bw} onChange={(e) => setBw(e.target.value)} />
        <SexToggle value={settings.sex ?? 'm'} onChange={(sex) => setSettings({ sex })} />
        <button
          className="primary"
          disabled={!(Number(bw.replace(',', '.')) > 0)}
          onClick={() => update((d) => void d.measurements.push({ id: uid(), date: new Date().toISOString(), bodyweight: Number(bw.replace(',', '.')) }))}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

function SexToggle({ value, onChange }: { value: 'm' | 'f'; onChange: (v: 'm' | 'f') => void }) {
  return (
    <div className="segmented mini" role="group" aria-label="Estándares">
      {(['m', 'f'] as const).map((s) => (
        <button key={s} className={value === s ? 'on' : ''} onClick={() => onChange(s)} aria-pressed={value === s}>
          {s === 'm' ? 'Hombre' : 'Mujer'}
        </button>
      ))}
    </div>
  );
}

/** Tarjeta de nivel para un ejercicio con estándar (no se muestra si no lo tiene o aún no hay series). */
export function StrengthCard({ exerciseId }: { exerciseId: string }) {
  const { data, settings, setSettings } = useStore();
  const std = STANDARDS[exerciseId];
  if (!std) return null;
  const l = strengthLevels(data).find((x) => x.exerciseId === exerciseId);
  const needsBw = std.by === 'ratio' && !latestBodyweight(data);
  if (!l && !needsBw) return null;
  return (
    <div className="card strength">
      <div className="row">
        <Gauge size={18} className="tile-ico inline" />
        <h3 className="grow">Nivel de fuerza</h3>
        {l && <SexToggle value={settings.sex ?? 'm'} onChange={(sex) => setSettings({ sex })} />}
      </div>
      {needsBw ? (
        <SetupBodyweight />
      ) : (
        l && (
          <>
            <p className="lvl-head">
              <b className={`lvl-name l${Math.max(0, l.level)}`}>{levelName(l.level)}</b>
              <span className="muted small">
                {fmtVal(l)}
                {l.ratio ? ` · ${l.ratio}× tu peso` : ''}
              </span>
            </p>
            <LevelScale l={l} />
            <p className="small muted">
              {l.next ? (
                <>
                  Te faltan <b>{fmtVal(l, l.next.missing)}</b> para {l.next.level} ({fmtVal(l, l.next.target)}).
                </>
              ) : (
                '¡Nivel élite! Estás entre los más fuertes.'
              )}{' '}
              Orientativo, según {l.unit === 'kg' ? '1RM estimado y peso corporal' : 'tus mejores repeticiones'}.
            </p>
          </>
        )
      )}
    </div>
  );
}

/** Resumen de niveles en el perfil. */
export function StrengthOverview({ onExercise }: { onExercise: (id: string) => void }) {
  const { data } = useStore();
  const levels = strengthLevels(data);
  if (!levels.length) return null;
  return (
    <div className="card strength">
      <div className="row">
        <Gauge size={18} className="tile-ico inline" />
        <h3 className="grow">Niveles de fuerza</h3>
      </div>
      {levels.map((l) => (
        <button key={l.exerciseId} className="plain row full left exline" onClick={() => onExercise(l.exerciseId)}>
          <span className="grow">{l.exerciseName}</span>
          <span className={`lvl-pill l${Math.max(0, l.level)}`}>{levelName(l.level)}</span>
        </button>
      ))}
      {!latestBodyweight(data) && <p className="small muted">Añade tu peso corporal en Medidas para ver los niveles de los ejercicios con barra.</p>}
    </div>
  );
}
