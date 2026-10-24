// "Tu año": historias a pantalla completa con el resumen anual. Toca a la derecha/izquierda para avanzar/retroceder.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Share2, X } from 'lucide-react';
import { yearWrapped, type YearWrapped } from '../../../shared/wrapped';
import { shareOrDownload, useStore } from '../store';
import { fmtWeight, toUnit, weightUnit } from '../../../shared/units';

const SLIDE_MS = 5500;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Número que cuenta desde 0 al aparecer.
function Count({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const [v, setV] = useState(() => (reduced() ? to : 0));
  useEffect(() => {
    if (reduced()) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1200);
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v.toLocaleString('es-ES', { maximumFractionDigits: decimals, minimumFractionDigits: 0 })}</>;
}

type Slide = { tone: string; body: ReactNode };

function slides(y: YearWrapped, onShare: () => void): Slide[] {
  const out: Slide[] = [
    {
      tone: 'ember',
      body: (
        <>
          <p className="kicker">Workstation</p>
          <h2 className="huge">Tu {y.year}</h2>
          <p className="lead">Un año de esfuerzo, en unas cifras.</p>
        </>
      ),
    },
    {
      tone: 'power',
      body: (
        <>
          <p className="kicker">Constancia</p>
          <h2 className="huge">
            <Count to={y.workouts} />
          </h2>
          <p className="lead">entrenamientos</p>
          <div className="w-row">
            <span>
              <b>
                <Count to={y.hours} decimals={1} />
              </b>{' '}
              horas
            </span>
            <span>
              <b>
                <Count to={y.daysTrained} />
              </b>{' '}
              días activos
            </span>
          </div>
        </>
      ),
    },
    {
      tone: 'volt',
      body: (
        <>
          <p className="kicker">{weightUnit() === 'lb' ? 'Libras' : 'Toneladas'}</p>
          <h2 className="huge">
            {weightUnit() === 'lb' ? (
              <>
                <Count to={Math.round(toUnit(y.volumeKg) / 100) / 10} decimals={1} />k lb
              </>
            ) : (
              <>
                <Count to={y.volumeKg / 1000} decimals={1} /> t
              </>
            )}
          </h2>
          <p className="lead">levantadas en total, como {y.equivalence}.</p>
          <div className="w-row">
            <span>
              <b>
                <Count to={y.sets} />
              </b>{' '}
              series
            </span>
            <span>
              <b>
                <Count to={y.reps} />
              </b>{' '}
              reps
            </span>
          </div>
        </>
      ),
    },
  ];
  if (y.topExercise)
    out.push({
      tone: 'ember',
      body: (
        <>
          <p className="kicker">Tu ejercicio</p>
          <h2 className="big">{y.topExercise.name}</h2>
          <p className="lead">{y.topExercise.sessions} sesiones. No hubo otro igual.</p>
          {y.topMuscle && (
            <p className="w-note">
              Músculo más trabajado: <b>{y.topMuscle.label}</b> ({Math.round(y.topMuscle.sets)} series)
            </p>
          )}
        </>
      ),
    });
  if (y.biggestGain || y.prs)
    out.push({
      tone: 'power',
      body: (
        <>
          <p className="kicker">Más fuerte</p>
          <h2 className="huge">
            <Count to={y.prs} />
          </h2>
          <p className="lead">récords batidos</p>
          {y.biggestGain && (
            <p className="w-note">
              Tu mayor salto: <b>{y.biggestGain.name}</b>, de {fmtWeight(y.biggestGain.from, { decimals: 0 })} a <b>{fmtWeight(y.biggestGain.to, { decimals: 0 })}</b> de 1RM estimado (+
              {fmtWeight(y.biggestGain.to - y.biggestGain.from, { decimals: 0 })}).
            </p>
          )}
        </>
      ),
    });
  if (y.bestMonth)
    out.push({
      tone: 'volt',
      body: (
        <>
          <p className="kicker">Tus hábitos</p>
          <h2 className="big">{y.bestMonth.label}</h2>
          <p className="lead">fue tu mejor mes, con {y.bestMonth.workouts} entrenos.</p>
          <p className="w-note">
            {y.favoriteDay && (
              <>
                Tu día favorito: <b>el {y.favoriteDay}</b>.{' '}
              </>
            )}
            {y.timeOfDay && (
              <>
                Entrenas sobre todo <b>{y.timeOfDay === 'mediodía' ? 'a mediodía' : `por la ${y.timeOfDay}`}</b>.{' '}
              </>
            )}
            Racha más larga: <b>{y.longestStreak} semanas</b> seguidas.
          </p>
        </>
      ),
    });
  out.push({
    tone: 'ember',
    body: (
      <>
        <p className="kicker">Y esto sigue</p>
        <h2 className="big">A por el {y.year + 1} 💪</h2>
        <button className="w-share" onClick={(e) => (e.stopPropagation(), onShare())}>
          <Share2 size={18} /> Compartir mi año
        </button>
      </>
    ),
  });
  return out;
}

export default function Wrapped({ year, onClose }: { year: number; onClose: () => void }) {
  const { data } = useStore();
  const y = yearWrapped(data, year);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const share = async () => shareOrDownload(await (await import('../share')).wrappedImage(y), `workstation-${y.year}.png`, `Mi ${y.year} en Workstation`);
  const list = slides(y, share);
  const last = list.length - 1;
  const held = useRef(0);

  useEffect(() => {
    if (paused || i === last) return;
    const t = setTimeout(() => setI((n) => Math.min(last, n + 1)), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, paused, last]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((n) => Math.min(last, n + 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [last, onClose]);

  const s = list[i];
  return createPortal(
    <div
      className={`wrapped tone-${s.tone}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Resumen de ${y.year}`}
      onPointerDown={() => ((held.current = Date.now()), setPaused(true))}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
      onClick={(e) => {
        if (Date.now() - held.current > 350) return; // mantener pulsado = pausa, no avanza
        const left = e.clientX < window.innerWidth / 3;
        setI((n) => (left ? Math.max(0, n - 1) : Math.min(last, n + 1)));
      }}
    >
      <div className="w-bars">
        {list.map((_, k) => (
          <div key={k} className="w-bar">
            <div className={k < i ? 'done' : k === i ? `run ${paused ? 'paused' : ''}` : ''} style={k === i ? { animationDuration: `${SLIDE_MS}ms` } : undefined} />
          </div>
        ))}
      </div>
      <button className="w-close" aria-label="Cerrar" onClick={(e) => (e.stopPropagation(), onClose())}>
        <X size={22} />
      </button>
      <div key={i} className="w-slide" aria-live="polite">
        {s.body}
      </div>
      <p className="w-hint">
        {i + 1} / {list.length}
      </p>
    </div>,
    document.body,
  );
}
