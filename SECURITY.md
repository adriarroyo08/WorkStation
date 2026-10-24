# Seguridad

## Cómo informar de una vulnerabilidad

Por favor, **no abras un issue público**. Usa el aviso privado de GitHub (*Security → Report a vulnerability*) en este repositorio, con los pasos para reproducirlo y el impacto. Responderemos lo antes posible.

## Medidas actuales

- **Content Security Policy** en la web publicada: solo se ejecutan los scripts de la propia app; sin plugins ni código en línea.
- **Supabase con RLS:** cada usuario solo puede leer y escribir sus propias filas (`records`, `api_keys`).
- **API keys personales (`ws_…`):** se generan en el dispositivo con `crypto.getRandomValues`; en la base de datos solo se guarda su SHA-256. Las funciones `api_records`/`api_upsert` (SECURITY DEFINER) validan la clave y el permiso (lectura o escritura) en cada llamada.
- **Secretos fuera del repositorio:** la clave de firma de Android y los tokens de despliegue están en los *secrets* de GitHub Actions. Las API keys de IA y ExerciseDB se guardan solo en el dispositivo del usuario (la de Hevy, solo como variable de entorno del servidor MCP) y no se incluyen en los backups ni en la sincronización.
- **Dependencias:** Dependabot agrupado (npm, Gradle y Actions) y CI completo (lint, tipos, tests, e2e y APK) antes de fusionar.

## Riesgos aceptados

- **`video/` (Remotion) usa zod 4.5.4**, afectada por [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) (consumo de memoria al validar colecciones enormes). Remotion exige esa versión exacta y `video/` es una herramienta local para renderizar el vídeo promocional: no se publica ni procesa datos de terceros. Se actualizará cuando Remotion la suba (Dependabot agrupa sus paquetes). La app y el servidor MCP usan zod ≥ 4.6.7 y no tienen vulnerabilidades conocidas (`npm audit`).
