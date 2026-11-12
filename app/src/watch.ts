// Reloj autónomo: el móvil le deja al reloj rutinas, biblioteca e historial, recoge los entrenos que se hacen
// en él y le da al móvil una API key propia para subirlos a la nube aunque la app esté cerrada.
import { useEffect } from 'react';
import { needsWatchKey } from '../../shared/api-keys';
import { buildWatchLibrary, parseWatchWorkout } from '../../shared/watch-library';
import { watchKeyDue, watchKeyExpiry } from '../../shared/watch-key';
import { cloud, useCloud, WATCH_KEY_NAME } from './cloud';
import { native, onWatchWorkout, useWatchStatus } from './native';
import { useStore } from './store';
import { toast } from './toast';

// El efecto puede dispararse varias veces seguidas (sesión y reloj llegan por separado): una sola emisión a la vez.
let issuing = false;

export function useWatchSync() {
  const store = useStore();
  const { data } = store;
  const watch = useWatchStatus();
  const st = useCloud();

  useEffect(() => {
    const t = setTimeout(() => native.sendLibraryToWatch(JSON.stringify(buildWatchLibrary(data))), 1500);
    return () => clearTimeout(t);
  }, [data]);

  useEffect(() => {
    onWatchWorkout((json) => {
      let id: string | undefined;
      try {
        id = (JSON.parse(json) as { id?: string }).id;
      } catch {
        return;
      }
      store.update((d) => {
        const w = parseWatchWorkout(json, d);
        if (w && !d.workouts.some((x) => x.id === w.id)) {
          d.workouts.push(w);
          toast.show(`Entreno del reloj guardado: ${w.name}`);
        }
      });
      if (id) native.ackWatchWorkout(id);
    });
    native.requestWatchWorkouts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Con sesión y un reloj emparejado, el móvil recibe una key de escritura solo para subir esos entrenos.
  // Caduca sola: al abrir la app se emite la siguiente antes de que venza y el móvil revoca la anterior.
  const uid = cloud.userId();
  useEffect(() => {
    if (!uid || st.consent !== 'ok' || !watch.nodes.length || issuing) return;
    const have = native.watchUploadUser();
    if (have === undefined) return;
    const due = watchKeyDue(have, native.watchUploadExpiry(), uid);
    issuing = true;
    // Aunque no toque renovarla, la guardada puede haberse revocado desde otro dispositivo: el móvil no se entera si no lo pregunta.
    (due ? Promise.resolve(null) : cloud.watchKeyExists())
      .then(async (exists) => {
        if (cloud.userId() !== uid || !(due || needsWatchKey(have, uid, exists))) return;
        const expiresAt = watchKeyExpiry();
        const apiKey = await cloud.createApiKey(WATCH_KEY_NAME, 'write', expiresAt);
        // Si el móvil no ha podido guardarla, no debe quedar una key huérfana en el servidor.
        if (native.setWatchUpload(JSON.stringify({ ...cloud.config(), apiKey, userId: uid, expiresAt })) === false) await cloud.deleteApiKey(apiKey);
      })
      .catch(() => {}) // sin la key, los entrenos del reloj entran al abrir la app
      .finally(() => {
        issuing = false;
      });
  }, [uid, watch.nodes.length, st.email, st.consent]);
}
