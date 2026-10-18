import { useCallback, useState } from 'react';
import Coach from './components/Coach';
import ExercisesTab from './components/ExercisesTab';
import History from './components/History';
import Profile from './components/Profile';
import Train from './components/Train';
import { useSessionController } from './controller';
import { useRest } from './rest';
import { clock, useNow, useStore } from './store';

const TABS = [
  { id: 'train', label: 'Entrenar', icon: '🏋️' },
  { id: 'history', label: 'Historial', icon: '📅' },
  { id: 'exercises', label: 'Ejercicios', icon: '💪' },
  { id: 'profile', label: 'Perfil', icon: '📊' },
  { id: 'coach', label: 'Coach IA', icon: '🤖' },
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
      if (tab === 'train') setOverlayExercise(id);
      else (setOpenExercise(id), setTab('exercises'));
    },
    [tab],
  );
  const clearOpen = useCallback(() => setOpenExercise(null), []);

  return (
    <div className="app">
      <main>
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
      </main>
      {active && tab !== 'train' && <ActiveBanner onClick={() => (setOverlayExercise(null), setTab('train'))} />}
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => (setOverlayExercise(null), setTab(t.id))}>
            <span>{t.icon}</span>
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
