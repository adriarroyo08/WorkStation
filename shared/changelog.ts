// Novedades por versión (se muestran una vez tras actualizar y en Ajustes → Novedades).
export interface Release {
  version: string;
  date: string;
  items: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '1.8.0',
    date: '2026-10-31',
    items: [
      'Toca un ejercicio de una rutina, de un programa o del entreno en curso para ver cómo se hace: imágenes, instrucciones y los músculos que trabaja, sin salir de donde estás.',
      'Desde esa ficha rápida puedes saltar a la ficha completa con tu historial y récords.',
      'Confirmaciones y avisos con el estilo de la app en lugar de las ventanas del sistema.',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-10-29',
    items: [
      'Historial renovado: los entrenos del mes en grande comparados con el mes pasado, y el mapa de músculos de cada entreno en la lista.',
      'Mantén pulsado un entreno del historial para repetirlo o borrarlo.',
      'Ejercicios: toca un músculo del cuerpo para filtrar la biblioteca.',
      'En la ficha de cada ejercicio, tu cifra en grande y cuánto has progresado; toca o arrastra el dedo por la gráfica para ver cada sesión.',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-10-29',
    items: [
      'Entrenar renovado: tu semana en grande y "Hoy toca" con el mapa de los músculos que vas a trabajar, series y tiempo estimado.',
      'Desliza una serie a la derecha para marcarla como hecha (a la izquierda sigue borrándola).',
      'Mantén pulsada una rutina para abrir sus opciones.',
      'Barra de progreso del entreno con las series hechas y el mapa muscular por partes en el detalle de cada entreno.',
    ],
  },
  {
    version: '1.5.1',
    date: '2026-10-28',
    items: [
      'Músculos más detallados en cada ejercicio: todos los grupos que trabaja con su intensidad (principal, secundario o estabilizador).',
      'Toca un músculo para ver las partes que trabaja: pecho superior, medio o inferior, las tres cabezas del deltoides, del bíceps y del tríceps, y más.',
    ],
  },
  {
    version: '1.5.0',
    date: '2026-10-28',
    items: [
      'Reloj autónomo: entrena desde el reloj sin el móvil. Rutinas, entreno vacío, series, descansos con vibración, pulso e historial.',
      'Los entrenos del reloj llegan solos a tu cuenta, aunque la app del móvil esté cerrada.',
    ],
  },
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
