// Novedades por versión (se muestran una vez tras actualizar y en Ajustes → Novedades).
export interface Release {
  version: string;
  date: string;
  items: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '1.20.0',
    date: '2026-11-09',
    items: ['Antes de sincronizar tus medidas corporales y tu pulso te pedimos tu consentimiento explícito, al crear la cuenta o una sola vez si ya la tenías.'],
  },
  {
    version: '1.19.0',
    date: '2026-11-09',
    items: [
      'Borra tu cuenta y sus datos en la nube desde Perfil, con confirmación previa.',
      'El cronómetro de las series por tiempo se puede pausar, no se pierde al recargar, avisa al alcanzar el objetivo y sugiere +5 s de progresión.',
      'Al recuperar la contraseña ves tus API keys activas y puedes revocarlas todas.',
      'Si llegas al límite de almacenamiento en la nube, la app te lo explica y conserva tus datos en el dispositivo.',
      'Mejoras de accesibilidad, movimiento reducido y fluidez en historiales largos.',
    ],
  },
  {
    version: '1.18.0',
    date: '2026-11-08',
    items: ['Consulta la carga total y el 1RM estimado con tu peso corporal histórico en dominadas (también asistidas) y fondos; añade el ratio de lastre a los niveles de fuerza.'],
  },
  {
    version: '1.17.0',
    date: '2026-11-08',
    items: [
      'Pon un rango de repeticiones por serie en tus rutinas (por ejemplo, 8-12) y copia el mismo rango a todas las series.',
      'Doble progresión: al completar todas las series en lo alto del rango, la sugerencia sube el peso; si no, te propone más repeticiones.',
      'Durante el entrenamiento ves el rango objetivo y, si llevas varias sesiones estancado, un aviso discreto con la opción de aplicar una descarga y deshacerla.',
      'Los enlaces para compartir rutinas conservan los rangos, y el MCP admite rangos y comprueba estancamientos.',
    ],
  },
  {
    version: '1.16.0',
    date: '2026-11-08',
    items: ['Lee noticias de ciencia y entrenamiento desde Entrenar, filtra por fuente y tema y conserva la última actualización para consultar sin conexión.'],
  },
  {
    version: '1.15.0',
    date: '2026-11-08',
    items: [
      'Lee artículos de entrenamiento sin conexión desde Ejercicios: busca, combina etiquetas y consulta referencias y artículos relacionados.',
      'El Coach cita artículos propios relevantes y enlaza al lector; el MCP permite buscarlos y consultarlos.',
    ],
  },
  { version: '1.14.0', date: '2026-11-07', items: ['Importa directamente tu CSV de Strong desde Ajustes: revisa sesiones, unidades y errores antes de confirmar, con copia de seguridad automática.'] },
  {
    version: '1.13.1',
    date: '2026-11-07',
    items: ['Los ejercicios nuevos de wger también se encuentran por su nombre en inglés (por ejemplo, «cossack squat» o «suitcase carry»), y el buscador de GIF de ExerciseDB parte de ese nombre.'],
  },
  { version: '1.13.0', date: '2026-11-06', items: ['Consulta el patrón, los roles musculares y las fuentes de cada ejercicio; filtra por patrón en la biblioteca y al elegir ejercicios.'] },
  {
    version: '1.12.0',
    date: '2026-11-06',
    items: [
      'Catálogo ampliado a más de 1.000 ejercicios: 150+ nuevos de la base abierta wger (paseo de la maleta, almeja, sentadilla cosaca, dragon flag, front lever, Trap-3, estiramientos y movilidad…), en español.',
      'Nuevo ejercicio: seal row (remo tumbado en banco alto).',
    ],
  },
  {
    version: '1.11.1',
    date: '2026-11-06',
    items: ['Busca ejercicios también por su nombre en inglés (por ejemplo, «bench press» o «ez bar curl») y con las palabras en cualquier orden.'],
  },
  {
    version: '1.11.0',
    date: '2026-11-05',
    items: [
      'Lista completa de ejercicios siempre: al añadir uno a una rutina o al entreno, y en la pestaña Ejercicios, salen los 880+ en una sola lista (por ejemplo, unos 50 de bíceps). Al elegir uno del catálogo pasa a tu biblioteca.',
      'Nuevos ejercicios: plancha Copenhague, step down y equilibrio monopodal.',
      'Los ejercicios del catálogo tienen ahora su nombre en español.',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-11-03',
    items: [
      'Elige RPE o RIR en Ajustes para registrar y editar el esfuerzo, conservando las series en RPE.',
      'Editor de rutinas: al tocar el número de una serie se abre un menú para elegir el tipo (normal, calentamiento, drop set o al fallo).',
      'Mantén pulsado un ejercicio de la rutina y arrástralo arriba o abajo para cambiarlo de sitio.',
      'Noticias de fitness e investigación: catálogo auditado de fuentes abiertas (PubMed, PLOS, Frontiers, JISSN, Fisiología del Ejercicio y Stronger by Science) con contratos de reutilización legal y extractos breves.',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-10-31',
    items: [
      'Guías MCP para Claude remoto, ChatGPT, Gemini CLI y Claude Code, con requisitos comprobados y copia segura mediante Authorization.',
      'Nuevo resumen al terminar: portada con tus cifras en grande que suben al aparecer, el mapa de músculos trabajados y tus récords del día destacados.',
      'Entrenar, Historial, Ejercicio y Perfil renovados: rutinas con su mapa de músculos, fechas y nombres en grande, calendario con tus días entrenados, ficha del ejercicio con portada y perfil con tus cifras de un vistazo.',
      'Mejor contraste en botones de borrar y textos secundarios.',
      'Conexión con IAs (MCP): límite de 60 peticiones por minuto y 1000 por hora por API key para proteger tu cuenta; al pasarte, la IA recibe cuándo puede reintentar.',
      'Biblioteca de ejercicios: metadatos científicos con patrón de movimiento, desglose muscular por roles (principal, secundario y estabilizador con intensidad) y nivel de evidencia con fuentes contrastadas.',
      'Base de evidencia científica para artículos: fichas de investigación contrastada para diez temas clave (creatina, proteína, volumen, frecuencia, descanso, sueño, déficit, recomposición, cardio y progresión) con DOIs resueltos y límites claros entre asociación y causalidad.',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-10-31',
    items: [
      'Toca un ejercicio de una rutina, de un programa o del entreno en curso para ver cómo se hace: imágenes, instrucciones y los músculos que trabaja, sin salir de donde estás.',
      'Desde esa ficha rápida puedes saltar a la ficha completa con tu historial y récords.',
      'Confirmaciones y avisos con el estilo de la app en lugar de las ventanas del sistema.',
      'Las instrucciones de los 870+ ejercicios del catálogo, ahora en español.',
      'Nueva tipografía de marcador en títulos y cifras grandes, y la ficha del ejercicio con la imagen a todo lo ancho y sus músculos principales a la vista.',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-10-29',
    items: [
      'API keys: elige una caducidad opcional y consulta la fecha y el último uso; las claves caducadas dejan de dar acceso.',
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
