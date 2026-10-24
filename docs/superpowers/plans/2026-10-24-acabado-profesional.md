# Acabado profesional, tour y cuentas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar a Workstation (web/APK móvil y reloj) un acabado sobrio estilo Hevy con acento naranja plano, bordes correctos en Android, tour de bienvenida y cuentas visibles con email y Google.

**Architecture:** La UI es una app React/Vite (`app/`) que también se empaqueta en el WebView del APK (`android/phone`). El estilo se reescribe desde los tokens de `app/src/styles.css`; las piezas nativas (insets, iconos de barra, permiso de notificaciones, login de Google) se exponen al web por el puente existente `NativeBridge.kt` ↔ `app/src/native.ts`. La lógica pura (cuándo mostrar el tour, nonce de Google) va a `shared/` para tener tests en vitest.

**Tech Stack:** React 19, Vite 8, TypeScript, CSS plano con variables, lucide-react, Supabase JS v2, Playwright (e2e), vitest; Android Kotlin (WebView, AndroidX Credentials + Google ID), Wear OS Compose.

**Spec:** `docs/superpowers/specs/2026-10-24-acabado-profesional-design.md` (leerla entera antes de empezar; las maquetas están en `.superpowers/brainstorm/*/content/estilo-visual.html` opción C y `tour-formato.html` opción A).

## Global Constraints

- Paleta oscuro: fondo `#141414`, superficie `#1f1f1f`, divisor `#2a2a2a`, texto `#f2f2f2`, secundario `#8e8e93`, acento `#f2600c`.
- Paleta claro: fondo `#ffffff`, superficie `#f4f4f6`, divisor `#ececec`, texto `#111111`, secundario `#6b6b70`, acento `#f2600c` (para texto de acento sobre blanco usar un tono con contraste AA, p. ej. `#c2410c`).
- Reloj: fondo negro puro `#000000`, acento `#f2600c`.
- Sin `linear-gradient`/`radial-gradient` decorativos, sin sombras de color o brillo, sin emojis como iconos. Iconos solo de `lucide-react`.
- Radios ≈ 8 px botones, 10–12 px tarjetas. Título de pantalla 22–24 px.
- 4 pestañas: Entrenar, Historial, Ejercicios, Perfil. Coach vive en Perfil.
- La app se usa sin cuenta. Nada debajo de la barra de estado ni de la de gestos.
- Todo el texto de la UI en español de España.
- No añadir librerías de UI web. En Android solo se añaden `androidx.credentials` y `com.google.android.libraries.identity.googleid`.
- Versión final: `1.4.0`.
- Cada tarea deja `npm run lint`, `npm run typecheck`, `npm test` y `npm run e2e` en verde (actualizando a propósito los tests cuyo comportamiento cambia la spec).

## Review Focus

1. **Teclado abierto en Android** (buscador de ejercicios, peso/reps, login): el campo enfocado sigue visible y la barra de pestañas no flota encima del teclado → Task 1 y Task 5.
2. **Usuario que actualiza desde 1.3.0 con datos**: no ve el tour, sí ve Novedades 1.4.0; quien instala de cero ve el tour y no Novedades → Task 8 (test de `shouldShowOnboarding`) y Task 13 (e2e).
3. **Google cancelado o sin red / sin configurar**: cancelar el selector de cuentas no muestra error rojo ni deja la UI colgada; sin `VITE_GOOGLE_WEB_CLIENT_ID` o con Supabase propio el botón no aparece → Task 11.
4. **Permiso de notificaciones denegado**: el entreno empieza igual, sin volver a preguntar en cada entreno → Task 9.
5. **Cambio de tema manual (Perfil → sol/luna) en el APK**: los iconos de la barra de estado cambian al instante → Task 1.

---

### Task 1: Bordes y barras del sistema en Android

**Files:**
- Modify: `android/phone/src/main/java/com/workstation/app/MainActivity.kt:56-63`
- Modify: `android/phone/src/main/java/com/workstation/app/NativeBridge.kt`
- Modify: `android/phone/src/main/res/values/colors.xml`, `themes.xml`
- Modify: `app/src/native.ts`, `app/src/store.tsx:73-83`

