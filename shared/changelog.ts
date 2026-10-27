// Novedades por versión (se muestran una vez tras actualizar y en Ajustes → Novedades).
export interface Release {
  version: string;
  date: string;
  items: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '1.4.4',
    date: '2026-10-27',
    items: ['Los ejercicios importados de Hevy se enlazan con la biblioteca: con sus imágenes, instrucciones y récords. Si ya los habías importado, vuelve a importar el CSV y se corrigen solos.'],
  },
  {
    version: '1.4.3',
    date: '2026-10-27',
    items: ['Android: ya se puede elegir el CSV de Hevy (y otros ficheros) al importar.'],
  },
  {
    version: '1.4.2',
    date: '2026-10-27',
    items: [
      'Al importar el CSV de Hevy se crean también tus rutinas (carpeta «Hevy»), a partir de la última vez que hiciste cada una.',
      'Cuenta renovada: crea tu cuenta con Google o con email, con contraseñas seguras y emails con la marca de Workstation.',
      'Tu API key se puede enviar a tu email o añadir a Claude con un toque.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-10-27',
    items: [
      'Diseño nuevo, más sobrio: fondo oscuro con un único acento naranja, también en claro.',
      'Tour de bienvenida la primera vez que abres la app.',
      'Tu cuenta, en Perfil: entra con email o con Google y tus datos te siguen entre dispositivos.',
      'El Coach ahora vive en Perfil, y la barra inferior queda en cuatro pestañas.',
      'En Android la app respeta las barras de estado y de navegación del móvil.',
      'Selector de ejercicios a pantalla completa, más cómodo para buscar y filtrar.',
      'Reloj renovado, con el mismo aspecto sobrio y el acento naranja.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-26',
    items: [
      'Android: el entrenamiento sigue vivo con la pantalla apagada y el botón Atrás cierra lo que tengas abierto.',
      'Reloj: el pulso se mide aunque bajes la muñeca, y en libras los botones +/− guardan justo lo que ves.',
      'Los enlaces de rutinas se abren en la app de Android y se comparten con el menú del móvil.',
      'La sincronización ya no depende de que la hora del móvil esté bien puesta.',
      'Revisión visual en móviles pequeños: decimales con coma y cifras que ya no se cortan.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-10-25',
    items: [
      'Revisión a fondo: corregidos más de 25 fallos, entre ellos varios que podían perder series al editar, reemplazar o deshacer.',
      'Sincronización más segura: un móvil que estuvo sin conexión ya no pisa cambios más recientes, y entrar con otra cuenta no mezcla datos.',
      'Los ejercicios asistidos ya no cuentan la ayuda como peso levantado; importación de Hevy sin duplicados y con fechas en español.',
      'El reloj ignora toques sobre series que cambiaron en el móvil.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-10-25',
    items: [
      'Comparte una rutina con un enlace: quien lo abre la ve y la guarda con un toque (sin cuentas ni servidores).',
      'Mucho más rápida con años de historial: el perfil y la pantalla de entrenar abren hasta 5 veces antes.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-24',
    items: [
      'Unidades: kilos o libras, en toda la app.',
      'Aviso de nueva versión con "Actualizar" (nunca a mitad de un entreno) y esta pantalla de novedades.',
      'Copias de seguridad automáticas en el dispositivo, con restaurar y descargar.',
      'Reordena ejercicios arrastrando y desliza una serie para borrarla.',
      'Niveles de fuerza (Principiante → Élite) y tu año en historias para compartir.',
      'Hoy toca, recuperación muscular y comparación con la sesión anterior.',
      'Paleta "Energía", accesibilidad WCAG AA y carga más rápida.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-10-19',
    items: ['Cuenta y sincronización con Supabase, API keys y servidor MCP, GIFs de ExerciseDB y animaciones propias.'],
  },
];

/** Versiones más nuevas que `seen` (orden: la más reciente primero). */
export function unseenReleases(seen: string | undefined, current: string): Release[] {
  const v = (s: string) => s.split('.').map(Number);
  const gt = (a: string, b: string) => {
    const [x, y] = [v(a), v(b)];
    for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
    return false;
  };
  if (!seen) return [];
  return CHANGELOG.filter((r) => gt(r.version, seen) && !gt(r.version, current));
}
