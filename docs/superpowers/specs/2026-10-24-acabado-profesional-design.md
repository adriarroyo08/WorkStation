# Workstation: acabado profesional, tour de bienvenida y cuentas

Fecha: 2026-10-24 · Estado: borrador para aprobar

## Por qué

Adrián usa Hevy a diario y quiere que Workstation transmita lo mismo: una app de entrenamiento seria, sobria y sencilla.
Hoy la app "parece hecha por IA" (degradados naranja→rosa con brillo, emojis como iconos, tarjetas grandes anidadas,
pestaña "Coach" con destellos) y tiene fallos visibles en el móvil real: el contenido se mete debajo de la barra de
notificaciones y de la barra de gestos, y la pantalla de añadir ejercicio se corta a mitad con media pantalla en negro.
Además, quien abre la app por primera vez no recibe ninguna explicación, y las cuentas están escondidas en Ajustes.

Éxito = al abrir el APK en un móvil Android (y la app del reloj) nada choca con las barras del sistema, ninguna pantalla
tiene huecos o cortes, el aspecto es plano y coherente en todas las pantallas, un usuario nuevo entiende la app gracias
al tour, y puede crear cuenta / iniciar sesión (email o Google) desde un sitio visible.

## Alcance

Todo el producto: web/PWA (`app/`, que también va dentro del APK del móvil), contenedor Android del móvil
(`android/phone`) y app Wear OS (`android/wear`).

### Objetivos

1. **Estilo visual nuevo (opción "C · Oscuro + naranja plano", elegida por Adrián)** aplicado a toda la app.
2. **Bordes correctos** en móviles reales: nada debajo de la barra de estado ni de la barra de gestos/navegación.
3. **Revisión pantalla por pantalla**: cortes, huecos, desbordes, alineaciones.
4. **Quitar la pestaña Coach** y moverla dentro de Perfil (decisión de Adrián).
5. **Tour de bienvenida la primera vez** (formato "A · pantallas de bienvenida", elegido por Adrián).
6. **Cuentas**: iniciar sesión / crear cuenta con email y contraseña **y con Google** (decisión de Adrián), desde un sitio visible.
7. **Reloj (Wear OS)** con el mismo acabado (decisión de Adrián).

### No objetivos

- No cambiar la lógica de entreno, sincronización, cálculo de estadísticas ni el esquema de Supabase (salvo lo que
  exija el login con Google, que no toca tablas).
- No añadir funciones nuevas fuera de las listadas.
- No iOS (no hay app iOS; la web sigue funcionando en Safari como hasta ahora).

### Anti-objetivos (fracaso aunque "funcione")

- Que siga habiendo degradados, brillos, emojis como iconos o el look "IA".
- Obligar a crear cuenta para usar la app: **la app se usa sin cuenta desde el primer segundo** (decisión de Adrián: "después").
- Perder datos locales al iniciar sesión.
- Un tour que no se pueda saltar.
- Romper los tests existentes (vitest, e2e de Playwright, `layout.spec.ts`, `a11y.spec.ts`).

## Lo que decidió Adrián

| Tema | Decisión |
|---|---|
| Referencia | Hevy: profesionalidad y sencillez |
| Estilo | **C**: base casi negra, un único acento naranja **plano**, sin efectos |
| Pestañas | 4: Entrenar, Historial, Ejercicios, Perfil. Coach pasa a Perfil |
| Login | Opcional, **después**; la app se usa sin cuenta |
| Métodos de login | Email + contraseña **y Google** |
| Tour | **A**: 5-6 pantallas a pantalla completa, con "Saltar" |
| Contenido del tour | Crear rutinas · cómo funciona el entreno (ejercicios, series, descansos) · dónde ver estadísticas · conectar la IA · entrenar desde el reloj |
| Reloj | Entra en el alcance |

## Diseño

### 1. Sistema visual (opción C)

Referencia visual: maqueta `estilo-visual.html` (opción C) en `.superpowers/brainstorm/`.

- **Color**: fondo oscuro `#141414`, superficies `#1f1f1f`, divisores `#2a2a2a`, texto `#f2f2f2`, texto secundario
  `#8e8e93`, **acento único naranja plano `#f2600c`**. Modo claro equivalente: fondo blanco, superficies `#f4f4f6`,
  divisores `#ececec`, texto `#111`, mismo naranja. El modo claro/oscuro sigue siendo automático (y el ajuste manual existente se mantiene).
  Colores semánticos (rojo de borrar/descartar, verde/rojo de deltas de progreso) se mantienen pero apagados y planos.
