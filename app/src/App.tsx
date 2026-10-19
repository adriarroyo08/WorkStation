import { BarChart3, CalendarDays, Dumbbell, Library, Sparkles } from 'lucide-react';
import { lazy, Suspense, useCallback, useLayoutEffect, useRef, useState } from 'react';
import Train from './components/Train';

// El resto de pestañas se cargan bajo demanda: el arranque solo descarga "Entrenar".
const Coach = lazy(() => import('./components/Coach'));
const ExercisesTab = lazy(() => import('./components/ExercisesTab'));
const History = lazy(() => import('./components/History'));
const Profile = lazy(() => import('./components/Profile'));
import { useScrollTop } from './components/ui';
import { useSessionController } from './controller';
import { useRest } from './rest';
import { toast, useToast } from './toast';
import { clock, useNow, useStore } from './store';

const TABS = [
  { id: 'train', label: 'Entrenar', Icon: Dumbbell },
  { id: 'history', label: 'Historial', Icon: CalendarDays },
  { id: 'exercises', label: 'Ejercicios', Icon: Library },
  { id: 'profile', label: 'Perfil', Icon: BarChart3 },
  { id: 'coach', label: 'Coach', Icon: Sparkles },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const { active } = useStore();
  useSessionController();
  const [tab, setTab] = useState<TabId>('train');
  const [openExercise, setOpenExercise] = useState<string | null>(null);
  // Desde el entrenamiento en curso abrimos la ficha en una capa encima, sin perder el registro.
  const [overlayExercise, setOverlayExercise] = useState<string | null>(null);
  const goExercise = useCallback(
    (id: string) => {
      if (tab === 'train') ((savedScroll.current = window.scrollY), setOverlayExercise(id));
      else (setOpenExercise(id), setTab('exercises'));
    },
    [tab],
  );
  const clearOpen = useCallback(() => setOpenExercise(null), []);
  useScrollTop(tab);
  // Al volver de la ficha abierta durante el entreno, recupera la posición del registro.
  const savedScroll = useRef(0);
  useLayoutEffect(() => {
    if (!overlayExercise) window.scrollTo({ top: savedScroll.current, behavior: 'instant' as ScrollBehavior });
  }, [overlayExercise]);

  return (
    <div className="app">
      <main>
        <Suspense fallback={<Skeleton />}>
        {overlayExercise ? (
          <ExercisesTab key={overlayExercise} openId={overlayExercise} onClose={() => setOverlayExercise(null)} />
        ) : (
          <>
            <div hidden={tab !== 'train'}>
              <Train onExercise={goExercise} />
            </div>
            {tab === 'history' && <History onExercise={goExercise} goTrain={() => setTab('train')} />}
            {tab === 'exercises' && <ExercisesTab openId={openExercise} onOpened={clearOpen} />}
            {tab === 'profile' && <Profile onExercise={goExercise} />}
            {tab === 'coach' && <Coach goSettings={() => setTab('profile')} />}
          </>
        )}
        </Suspense>
      </main>
      <ToastView />
      {active && tab !== 'train' && <ActiveBanner onClick={() => (setOverlayExercise(null), setTab('train'))} />}
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => (setOverlayExercise(null), setTab(t.id))}>
            <t.Icon size={22} strokeWidth={tab === t.id ? 2.4 : 1.9} aria-hidden />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function ActiveBanner({ onClick }: { onClick: () => void }) {
  const { active } = useStore();
  const now = useNow();
  const r = useRest();
  const left = r.end ? Math.ceil((r.end - now) / 1000) : 0;
  return (
    <button className="active-banner" onClick={onClick}>
      <span className="pulse" /> <b>{active?.name}</b>
      <span className="grow" />
      {left > 0 ? `Descanso ${clock(left)}` : clock((now - Date.parse(active!.startedAt)) / 1000)}
    </button>
  );
}

function ToastView() {
  const t = useToast();
  if (!t) return null;
  return (
    <div className="toast" role="status" key={t.id}>
      <span className="grow">{t.text}</span>
      {t.action && (
        <button
          className="ghost"
          onClick={() => {
            t.action!.run();
            toast.dismiss();
          }}
        >
          {t.action.label}
        </button>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <section aria-busy="true">
      <div className="skeleton" style={{ height: 36, width: '50%' }} />
      <div className="skeleton" />
      <div className="skeleton" />
    </section>
  );
}
