// Explicación previa al permiso de notificaciones: se muestra al empezar el primer entreno (Android).
import { BellRing } from 'lucide-react';
import { resolvePendingStart, usePendingStart } from '../controller';
import { native } from '../native';
import { Sheet } from './ui';

export function NotifPrompt({ onDone }: { onDone: () => void }) {
  return (
    <Sheet title="Avisos del entreno" onClose={onDone}>
      <p className="whatsnew-head">
        <BellRing size={18} className="tile-ico inline" /> Te avisamos cuando acabe el descanso y verás el entreno en curso en la pantalla de bloqueo.
      </p>
      <button className="primary full" onClick={() => void native.requestNotifications().then(onDone)}>
        Activar avisos
      </button>
      <button className="ghost gray full" onClick={onDone}>
        Ahora no
      </button>
    </Sheet>
  );
}

/** Se monta una vez en App: muestra la hoja cuando hay un entreno esperando y lo arranca al cerrarla. */
export function NotifGate() {
  return usePendingStart() ? <NotifPrompt onDone={resolvePendingStart} /> : null;
}