**Interfaces:**
- Produces (Kotlin, `NativeBridge`): `@JavascriptInterface fun setSystemBars(dark: Boolean)`.
- Produces (TS, `native`): `native.setSystemBars(dark: boolean): void` (no-op fuera de Android).

- [ ] **Step 1:** En `MainActivity`, meter el `WebView` dentro de un `FrameLayout` raíz y aplicar los insets (`systemBars() or displayCutout() or ime()`) como padding **del FrameLayout**, no del WebView. Llamar `WindowCompat.setDecorFitsSystemWindows(window, false)` explícitamente.
- [ ] **Step 2:** `setSystemBars(dark)`: en el hilo de UI, pone el fondo del FrameLayout al color de fondo del tema (`#141414` / `#ffffff`) y `WindowInsetsControllerCompat(window, root).isAppearanceLightStatusBars = !dark` (ídem `isAppearanceLightNavigationBars`).
- [ ] **Step 3:** `colors.xml`: `bg = #141414`, `accent = #F2600C`, `ic_launcher_background = #141414`.
- [ ] **Step 4:** En el efecto de tema de `store.tsx`, tras calcular `dark`, llamar `native.setSystemBars(dark)` y poner `meta[name=theme-color]` a `#141414` / `#ffffff`. Escuchar también cambios de `prefers-color-scheme` cuando `theme === 'auto'`.
- [ ] **Step 5:** Compilar e instalar en el emulador: `cd android && ./gradlew :phone:assembleDebug` y `adb install -r phone/build/outputs/apk/debug/phone-debug.apk` (emulador `Pixel_6_Pro`, `adb` en `%LOCALAPPDATA%\Android\Sdk\platform-tools`). Capturar con `adb exec-out screencap -p`.
  Expected: el título queda por debajo del reloj; las etiquetas de pestañas por encima de la barra de gestos; en modo claro los iconos de estado son oscuros; al abrir el buscador de ejercicios con teclado, el campo se ve.
- [ ] **Step 6:** Commit `Android: la app respeta la barra de estado y la de gestos`.

### Task 2: Tokens de diseño y fuera los efectos

**Files:**
- Modify: `app/src/styles.css` (tokens `:root` líneas 1–~110 y todas las reglas con `gradient`/`box-shadow` decorativas: hoy 29 apariciones)
- Modify: `app/index.html` (meta `theme-color`), `e2e/app.spec.ts:43-44`
- Create: `e2e/style.spec.ts`

**Interfaces:**
- Produces: variables CSS que el resto de tareas usan: `--bg --surface --line --text --muted --accent --accent-ink --on-accent --danger --ok --warn --radius (12px) --radius-sm (8px)`. Mantener los nombres antiguos que sigan en uso como alias hasta Task 7, o renombrar en el mismo commit; `--grad`, `--grad-vivid`, `--accent-2*`, `--purple`, `--glass` desaparecen.

- [ ] **Step 1: Test que falla** — `e2e/style.spec.ts`, `test('sin degradados ni brillos de color', …)`: con `seed(page, SAMPLE)`, recorrer las 4 pestañas (tras Task 6; hasta entonces las 5) y comprobar sobre todos los elementos visibles que `getComputedStyle(el).backgroundImage` no contiene `gradient` (excepto `.skeleton`, `img`, `svg *`) y que `boxShadow` no contiene colores con saturación (permitido `none` o negro/gris con alfa).
- [ ] **Step 2:** `npx playwright test e2e/style.spec.ts` → FAIL (lista de elementos con degradado).
- [ ] **Step 3:** Reescribir tokens con las paletas de Global Constraints (oscuro por defecto, claro bajo `prefers-color-scheme: light` sin `data-theme=dark`, y `[data-theme=light]`), radios y sombras neutras; eliminar degradados/brillos de botones primarios, anillo, gráficos, banner Wrapped, `.modal` (sin `backdrop-filter`).
- [ ] **Step 4:** Actualizar `e2e/app.spec.ts:44` a `'rgb(20, 20, 20)'` / `'rgb(255, 255, 255)'`.
- [ ] **Step 5:** `npm run e2e` → PASS.
- [ ] **Step 6:** Commit `Estilo: paleta plana con acento naranja, sin degradados`.

### Task 3: Iconos en lugar de emojis

