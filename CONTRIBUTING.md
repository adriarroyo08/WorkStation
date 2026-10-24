# Contribuir

## Puesta en marcha

```bash
npm install && npm --prefix app install && npm --prefix mcp install
npm --prefix app run dev          # http://localhost:5173
```

## Antes de abrir una PR

```bash
npm run check                     # lint + tipos + tests unitarios + build
npm --prefix app run build && npm run e2e   # tests de extremo a extremo (Playwright, incluye auditoría de accesibilidad)
```

El CI ejecuta lo mismo y además compila los APK de Android y Wear OS cuando cambia `android/`.

## Convenciones

- **TypeScript estricto** y **Prettier** (`npm run format`). Comentarios y textos de la interfaz en español.
- La lógica va en `shared/` (sin React) con tests en `shared/*.test.ts`; los componentes, en `app/src/components/`.
- **Los datos se guardan siempre en kg**: convierte solo al mostrar o al escribir, con `shared/units.ts`.
- Accesibilidad: cada control con nombre accesible y contraste AA (la auditoría axe del e2e lo comprueba en claro y oscuro).
- Funciones nuevas visibles para el usuario: añade una línea a `shared/changelog.ts` y a `CHANGELOG.md`.
- Commits en español, en imperativo y con el *porqué* cuando no es evidente.
