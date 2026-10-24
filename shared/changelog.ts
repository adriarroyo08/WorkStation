// Novedades por versión (se muestran una vez tras actualizar y en Ajustes → Novedades).
export interface Release {
  version: string;
  date: string;
  items: string[];
}

export const CHANGELOG: Release[] = [
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