**Files:**
- Modify: `app/src/components/Train.tsx:202-…` (bienvenida), `Achievements.tsx`, `shared/achievements.ts` (si define emojis), `Profile.tsx`, `Wrapped.tsx`, `History.tsx` (🏆), y cualquier otro que `grep -P "\p{Extended_Pictographic}"` encuentre en `app/src` y `shared`.
- Test: `e2e/style.spec.ts`

**Interfaces:**
- Si `shared/achievements.ts` guarda emojis: sustituir el campo por `icon: string` con el nombre de un icono lucide (p. ej. `'Trophy'`) y un mapa `ICONS: Record<string, LucideIcon>` en `Achievements.tsx`.

- [ ] **Step 1: Test que falla** — en `e2e/style.spec.ts`, `test('sin emojis en la interfaz', …)`: por cada pestaña y por la hoja de Logros, `document.body.innerText` no casa con `/\p{Extended_Pictographic}/u`.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Sustituir cada emoji por su icono lucide equivalente (16–20 px, `currentColor`) o eliminarlo si es decorativo.
- [ ] **Step 4:** `npm test && npm run e2e` → PASS.
- [ ] **Step 5:** Commit `Iconos de línea en lugar de emojis`.

### Task 4: Pantalla Entrenar con el nuevo estilo

**Files:**
- Modify: `app/src/components/Train.tsx`, `app/src/components/ui.tsx` (`ProgressRing` → nuevo `WeekStrip`), `app/src/styles.css`

**Interfaces:**
- Produces: `export function WeekStrip({ days, goal }: { days: boolean[]; goal: number })` en `ui.tsx` (7 casillas, la de cada día entrenado en acento; texto "Esta semana · N de goal"). `ProgressRing` se elimina si deja de usarse.

- [ ] **Step 1:** Ajustar `e2e/layout.spec.ts` y `app.spec.ts` si dependen de `.progress-ring`; añadir en `app.spec.ts` `test('la semana se muestra como 7 días', …)`: con `SAMPLE`, `.weekstrip i` tiene 7 elementos y los de días entrenados tienen clase `on`.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar `WeekStrip` y rehacer Entrenar como en la maqueta C: título, etiqueta de sección "Esta semana", `WeekStrip`, botón primario "Empezar entrenamiento vacío", secundarios con borde "Nueva rutina" / "Explorar", rutinas como filas con divisor (nombre + ejercicios en gris + "Empezar"); "Hoy toca" y recuperación como filas planas. Estado vacío (bienvenida) rediseñado sin tarjeta dentro de tarjeta.
- [ ] **Step 4:** `npm run e2e` → PASS; captura a 360 px oscuro y claro (`SHOTS=… npx playwright test e2e/layout.spec.ts`) y comparar con la maqueta.
- [ ] **Step 5:** Commit `Entrenar: diseño plano con semana en 7 días`.

### Task 5: Hojas a pantalla completa y selector de ejercicios

**Files:**
- Modify: `app/src/components/ui.tsx:9-29` (`Sheet`), `app/src/components/ExercisePicker.tsx`, `app/src/styles.css:1086-1110, 1423-1440, 580-612`
- Test: `e2e/app.spec.ts`

**Interfaces:**
- Produces: `Sheet` con prop opcional `full?: boolean` (pantalla completa: cabecera fija, cuerpo con scroll propio, pie fijo opcional vía `footer?: ReactNode`). `Sheet` se renderiza con `createPortal(…, document.body)`.

- [ ] **Step 1: Test que falla** — `test('añadir ejercicio ocupa toda la pantalla y se puede elegir tras desplazar', …)`: empezar entreno vacío, "Añadir ejercicio"; el `[role=dialog]` mide ≥ 95 % de `innerHeight`; cada `.exrow` visible mide el ancho del contenedor de la lista (±2 px); hacer scroll de la lista 2500 px, el buscador sigue visible, y click en `.exrow` con "Elevación de gemelos de pie" añade el ejercicio.
- [ ] **Step 2:** Ejecutar → FAIL (hoy: "element is outside of the viewport").
- [ ] **Step 3:** Causa a confirmar antes de arreglar: la hoja se pinta dentro de `main` y un ancestro con `transform`/`animation` convierte el `position: fixed` en relativo a ese ancestro. Portal a `body` + `full` en `ExercisePicker`: buscador y filtros en la cabecera fija, lista con scroll dentro, `.exrow { width: 100% }` como fila con divisor (sin tarjeta), acciones de selección múltiple en el pie fijo respetando `env(safe-area-inset-bottom)`.
- [ ] **Step 4:** `npm run e2e` → PASS (todas: la función Atrás de `native.ts` sigue encontrando `[role=dialog][aria-modal=true]`).
- [ ] **Step 5:** Commit `Selector de ejercicios a pantalla completa`.

