import { useState } from 'react';
import Coach from './components/Coach';
import Exercises from './components/Exercises';
import History from './components/History';
import Routines from './components/Routines';
import Settings from './components/Settings';
import Train from './components/Train';

const TABS = [
  { id: 'train', label: 'Entrenar', icon: '🏋️' },
  { id: 'history', label: 'Historial', icon: '📅' },
  { id: 'routines', label: 'Rutinas', icon: '📋' },
  { id: 'exercises', label: 'Progreso', icon: '📈' },
  { id: 'coach', label: 'Coach IA', icon: '🤖' },
  { id: 'settings', label: 'Ajustes', icon: '⚙️' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const [tab, setTab] = useState<TabId>('train');
  return (
    <div className="app">
      <main>
        {tab === 'train' && <Train />}
        {tab === 'history' && <History />}
        {tab === 'routines' && <Routines goTrain={() => setTab('train')} />}
        {tab === 'exercises' && <Exercises />}
        {tab === 'coach' && <Coach goSettings={() => setTab('settings')} />}
        {tab === 'settings' && <Settings />}
      </main>
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
