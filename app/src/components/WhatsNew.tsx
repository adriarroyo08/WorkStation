// Aviso de nueva versión y pantalla de novedades.
import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { CHANGELOG, unseenReleases, type Release } from '../../../shared/changelog';
import { updateApp, useNeedRefresh } from '../pwa';
import { useStore } from '../store';
import { Sheet } from './ui';

export const APP_VERSION = __APP_VERSION__;
const SEEN_KEY = 'ws:seenVersion';

const readSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};
const markSeen = () => {
  try {
    localStorage.setItem(SEEN_KEY, APP_VERSION);
  } catch {
    /* almacenamiento bloqueado: se volverá a mostrar, sin más */
  }
};

/** Banda "Nueva versión disponible". Durante un entreno avisa de que se conserva. */
export function UpdateBanner() {
  const need = useNeedRefresh();
  const { active } = useStore();
  const [later, setLater] = useState(false);
  if (!need || later) return null;
  return (
    <div className="update-banner" role="status">
      <RefreshCw size={18} aria-hidden />
      <span className="grow">
        <b>Nueva versión disponible</b>
        {active && <small> · tu entreno en curso se conserva</small>}
      </span>
      <button className="ghost small" onClick={() => setLater(true)}>
        Luego
      </button>
      <button className="primary small" onClick={() => void updateApp()}>
        Actualizar
      </button>
    </div>
  );
}

export function ReleaseNotes({ releases }: { releases: Release[] }) {
  return (
    <>
      {releases.map((r) => (
        <div key={r.version} className="release">
          <h3>
            Versión {r.version} <small className="muted">· {new Date(r.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</small>
          </h3>
          <ul>
            {r.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/** Tras actualizar, muestra una vez lo nuevo. En la primera instalación no muestra nada. */
export function WhatsNewOnUpdate() {
  const [releases, setReleases] = useState(() => {
    const seen = readSeen();
    const list = unseenReleases(seen, APP_VERSION);
    if (!list.length) markSeen();
    return list;
  });
  if (!releases.length) return null;
  const close = () => (markSeen(), setReleases([]));
  return (
    <Sheet title="Novedades" onClose={close}>
      <p className="whatsnew-head">
        <Sparkles size={18} className="tile-ico inline" /> Workstation se ha actualizado a la versión {APP_VERSION}.
      </p>
      <ReleaseNotes releases={releases} />
      <button className="primary full" onClick={close}>
        ¡Genial!
      </button>
    </Sheet>
  );
}

export function AllReleasesSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Novedades" onClose={onClose}>
      <ReleaseNotes releases={CHANGELOG} />
    </Sheet>
  );
}
