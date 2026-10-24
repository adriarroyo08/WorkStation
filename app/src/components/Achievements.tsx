import { Award, Crown, Dumbbell, Flame, Footprints, Hash, Hourglass, Medal, Moon, Mountain, PartyPopper, Rocket, Scale, Ship, Shield, Star, Sunrise, Trophy, Truck, Weight, Zap, type LucideIcon } from 'lucide-react';
import { achievements, type Achievement } from '../../../shared/achievements';
import { useStore } from '../store';
import { Back } from './ui';

const ICONS: Record<string, LucideIcon> = { Award, Crown, Dumbbell, Flame, Footprints, Hash, Hourglass, Medal, Moon, Mountain, PartyPopper, Rocket, Scale, Ship, Shield, Star, Sunrise, Trophy, Truck, Weight, Zap };

export function AchievementIcon({ name, size }: { name: string; size: number }) {
  const Icon = ICONS[name] ?? Award;
  return <Icon size={size} />;
}

export function AchievementBadge({ a }: { a: Achievement }) {
  return (
    <div className={`badge ${a.unlocked ? 'on' : ''}`} title={a.desc}>
      <span className="badge-icon"><AchievementIcon name={a.icon} size={28} /></span>
      <b>{a.title}</b>
      <small className="muted">{a.desc}</small>
      {!a.unlocked && a.progress && (
        <div className="progress thin">
          <div style={{ width: `${(a.progress[0] / a.progress[1]) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export default function Achievements({ onBack }: { onBack: () => void }) {
  const { data } = useStore();
  const list = achievements(data);
  const done = list.filter((a) => a.unlocked).length;
  return (
    <section>
      <Back onClick={onBack} />
      <h1>Logros</h1>
      <p className="muted">
        {done} de {list.length} desbloqueados
      </p>
      <div className="progress">
        <div style={{ width: `${(done / list.length) * 100}%` }} />
      </div>
      <div className="badges">
        {[...list.filter((a) => a.unlocked), ...list.filter((a) => !a.unlocked)].map((a) => (
          <AchievementBadge key={a.id} a={a} />
        ))}
      </div>
    </section>
  );
}