- **El naranja solo** en: acción principal de cada pantalla, pestaña activa, progreso, enlaces de acción. Todo lo demás en grises.
- **Sin efectos**: fuera todos los `linear-gradient` decorativos, sombras de color/brillo bajo botones, anillo de progreso con degradado,
  barras de gráfico con degradado, el banner "Tu 2026 en Workstation" con degradado (se queda como fila/tarjeta plana).
- **Iconos**: solo lucide (ya instalado), línea fina, color de texto. **Ningún emoji como icono** (bienvenida, importar, logros, rachas, Coach…).
  Los logros pueden mantener su identidad con un icono lucide por logro.
- **Forma**: radios más pequeños (≈8 px botones, ≈10-12 px tarjetas), menos relleno, nada de tarjetas dentro de tarjetas.
  Preferir **listas con divisores** (rutinas, historial, ejercicios, ajustes) a tarjetas grandes.
- **Tipografía**: Inter (ya instalada). Título de pantalla más contenido (~22-24 px, hoy es mucho más grande), etiquetas de sección
  pequeñas en mayúsculas grises, cifras con peso medio. Más datos por pantalla.
- Ejemplo de referencia de la pantalla Entrenar: progreso semanal como 7 casillas de la semana (o equivalente sobrio) en lugar del anillo grande;
  botón "Empezar entrenamiento vacío"; "Nueva rutina" y "Explorar" como botones secundarios con borde; rutinas como filas.

Implementación: los estilos viven en `app/src/styles.css` (≈42 KB, con variables CSS). Se espera reescribir los tokens y
limpiar las reglas decorativas, no añadir librerías de UI.
El test e2e "todas las pestañas cargan" comprueba el color de fondo exacto (`rgb(12, 10, 9)` / `rgb(251, 248, 245)`): **actualizarlo a los nuevos valores**.
`android/phone/src/main/res/values/colors.xml` y `themes.xml` deben usar el mismo fondo para que no haya destello de color al arrancar.

### 2. Bordes y barras del sistema

Hallazgo verificado en emulador Pixel (API 36): el título "Entrenar" se dibuja sobre el reloj/batería, la barra de gestos tapa las
etiquetas de las pestañas, y en modo claro los iconos de la barra de estado son blancos sobre fondo claro.

Causa: `android/phone/.../MainActivity.kt:59-63` aplica los insets como `padding` del propio `WebView`, que no desplaza su contenido.

Requisitos:
- El contenido nunca se dibuja debajo de la barra de estado ni de la barra de gestos/navegación, en Android 15+ (edge-to-edge forzado) y en versiones anteriores.
  Teclado abierto: el campo enfocado sigue visible (hoy se tiene en cuenta el IME; mantenerlo).
- La barra de pestañas queda por encima de la barra de gestos; su fondo puede extenderse por detrás de ella (como Hevy), pero etiquetas e iconos no.
- Iconos de la barra de estado oscuros en modo claro y claros en modo oscuro, siguiendo el tema efectivo de la app (incluido el ajuste manual).
- En la web/PWA, mismo comportamiento con `env(safe-area-inset-*)` (ya se usa en algunos sitios; revisar todos los elementos fijos: pestañas, banner de entreno activo, toasts, hojas/modales, botones flotantes).
- Cómo hacerlo (contenedor con padding, o pasar los insets al CSS como variables) lo decide el constructor.

### 3. Revisión pantalla por pantalla

Recorrer **todas** las pantallas y hojas en 360 px y en el emulador, oscuro y claro. Fallos ya vistos:

- **Añadir ejercicio** (`ExercisePicker.tsx`): la hoja ocupa media pantalla y el resto queda en negro; al desplazar, la cabecera
  desaparece; las filas no ocupan todo el ancho (cada una mide lo que su texto). Debe ser **una pantalla completa** con buscador y
  filtros fijos arriba, lista a todo el ancho que se desplaza dentro, y botón de confirmar/cerrar accesible. Las e2e tocan
  `.exrow` tras buscar: hoy fallan por "fuera del viewport" si se desplaza; deben pasar.
