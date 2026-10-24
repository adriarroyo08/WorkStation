// Tour de bienvenida: pantallas a pantalla completa con una maqueta en HTML/CSS de la propia UI.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useCloud } from '../cloud';
import { ONBOARDED_KEY } from '../../../shared/onboarding';

const Row = ({ a, b, hot }: { a: string; b: string; hot?: boolean }) => (
  <div className={`onb-row${hot ? ' hot' : ''}`}>
    <span>{a}</span>
    <span>{b}</span>
  </div>
);

const SCREENS: { title: string; text: string; art: ReactNode }[] = [
  {
    title: 'Bienvenido a Workstation',
    text: 'Tu diario de entrenamiento: rutinas, series, descansos y progreso, todo en tu dispositivo.',
    art: <div className="onb-logo">Workstation</div>,
  },
  {
    title: 'Crea tus rutinas',
    text: 'Agrupa tus ejercicios, series y descansos en una rutina, o elige un programa hecho en Explorar.',
    art: (
      <>
        <Row a="Torso A" b="5 ejercicios" />
        <Row a="Pierna A" b="4 ejercicios" />
        <Row a="Programa Torso / Pierna" b="Explorar" hot />
      </>
    ),
  },
  {
    title: 'Registra cada serie',
    text: 'Añade ejercicios y anota peso × reps. Marca la serie al terminarla y el descanso arranca solo; te avisamos cuando toca la siguiente.',
    art: (
      <>
        <Row a="Press de banca" b="80 kg × 8" />
        <Row a="Serie 2" b="80 kg × 8" />
        <Row a="Descanso" b="1:24" hot />
      </>
    ),
  },
  {
    title: 'Mira tu progreso',
    text: 'En Perfil tienes tu progreso, informes y récords; en Historial, cada entreno y el calendario.',
    art: (
      <>
        <Row a="Entrenos esta semana" b="3 / 4" />
        <Row a="Récord · Press de banca" b="95 kg" />
        <Row a="Informe mensual" b="Ver" hot />
      </>
    ),
  },
  {
    title: 'Con ayuda de IA',
    text: 'El Coach, en Perfil, te aconseja con tus datos. También puedes conectar una IA externa con una API key (MCP).',
    art: (
      <>
        <Row a="Coach" b="Perfil" />
        <Row a="Clave de API" b="••••••••" />
        <Row a="IA externa (MCP)" b="Conectada" hot />
      </>
    ),
  },
  {
    title: 'También en tu reloj',
    text: 'Empieza o sigue el entreno desde Wear OS, completa series y descansos con vibración y consulta tu pulso.',
    art: (
      <>
        <Row a="Press de banca" b="Serie 2 de 4" />
        <Row a="Completar serie" b="80 kg × 8" />
        <Row a="Pulso" b="128 ppm" hot />
      </>
    ),
  },
  {
    title: 'Todo sincronizado',
    text: 'Crea una cuenta para sincronizar móvil, web y reloj, o empieza ya sin ella.',
    art: (
      <>
        <Row a="Móvil" b="Al día" />
        <Row a="Web" b="Al día" />
        <Row a="Reloj" b="Al día" hot />
      </>
    ),
  },
];

export default function Onboarding({ onDone, onCreateAccount }: { onDone: () => void; onCreateAccount: () => void }) {
  const [i, setI] = useState(0);
  const last = i === SCREENS.length - 1;
  const s = SCREENS[i];
  const done = (then?: () => void) => {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1');
    } catch {
      /* almacenamiento bloqueado: el tour podrá volver a salir, sin más */
    }
    onDone();
    then?.();
  };
  const { configured } = useCloud();
  // Escape (y "Atrás" en Android, vía __workstationBack) cierra el tour.
  const doneRef = useRef(done);
  doneRef.current = done;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && doneRef.current();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);
  return (
    <div className="onb" role="dialog" aria-modal="true" aria-label="Bienvenida">
      <div className="onb-top">
        {!last && (
          <button className="ghost" onClick={() => done()}>
            Saltar
          </button>
        )}
      </div>
      <div className="onb-art" aria-hidden>
        {s.art}
      </div>
      <h1>{s.title}</h1>
      <p>{s.text}</p>
      <div className="onb-bottom">
        <div className="onb-dots" aria-hidden>
          {SCREENS.map((_, n) => (
            <i key={n} className={n === i ? 'on' : ''} />
          ))}
        </div>
        {last ? (
          <>
            {configured && (
              <button className="primary full" autoFocus onClick={() => done(onCreateAccount)}>
                Crear cuenta
              </button>
            )}
            <button className={configured ? 'ghost full' : 'primary full'} autoFocus={!configured} onClick={() => done()}>
              {configured ? 'Ahora no' : 'Empezar'}
            </button>
          </>
        ) : (
          <button className="primary full" autoFocus onClick={() => setI(i + 1)}>
            Siguiente
          </button>
        )}
      </div>
    </div>
  );
}
