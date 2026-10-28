// Reloj autónomo: el móvil le deja al reloj rutinas, biblioteca e historial, recoge los entrenos que se hacen
// en él y le da al móvil una API key propia para subirlos a la nube aunque la app esté cerrada.
import { useEffect } from 'react';
import { buildWatchLibrary, parseWatchWorkout } from '../../shared/watch-library';
import { cloud, useCloud, WATCH_KEY_NAME } from './cloud';
import { native, onWatchWorkout, useWatchStatus } from './native';
import { useStore } from './store';
import { toast } from './toast';

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
  const uid = cloud.userId();
  useEffect(() => {
    if (!uid || !watch.nodes.length) return;
    const have = native.watchUploadUser();
    if (have === undefined || have === uid) return;
    cloud
      .createApiKey(WATCH_KEY_NAME, 'write')
      .then((apiKey) => native.setWatchUpload(JSON.stringify({ ...cloud.config(), apiKey, userId: uid })))
      .catch(() => {}); // sin la key, los entrenos del reloj entran al abrir la app
  }, [uid, watch.nodes.length, st.email]);
}