- Entreno vacío: el área de notas tiene un tirador de redimensionar visible; mucho espacio vacío.
- Revisar también: Historial, detalle de entreno, Ejercicios y ficha, Perfil y sus subpantallas (Informes, Medidas, Logros, Ajustes, Cuenta, API keys, Copias), editor de rutinas, Explorar programas, Resumen "¡Buen trabajo!", Wrapped, Novedades, rutina compartida, temporizador de descanso.

### 4. Navegación: Coach dentro de Perfil

- Barra inferior con 4 pestañas: Entrenar, Historial, Ejercicios, Perfil.
- Coach se abre desde una fila/tarjeta en Perfil, junto a Informes y Medidas, con su propia pantalla y botón de volver.
  Los textos que dicen "pídesela al Coach IA" deben llevar a ese sitio.

### 5. Tour de bienvenida

Referencia visual: maqueta `tour-formato.html` (opción A).

- Se muestra **la primera vez que se abre la app** (sin datos previos), antes de la pantalla principal. Pantallas a pantalla completa con
  ilustración sencilla (maqueta en CSS/SVG de la propia UI, no fotos ni emojis), título, una o dos frases, puntos de progreso, "Siguiente" y "Saltar".
- Pantallas, en este orden:
  1. Bienvenida: qué es Workstation, en una frase.
  2. **Rutinas**: crear una rutina o elegir un programa en Explorar.
  3. **Entrenar**: añadir ejercicios, registrar series (peso × reps), marcar la serie y el descanso arranca solo; aviso al terminar el descanso.
  4. **Estadísticas**: dónde están (Perfil: progreso, informes, récords; Historial).
  5. **IA**: Coach en Perfil y conectar una IA externa con API key (MCP).
  6. **Reloj**: empezar/seguir el entreno desde Wear OS, completar series y descansos con vibración, pulso.
  7. Cierre: "Crear cuenta" (sincroniza móvil, web y reloj) o "Ahora no".
  (Bienvenida + 5 temas + cierre; el constructor puede fusionar bienvenida y cierre si quedan 6.)
- Se recuerda que ya se vio (no vuelve a salir). Usuarios que ya tienen datos (actualización desde una versión anterior) **no** lo ven automáticamente.
- Se puede volver a ver desde Perfil → Ajustes ("Ver tour de nuevo") — decisión mía.
- La tarjeta "Bienvenido a Workstation / Tres formas de empezar" actual se mantiene como estado vacío de Entrenar pero rediseñada (sin emojis); el constructor decide si se simplifica.

### 6. Permiso de notificaciones

Hoy el APK pide permiso de notificaciones al arrancar (`MainActivity.kt:120-127`), en inglés y sin contexto, encima del tour.
Debe pedirse **la primera vez que hace falta** (al empezar el primer entreno, para el aviso de descanso y la notificación en curso),
precedido de una explicación breve en español dentro de la app. Decisión mía; si se rechaza, la app funciona sin avisos.

### 7. Cuentas

Hoy existe login con email/contraseña de Supabase (`app/src/cloud.ts`, `CloudSettings.tsx`) escondido en Perfil → Ajustes → Cuenta y sincronización.

- **Ubicación**: arriba del todo en Perfil.
  - Sin sesión: tarjeta "Inicia sesión para sincronizar" con "Continuar con Google" y "Continuar con email".
  - Con sesión: avatar/inicial, nombre o email, estado de sincronización, acceso a gestionar cuenta (cerrar sesión, borrar cuenta si ya existe).
- **Email**: pantalla propia (no un bloque en Ajustes) con iniciar sesión / crear cuenta / "¿Olvidaste tu contraseña?" (Supabase `resetPasswordForEmail`).
  Supabase pide confirmar el email al registrarse: mostrar claramente "te hemos enviado un email".
  **Los enlaces de los emails (confirmación y recuperar contraseña) abren la web** (GitHub Pages), también desde el móvil
  (decisión de Adrián; nada de App Links). La web necesita una pantalla "Cuenta confirmada, vuelve a la app e inicia sesión" y otra
  "Elige tu nueva contraseña" (evento `PASSWORD_RECOVERY` de Supabase). La URL de Pages debe estar como Site URL / redirect en
  Supabase → Authentication → URL Configuration (paso manual de Adrián, en las instrucciones).