### Task 6: Cuatro pestañas y Coach dentro de Perfil

**Files:**
- Modify: `app/src/App.tsx:19-25, 68-72`, `app/src/components/Profile.tsx`, `app/src/components/Coach.tsx` (botón Volver vía `Back`), `Train.tsx:315`, `Explore.tsx:65`, `ExercisesTab.tsx:125`, `e2e/*.spec.ts` que pulsan la pestaña "Coach"

**Interfaces:**
- Produces: `Profile` acepta `onOpenCoach?: () => void` o gestiona internamente una subpantalla `'coach'` como hace con Informes/Medidas (seguir el patrón que ya use Profile). `Coach` recibe `onBack: () => void`.

- [ ] **Step 1:** Test que falla en `app.spec.ts`: `nav.tabs button` tiene 4 elementos con textos Entrenar, Historial, Ejercicios, Perfil; en Perfil existe una fila "Coach IA" que abre la pantalla del Coach y "Volver" regresa a Perfil.
- [ ] **Step 2:** Ejecutar → FAIL.
- [ ] **Step 3:** Implementar; los textos "pídesela al Coach IA" pasan a ser botones/enlaces que abren Perfil → Coach (o texto que diga "en Perfil → Coach").
- [ ] **Step 4:** `npm run e2e` → PASS (actualizar `a11y.spec.ts`/`layout.spec.ts` que recorren "Coach").
- [ ] **Step 5:** Commit `Coach pasa a Perfil; cuatro pestañas`.

### Task 7: Revisión pantalla por pantalla

**Files:**
- Modify: `app/src/styles.css` y los componentes de cada pantalla listada en la spec §3 (Historial, WorkoutDetail, ExercisesTab, Profile y subpantallas, Settings, CloudSettings, ApiKeys, AutoBackups, RoutineEditor, Explore, WorkoutLogger incl. resumen y descanso, Wrapped, WhatsNew, SharedRoutine).
- Test: `e2e/layout.spec.ts`

- [ ] **Step 1:** Extender `layout.spec.ts` para recorrer también las subpantallas de Perfil (Informes, Medidas, Logros, Ajustes, Coach) y el editor de rutinas; mantener la comprobación de desbordes/recortes.
- [ ] **Step 2:** Generar capturas: `SHOTS=<dir> npx playwright test e2e/layout.spec.ts` (oscuro y claro). Revisar cada una frente a Global Constraints (sin tarjetas anidadas, listas con divisor, títulos 22–24 px, solo un acento) y anotar fallos.
- [ ] **Step 3:** Corregir; incluye quitar el tirador de redimensionar de las notas (`resize: none`, altura automática) y reducir el espacio vacío del entreno vacío.
- [ ] **Step 4:** `npm run e2e` → PASS; capturas de nuevo sin fallos visibles; repetir en el emulador Pixel con el APK debug.
- [ ] **Step 5:** Commit por bloque de pantallas (`Historial con el nuevo estilo`, `Perfil con el nuevo estilo`, …).

### Task 8: Tour de bienvenida

**Files:**
- Create: `shared/onboarding.ts`, `shared/onboarding.test.ts`, `app/src/components/Onboarding.tsx`
- Modify: `app/src/App.tsx`, `app/src/components/Settings.tsx` ("Ver tour de nuevo"), `app/src/styles.css`, `vitest.config.ts` (si hace falta incluir el nuevo test: ya cubre `shared/**`)

**Interfaces:**
- Produces: `shouldShowOnboarding(input: { onboarded: boolean; seenVersion: string | undefined; hasData: boolean }): boolean` y `export const ONBOARDED_KEY = 'ws:onboarded'` en `shared/onboarding.ts`.
- Produces: `export default function Onboarding({ onDone, onCreateAccount }: { onDone: () => void; onCreateAccount: () => void })`.
- Consumes: `cloud`/pantalla de cuenta de Task 10 para `onCreateAccount` (hasta entonces, navegar a Perfil).

