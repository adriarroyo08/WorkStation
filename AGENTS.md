# AGENTS.md

Instrucciones comunes para cualquier agente (Claude Code, Codex, Gemini/Antigravity).
Claude las lee desde `CLAUDE.md`; Gemini, con `context.fileName` en `~/.gemini/settings.json`.

## Proyecto

App personal de entrenamiento de fuerza: PWA (`app/`), servidor MCP (`mcp/`), lógica común (`shared/`),
Supabase (`supabase/`) y apps Android y Wear OS (`android/`). Detalle en `README.md`; convenciones en `CONTRIBUTING.md`.

## Verificar

```bash
npm run check                               # lint + tipos + tests + build: obligatorio antes de dar algo por terminado
npm --prefix app run build && npm run e2e   # solo si tocas la interfaz
```

Si no tienes las dependencias: `npm install && npm --prefix app install && npm --prefix mcp install && npm --prefix video install`.

## Reglas

- Una issue = una rama = un PR contra `main`. Rama `feat/<corto>` o `fix/<corto>`; el PR lleva `Closes #<n>`.
- Haz solo lo que pide la issue. Si falta información o la duda cambia el diseño, pregunta (orquestación: `orca orchestration ask`) en vez de inventar.
- La lógica va en `shared/` con su test en `shared/*.test.ts`. Todo cambio de lógica lleva test.
- Pesos siempre en kg; convierte solo al mostrar, con `shared/units.ts`.
- Accesibilidad AA: cada control con nombre accesible.
- Funciones que ve el usuario: una línea en `shared/changelog.ts` y en `CHANGELOG.md`.
- Commits en español, en imperativo.
- `supabase/functions/mcp/index.ts` es generado: si `npm run check` lo cambia, ese cambio va en el commit (el CI comprueba que está al día). Nunca lo restaures con `git restore`.
- No toques `.github/workflows/`, `supabase/` ni claves sin que la issue lo pida.

## Trabajo con agentes

Las issues mandan. Etiquetas:

| Etiqueta | Significado |
| --- | --- |
| `agent:claude` | Necesita criterio: diseño, bug difícil, arquitectura. |
| `agent:codex` | Bien especificada: implementar siguiendo los criterios. |
| `agent:gemini` | Mecánica: tests, docs, refactor, renombrados, leer mucho código. |
| `necesita:pc` | Para verificarla hay que ver la interfaz, sacar capturas, usar emulador o dispositivo, o compilar la app Android: solo en el PC, no en el servidor. |
| `needs-spec` | Le faltan criterios de aceptación o cómo verificar: no se reparte. |
| `size:s` / `size:m` / `size:l` | Tamaño estimado. |

Si trabajas como worker de Orca, al acabar envía un único `worker_done` con el número del PR en el cuerpo.