- **Google**:
  - **APK**: Google bloquea su login dentro de WebView. Usar el login nativo de Android (Credential Manager / "Sign in with Google")
    en `android/phone`, exponerlo al web por el puente existente (`NativeBridge.kt` / `app/src/native.ts`), obtener el ID token y
    llamar a `supabase.auth.signInWithIdToken({ provider: 'google', token })`.
  - **Web/PWA**: `signInWithOAuth({ provider: 'google' })` con redirección.
  - **Requiere configuración manual de Adrián** (no la puede hacer el constructor): en Google Cloud Console crear un cliente OAuth
    "Web" (su ID va a Supabase y a la app) y uno "Android" con el paquete `com.workstation.app` y el **SHA-1 de la clave de firma de release**
    (la del secret `WS_KEYSTORE_B64`); en Supabase → Authentication → Providers activar Google con el cliente web y añadir las URLs de
    redirección de la web (GitHub Pages) y `localhost`. El constructor debe entregar estas instrucciones paso a paso con el SHA-1 calculado.
    El ID del cliente web llega al build como variable (`VITE_GOOGLE_WEB_CLIENT_ID` en el repo, igual que `VITE_SUPABASE_*`).
  - Si Google no está configurado, el botón de Google no aparece (la app no debe romperse). "Configurado" = existe
    `VITE_GOOGLE_WEB_CLIENT_ID` **y** la app usa el Supabase integrado en el build; quien ponga su propio Supabase en Ajustes
    solo ve email (decisión mía: el cliente de Google está atado al proyecto de Adrián).
- **Datos locales**: al iniciar sesión por primera vez, lo registrado sin cuenta se sube y se fusiona (el sync actual ya resuelve por
  "gana el más reciente"; verificar que el primer login sube los datos locales y no los pisa).
  Se **mantiene** la pregunta que ya existe cuando entra **otra** cuenta distinta en el mismo dispositivo (`cloud.ts:90-101`,
  "empezar de cero tras copia" / "subir también los datos"), pero como diálogo propio de la app con el nuevo estilo, no `confirm()`
  nativo (decisión mía: conserva la regla de la auditoría 1.2.0 de no mezclar cuentas).
- El tour termina ofreciendo crear cuenta (ver §5); el inicio de la app nunca exige cuenta.
- Ajustes conserva lo técnico (URL/anon key manuales para quien use su propio Supabase, API keys, copias de seguridad).

### 8. Reloj (Wear OS)

`android/wear` (Compose for Wear OS, `WatchUi.kt`). Aplicar el mismo lenguaje: negro puro de fondo (OLED), naranja `#f2600c` como único
acento, tipografía clara con cifras grandes, sin degradados. Respetar pantallas redondas (márgenes seguros, listas con escalado de
Wear si hay listas). Revisar todas sus pantallas: sin entreno, serie actual, completar serie, descanso con cuenta atrás, pulso,
empezar/terminar. Verificar en el emulador `TicWatch` (redondo).

## Versión

Sale como **1.4.0** con su entrada en Novedades (rediseño, tour, cuentas con Google, Coach ahora en Perfil). Quien instala de cero
ve el tour y no Novedades; quien actualiza ve Novedades y no el tour. Decisión mía.

## Verificación

- Emulador `Pixel_6_Pro` (API 36) con el APK compilado: capturas de cada pantalla en oscuro y claro, sin solapes con las barras.
- Emulador `TicWatch` con el APK del reloj.
- Playwright a 360 px (dispositivo `Pixel 7` del config) para iterar rápido.
- Pasan `npm test` (vitest), las e2e existentes (actualizando las que dependan de colores/estructura que cambian a propósito) y el
  workflow de Android en GitHub Actions.
- Añadir e2e: el tour sale la primera vez y no la segunda; "Saltar" funciona; la lista de añadir ejercicio ocupa toda la pantalla y se puede tocar un ejercicio tras desplazar; solo 4 pestañas.

## Queda a criterio del constructor

- Cómo estructurar el CSS (reescritura de tokens vs. limpieza incremental) y los componentes del tour.
- La técnica exacta de insets.
- Ilustraciones del tour (dentro de lo dicho: sin emojis ni fotos).
- Orden de trabajo, siempre que cada paso deje la app usable.