- [ ] **Step 1: Tests que fallan** — `shared/onboarding.test.ts`:
  - `shouldShowOnboarding({ onboarded: false, seenVersion: undefined, hasData: false })` → `true`
  - `({ onboarded: true, seenVersion: undefined, hasData: false })` → `false`
  - `({ onboarded: false, seenVersion: '1.3.0', hasData: false })` → `false` (actualización)
  - `({ onboarded: false, seenVersion: undefined, hasData: true })` → `false` (datos importados/previos)
- [ ] **Step 2:** `npx vitest run shared/onboarding.test.ts` → FAIL.
- [ ] **Step 3:** Implementar la función y el componente: pantallas a pantalla completa (fondo `--bg`, respetando safe areas), "Saltar" arriba a la derecha, ilustración hecha con HTML/CSS que imita la UI (sin imágenes ni emojis), título, 1–2 frases, puntos de progreso, "Siguiente". Contenido en este orden: Bienvenida → Rutinas → Entrenar (series peso×reps, marcar serie, descanso automático y aviso) → Estadísticas (Perfil e Historial) → IA (Coach en Perfil y conectar IA externa con API key) → Reloj (empezar/seguir, completar series, descanso con vibración, pulso) → Cierre con "Crear cuenta" / "Ahora no". `onDone` guarda `ONBOARDED_KEY` en `localStorage` (try/catch como `WhatsNew.tsx`). En `App.tsx` se muestra si `shouldShowOnboarding(...)` con `hasData = data.workouts.length + data.routines.length > 0`.
- [ ] **Step 4:** e2e en `app.spec.ts`: primera visita muestra el tour; "Saltar" lo cierra; tras recargar no vuelve; con `seed(SAMPLE)` no sale; "Ver tour de nuevo" en Ajustes lo abre. Actualizar el test "entreno completo desde cero" para saltar el tour. Ejecutar `npm test && npm run e2e` → PASS.
- [ ] **Step 5:** Commit `Tour de bienvenida la primera vez`.

### Task 9: Permiso de notificaciones cuando hace falta

**Files:**
- Modify: `android/phone/.../MainActivity.kt:123-127` (quitar la petición al arrancar), `NativeBridge.kt`, `app/src/native.ts`, `app/src/controller.ts` o el punto donde se empieza un entreno (`Train.tsx`)
- Create: `app/src/components/NotifPrompt.tsx`

**Interfaces:**
- Produces (Kotlin): `@JavascriptInterface fun notificationsState(): String` → `"granted" | "denied" | "ask"`; `@JavascriptInterface fun requestNotifications()` que lanza `askNotifications` y responde con `__workstationFromNative({"kind":"notif_result","granted":true|false})`.
- Produces (TS): `native.notificationsState(): 'granted' | 'denied' | 'ask' | 'unsupported'`, `native.requestNotifications(): Promise<boolean>`.
- Produces: `NotifPrompt({ onDone }: { onDone: () => void })` — hoja con explicación ("Te avisamos cuando acabe el descanso y verás el entreno en curso en la pantalla de bloqueo") y botones "Activar avisos" / "Ahora no".

- [ ] **Step 1:** Al empezar un entreno, si `notificationsState() === 'ask'` y no se ha preguntado antes (`localStorage 'ws:notifAsked'`), mostrar `NotifPrompt` antes de arrancar; tanto "Activar" como "Ahora no" arrancan el entreno. Fuera de Android (`unsupported`) no se muestra.
- [ ] **Step 2:** Verificar en emulador (sin test automático posible para el diálogo del sistema): al abrir la app no hay diálogo; al primer entreno sale la explicación en español y luego el del sistema; con "No permitir", el entreno sigue y el segundo entreno no vuelve a preguntar.
- [ ] **Step 3:** Commit `Notificaciones: se piden al empezar el primer entreno`.

### Task 10: Cuenta en Perfil con email

**Files:**
- Modify: `app/src/cloud.ts` (añadir métodos y sustituir `confirm()` de las líneas 90-101), `app/src/components/Profile.tsx`, `app/src/components/CloudSettings.tsx` (queda solo para URL/anon key propias), `app/src/App.tsx`
- Create: `app/src/components/Account.tsx` (tarjeta de Perfil + pantalla de email), `app/src/components/AuthLanding.tsx` (pantallas web "Cuenta confirmada" y "Elige tu nueva contraseña")

**Interfaces:**
- Produces (en `cloud`): `resetPassword(email: string): Promise<void>` (usa `resetPasswordForEmail` con `redirectTo` = URL pública de la web: `import.meta.env.BASE_URL` absoluto en la web, y en el APK la URL de GitHub Pages `https://adriarroyo08.github.io/WorkStation/`), `updatePassword(password: string): Promise<void>`, `signUp` pasa `options.emailRedirectTo` con esa misma URL pública, `builtIn(): boolean` (la config activa es la del build).
- Produces: `CloudState` gana `recovery: boolean` (true tras el evento `PASSWORD_RECOVERY`) y `justConfirmed: boolean` (sesión llegada por enlace de confirmación en la URL).
- Produces: `setAccountSwitchPrompt(fn: (email: string | null) => Promise<'fresh' | 'merge'>): void`; `onSignedIn` lo usa en vez de `confirm()`; por defecto (sin UI registrada) devuelve `'merge'`.
- Produces: `export function AccountCard()` y `export function EmailAuth({ onBack }: { onBack: () => void })` en `Account.tsx`.

- [ ] **Step 1: Tests que fallan** (e2e en `e2e/account.spec.ts`, con `page.route` simulando `**/auth/v1/**` como hace `e2e/sync.spec.ts`; reutilizar su patrón): sin sesión, Perfil muestra arriba "Inicia sesión para sincronizar" con "Continuar con email"; el flujo de registro muestra "Te hemos enviado un email"; con sesión, la tarjeta muestra el email y "Cerrar sesión"; "¿Olvidaste tu contraseña?" llama a `/auth/v1/recover`; al cambiar de cuenta aparece el diálogo propio (no `dialog` del navegador) con "Empezar de cero" / "Subir también estos datos".
- [ ] **Step 2:** `npx playwright test e2e/account.spec.ts` → FAIL.
- [ ] **Step 3:** Implementar. La tarjeta va la primera en Perfil. `AuthLanding` se muestra en la web cuando `recovery` o `justConfirmed`: "Cuenta confirmada. Vuelve a la app e inicia sesión." / formulario de nueva contraseña. Ajustes conserva lo técnico.
- [ ] **Step 4:** `npm run e2e` → PASS (incluido `sync.spec.ts`).
- [ ] **Step 5:** Commit `Cuenta visible en Perfil con email y recuperación`.

### Task 11: Iniciar sesión con Google

**Files:**
- Create: `shared/nonce.ts`, `shared/nonce.test.ts`, `android/phone/src/main/java/com/workstation/app/GoogleSignIn.kt`, `docs/google-login.md`
- Modify: `android/phone/build.gradle.kts` (dependencias `androidx.credentials:credentials`, `androidx.credentials:credentials-play-services-auth`, `com.google.android.libraries.identity.googleid:googleid`; versiones estables actuales), `NativeBridge.kt`, `app/src/native.ts`, `app/src/cloud.ts`, `app/src/components/Account.tsx`, `app/src/env.d.ts`, `.github/workflows/android.yml` y `pages.yml` (env `VITE_GOOGLE_WEB_CLIENT_ID: ${{ vars.VITE_GOOGLE_WEB_CLIENT_ID }}`)

**Interfaces:**
- Produces: `makeNonce(): Promise<{ raw: string; hashed: string }>` en `shared/nonce.ts` (raw aleatorio de 32 bytes en hex; hashed = SHA-256 hex de raw vía `crypto.subtle`).
- Produces (Kotlin): `@JavascriptInterface fun googleSignIn(webClientId: String, hashedNonce: String)` → responde `{"kind":"google_token","token":"…"}`, `{"kind":"google_cancel"}` o `{"kind":"google_error","message":"…"}`.
- Produces (TS): `native.googleSignIn(webClientId: string, hashedNonce: string): Promise<string | null>` (null = cancelado; rechaza en error); `cloud.googleAvailable(): boolean` = `!!import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID && cloud.builtIn()`; `cloud.signInWithGoogle(): Promise<void>` — en Android: `makeNonce` → `native.googleSignIn` → `client.auth.signInWithIdToken({ provider: 'google', token, nonce: raw })`; en web: `client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + import.meta.env.BASE_URL } })`.

- [ ] **Step 1: Test que falla** — `shared/nonce.test.ts`: `raw` tiene 64 caracteres hex; `hashed` es el SHA-256 hex de `raw` (comparar con `createHash('sha256')` de `node:crypto`); dos llamadas dan `raw` distintos.
- [ ] **Step 2:** `npx vitest run shared/nonce.test.ts` → FAIL; implementar; → PASS.
- [ ] **Step 3:** `GoogleSignIn.kt` con Credential Manager (`GetGoogleIdOption` con `setServerClientId(webClientId)`, `setNonce(hashedNonce)`, `setFilterByAuthorizedAccounts(false)`; `GetCredentialCancellationException` → `google_cancel`). Puente y TS según Interfaces.
- [ ] **Step 4:** Botón "Continuar con Google" en `AccountCard` solo si `cloud.googleAvailable()`. Cancelar → sin mensaje. e2e en `account.spec.ts`: sin la variable el botón no está.
- [ ] **Step 5:** `docs/google-login.md` con los pasos manuales de Adrián: SHA-1 de release (`keytool -list -v -keystore android/keystore/workstation.jks -alias workstation`, valor calculado e incluido en el documento), cliente OAuth Web y Android (`com.workstation.app` + SHA-1) en Google Cloud, Supabase → Authentication → Providers → Google (client ID y secret del cliente Web), Supabase → URL Configuration (Site URL `https://adriarroyo08.github.io/WorkStation/` y redirect `http://localhost:5173/**`), y `gh variable set VITE_GOOGLE_WEB_CLIENT_ID`.
- [ ] **Step 6:** `npm test && npm run e2e` y `./gradlew :phone:assembleDebug` → OK. Commit `Iniciar sesión con Google (Android y web)`.

### Task 12: Reloj con el mismo acabado

**Files:**
- Modify: `android/wear/src/main/java/com/workstation/app/WatchUi.kt` (colores líneas 45-49 y pantallas `IdleScreen`, `SetScreen`, `Stepper`, `RestScreen`), `android/wear/src/main/res/values/colors.xml`

- [ ] **Step 1:** Paleta: fondo `#000000`, acento `#F2600C`, superficies `#1F1F1F`, texto `#F2F2F2`/`#8E8E93`; `Ok`, `Purple` y el verde lima desaparecen (serie completada = acento o gris), `Danger` solo para terminar/descartar. Cifras grandes y legibles; márgenes seguros en pantalla redonda.
- [ ] **Step 2:** `./gradlew :wear:assembleDebug`, arrancar el emulador `TicWatch`, instalar y capturar cada pantalla (sin entreno, serie, descanso, confirmar terminar). Expected: nada recortado por el borde redondo, un solo acento.
- [ ] **Step 3:** Commit `Reloj: acabado sobrio con acento naranja`.

### Task 13: Versión 1.4.0 y verificación final

**Files:**
- Modify: `shared/changelog.ts` (entrada `1.4.0`), `app/package.json` (`"version": "1.4.0"`), `CHANGELOG.md`, `README.md` (pestañas, tour, login con Google, enlace a `docs/google-login.md`)

- [ ] **Step 1:** Entrada `1.4.0` en `CHANGELOG`: diseño nuevo más sobrio; tour de bienvenida; cuenta en Perfil con email y Google; Coach ahora en Perfil; la app respeta las barras del móvil; selector de ejercicios a pantalla completa; reloj renovado.
- [ ] **Step 2:** e2e en `app.spec.ts`: con `localStorage ws:seenVersion = '1.3.0'` y `seed(SAMPLE)` aparece "Novedades" con 1.4.0 y no el tour; instalación limpia: tour y no Novedades.
- [ ] **Step 3:** `npm run check && npm run e2e` → todo PASS.
- [ ] **Step 4:** APK release local o del CI instalado en `Pixel_6_Pro` y `TicWatch`: recorrer tour, entreno completo con reloj, login con email; capturas de cada pantalla en oscuro y claro.
- [ ] **Step 5:** Commit `Versión 1.4.0`. No hacer push sin que Adrián lo pida.
