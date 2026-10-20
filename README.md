# Workstation 🏋️

App personal de entrenamiento de fuerza (estilo Hevy) con **coach IA gratuito** y **servidor MCP**.
Hecha desde cero: no contiene ni deriva de código de Hevy. Puedes traer tus datos de Hevy mediante su exportación CSV o su API pública oficial.

## Qué incluye

| Carpeta | Qué es |
| --- | --- |
| `app/` | PWA (React + Vite). Funciona offline, se instala en el móvil ("Añadir a pantalla de inicio"). Datos en el navegador (IndexedDB). |
| `mcp/` | Servidor MCP local (stdio) y fuente de la función MCP remota (`src/edge.ts`). |
| `supabase/` | Esquema SQL (sincronización y API keys) y la Edge Function `mcp` (servidor MCP remoto, generado con `npm --prefix mcp run build:edge`). |
| `shared/` | Modelo de datos, estadísticas (1RM de Epley, récords, volumen), lógica del entreno en curso, protocolo del reloj, importadores de Hevy y cliente IA. |
| `android/phone` | App Android: la misma web empaquetada en un WebView, más puente nativo (reloj, alarma de descanso, notificación en curso, guardar/compartir archivos). |
| `android/wear` | App Wear OS (Compose for Wear OS): serie actual, completar series, descanso con vibración, pulso del reloj y empezar/terminar desde la muñeca. |

### Funciones de la app

**Entrenar**
- Registro en vivo: kg/reps, peso corporal (+lastre o asistido), tiempo (con cronómetro) y distancia.
- Tipos de serie: calentamiento, drop set y al fallo. RPE opcional.
- Columna "Anterior" con la sesión previa (toca para copiarla; los calentamientos se emparejan con calentamientos).
- 🏆 Récord en vivo al completar una serie que bate tu marca.
- 📈 Sugerencia de progresión por ejercicio ("Hoy: 82,5 kg × 8") según tu última sesión. Un toque la aplica.
- Siguiente serie resaltada, desplazamiento automático y "Siguiente: …" en la barra de descanso.
- Deshacer al borrar series, ejercicios o entrenamientos.
- Superseries, reordenar, reemplazar ejercicio y nota fija por ejercicio.
- Temporizador de descanso por ejercicio, con sonido, vibración y barra de progreso. En superseries arranca tras el último ejercicio del bloque.
- Generador de series de calentamiento y calculadora de discos (barra y discos configurables).
- Pantalla siempre encendida mientras entrenas y aviso de "entrenamiento en curso" en las demás pestañas.
- Al terminar: resumen con récords batidos y distribución muscular, imagen para compartir, "Guardar como rutina" y "Actualizar rutina".

- 📅 **Hoy toca**: la pantalla de inicio sugiere la siguiente rutina de tu programa (rota dentro de la carpeta) y la empiezas con un toque.
- 🔋 **Recuperación muscular**: mapa corporal y porcentaje por músculo según las series de los últimos 3 días.
- ⚖️ **Frente a la última vez**: cada entreno se compara con la sesión anterior de la misma rutina (volumen, series, reps y duración).

**Rutinas**
- Carpetas, duplicar, mover, compartir como texto y editor serie a serie.
- Explorar 7 programas predefinidos: Cuerpo completo, 5×5, Torso/Pierna, PPL, Arnold split, En casa y Glúteo.
- El Coach IA crea rutinas o programas enteros que guardas con un toque.

**Ejercicios**
- 115 ejercicios en español con imágenes animadas (inicio/fin del movimiento) e instrucciones.
- 🎞️ **GIFs animados de ExerciseDB** (1.300+ ejercicios) con tu propia API key de RapidAPI (hay plan gratuito): *Ajustes → GIFs de ejercicios → Guardar y vincular*. Se vinculan solos por nombre y puedes cambiar el GIF desde la ficha de cada ejercicio. La key y los GIFs se guardan solo en tu dispositivo, quedan en caché para usarlos sin conexión, y las miniaturas no gastan cuota.
- 🎬 **Animaciones propias, gratis e ilimitadas**: 113 ejercicios de la biblioteca traen su propia animación WebP (generada a partir de las fotos de dominio público de free-exercise-db) que se sirve con la app y funciona sin conexión. Si tienes key de ExerciseDB, se usa primero su GIF. Para regenerarlas: `python3 scripts/build-anims.py` (requiere Pillow).
- Catálogo completo de 870+ ejercicios de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (dominio público).
- Ejercicios personalizados con músculos secundarios.
- Ficha por ejercicio:
  - Gráficas de 1RM estimado, peso máximo, mejor serie, volumen y reps, filtrables por rango.
  - Historial.
  - Cómo hacerlo (con traducción por IA).
  - Récords: mejor peso por número de repeticiones, tabla de porcentajes del 1RM y totales de por vida.

**Historial**: lista agrupada por mes con buscador y calendario. Cada entrenamiento se puede editar (fecha, duración, series), repetir o borrar.

**Perfil**
- Totales y racha de semanas seguidas.
- Gráfico de las últimas 12 semanas (entrenos, duración, volumen, series o reps).
- Mapa corporal y distribución muscular (30 días / 3 meses / 1 año), calendario, mapa de actividad del último año y ejercicios principales.
- 🏅 21 logros (constancia, rachas, toneladas, récords, clubs de 100/140/180 kg…), celebrados al terminar el entreno.
- **Informes semanales, mensuales y anuales**:
  - Comparación con el periodo anterior y objetivo semanal cumplido.
  - Volumen por día, récords batidos, series por músculo y ejercicios más trabajados.
  - Análisis del coach IA, impresión a PDF y copia como texto.
- **Medidas**: peso, % de grasa y 11 perímetros con gráficas, más fotos de progreso con comparador (las fotos se quedan en el dispositivo).

**Ajustes**: descanso por defecto, objetivo semanal, RPE, sonido/vibración, pantalla encendida, inicio de semana, tema claro/oscuro, barra y discos, IA, backups JSON, exportación CSV compatible con Hevy e importación del CSV de Hevy.

Funciona sin conexión: el catálogo y las imágenes vistas quedan en caché.

## ☁️ Cuenta y sincronización (Supabase, opcional)

Sin cuenta, todo se guarda solo en tu dispositivo. Con Supabase (plan gratuito) tus datos se sincronizan entre móvil, web y app Android, y quedan copiados en tu propia base de datos.

1. Crea un proyecto en https://supabase.com.
2. En **SQL Editor**, pega y ejecuta `supabase/migrations/001_records.sql`. Crea la tabla `records`, con seguridad por usuario (RLS) y tiempo real.
3. En **Project Settings → API**, copia la *Project URL* y la *anon public key*.
4. En la app, ve a *Perfil → Ajustes → ☁️ Cuenta y sincronización*, pega los dos valores, crea tu cuenta e inicia sesión. Supabase te enviará un email de confirmación; puedes desactivarlo en *Authentication → Providers → Email*.

Cómo funciona:
- Cada entreno, rutina, carpeta, ejercicio, medida y tus ajustes es una fila. Se suben solo los cambios.
- Si dos dispositivos cambian lo mismo, gana el cambio más reciente.
- Sin conexión, los cambios esperan en cola y se suben al volver la red. El resto de dispositivos se actualiza en tiempo real.
- No se sincronizan el entreno en curso, las API keys ni las fotos de progreso.
- La *anon key* es pública por diseño: la seguridad la ponen las políticas RLS. Si prefieres que la app ya venga configurada, puedes definirla en el build con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## ⌚ Android y Wear OS

```
 Reloj Wear OS ──comandos (MessageClient)──▶ App Android (WebView + puente) ──▶ la web (misma app)
      ▲                                              │
      └──────────estado del entreno (Data Layer)─────┘   + alarma de descanso y notificación en curso
```

**En el reloj:**
- Ver el ejercicio y la serie actual, con el peso y las reps de la sesión anterior.
- Ajustar kg/reps con − / + y completar la serie (✓).
- Navegar entre series (◀ ▶).
- Pantalla de descanso con cuenta atrás circular, −15/+15/saltar y vibración al terminar.
- Pulso del sensor del reloj: se envía al móvil y se guarda en el entreno (media, máxima, mínima y gráfica).
- Empezar una rutina o un entreno vacío desde la muñeca, y terminar y guardar el entreno.

**En el móvil (app Android):**
- Todo lo de la web.
- Notificación fija con cronómetro (o cuenta atrás del descanso).
- Alarma exacta de fin de descanso con la pantalla apagada (también vibra en el reloj).
- Los backups, CSV e imágenes se guardan o comparten con el selector del sistema.

**Sin la app Android:** la web acepta pulsómetros Bluetooth con perfil estándar *Heart Rate* (Chrome).

### Conseguir las APKs
El workflow `.github/workflows/android.yml` compila `workstation-phone.apk` y `workstation-wear.apk` en cada push a `main`:
- **Actions → último run → Artifacts → workstation-apks**.
- Si creas un tag `v0.3.0`, también se publican en **Releases**.

Las dos APKs se firman con la misma clave, que es lo que permite que el reloj y el móvil se hablen. **La clave no está en el repo** (es público): guárdala como secrets del repositorio en *Settings → Secrets and variables → Actions*:
- `WS_KEYSTORE_B64`: el `.jks` en base64 (`base64 -w0 workstation.jks`).
- `WS_KEYSTORE_PASSWORD`, `WS_KEY_ALIAS` y `WS_KEY_PASSWORD` (si no los defines, se usa `workstation`).

Sin el secret, el workflow genera una clave temporal en cada build. Funciona, pero para actualizar habría que desinstalar, y se perderían los datos de la app. En local la clave se busca en `android/keystore/workstation.jks`, que está ignorado por git.

### Instalar
1. **Móvil:** abre `workstation-phone.apk` y permite "instalar apps desconocidas". Acepta las notificaciones.
2. **Reloj** (Wear OS 3+, p. ej. Pixel Watch o Galaxy Watch 4+):
   1. Ajustes → Sistema → Información → toca 7 veces "Número de compilación".
   2. Opciones de desarrollador → activa **Depuración ADB** y **Depuración inalámbrica**.
   3. Desde un ordenador en la misma Wi-Fi:
      ```bash
      adb pair IP_DEL_RELOJ:PUERTO_DE_EMPAREJAMIENTO   # código que muestra el reloj
      adb connect IP_DEL_RELOJ:PUERTO
      adb install workstation-wear.apk
      ```
   Alternativa sin ordenador: apps tipo "Bugjaeger" o "Wear Installer" desde el móvil.
3. Abre Workstation en el móvil, empieza un entreno y abre Workstation en el reloj (o pulsa ⌚ → "Abrir Workstation en el reloj"). Al empezar el primer entreno, el reloj pide permiso para leer el pulso.

> La app Android guarda sus datos aparte de la web del navegador. Para pasarte, exporta el backup JSON en la web e impórtalo en la app.

## 🎬 Vídeo promocional

`video/` es un proyecto de [Remotion](https://www.remotion.dev/) (vídeo hecho con React). Usa capturas reales de la app en modo oscuro y claro, con escenas animadas para cada función, el reloj Wear OS y un cierre con llamada a la acción.

```bash
cd video && npm install
npm run studio        # editor visual en el navegador
npm run render        # vertical 1080×1920 (reels/stories) → out/workstation-promo.mp4
npm run render:wide   # horizontal 1920×1080 (YouTube/web) → out/workstation-promo-wide.mp4
```

Para regenerar las capturas: arranca la app (`npm --prefix app run build && npx --prefix app vite preview`) y ejecuta el script de capturas con Playwright. Remotion es gratis para uso personal y empresas pequeñas (ver su licencia).

## Desarrollo

```bash
npm install && npm test          # tests del código compartido (vitest)
npm run e2e                      # tests de extremo a extremo con Playwright (requiere el build de app/)
npm run catalog                  # regenera app/public/catalog.json desde free-exercise-db
```

## Uso rápido

```bash
cd app && npm install && npm run dev      # http://localhost:5173
```

Al hacer push a `main`, el workflow `.github/workflows/pages.yml` la publica en GitHub Pages
(activa *Settings → Pages → Source: GitHub Actions* en el repo). Desde el móvil abre la URL y "Añadir a pantalla de inicio".

## IA gratis (API key)

En la app: **Ajustes → Inteligencia artificial**. Proveedores con nivel gratuito (todos con API compatible OpenAI):

| Proveedor | Dónde sacar la key | Modelo por defecto |
| --- | --- | --- |
| Google Gemini | https://aistudio.google.com/apikey | `gemini-2.5-flash` |
| Groq | https://console.groq.com/keys | `llama-3.3-70b-versatile` |
| OpenRouter | https://openrouter.ai/keys | `meta-llama/llama-3.3-70b-instruct:free` |
| Ollama (local) | no necesita | `llama3.2` (arráncalo con `OLLAMA_ORIGINS="*" ollama serve`) |

Los límites y nombres de modelos gratuitos cambian; si uno falla, cambia el modelo en Ajustes. La key se guarda solo en tu dispositivo y las llamadas van directas del navegador al proveedor.

## 🔌 Conectar una IA a tus datos (MCP + API key)

La app genera **API keys personales** (`ws_…`) para que una IA (Claude, Cursor, ChatGPT con MCP…) lea, y si quieres escriba, tus entrenamientos. Requiere la cuenta de Supabase de la sección anterior.

**1. Prepara Supabase (una vez)**
- En el SQL Editor, ejecuta `supabase/migrations/002_api_keys.sql`. Crea la tabla `api_keys` (solo guarda hashes) y las funciones seguras `api_records` / `api_upsert`.
- Para el MCP remoto, despliega la función `supabase/functions/mcp`. Tienes dos formas:
  - Con la CLI: `npx supabase login && npx supabase functions deploy mcp --project-ref TU_REF --no-verify-jwt`
  - Automática: añade los secrets `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF` al repo, y el workflow `supabase.yml` la desplegará en cada cambio.

**2. Genera la key en la app**
*Perfil → Ajustes → 🔌 Acceso para IA (MCP) → Generar API key*. Elige "solo lectura" o "lectura y escritura". La key se muestra una vez, junto con la configuración lista para copiar. Puedes revocarla cuando quieras y ver cuándo se usó por última vez.

**3. Conecta tu IA**
- **MCP remoto** (HTTP): `https://TU_PROYECTO.supabase.co/functions/v1/mcp` con la cabecera `Authorization: Bearer ws_…`.
  - Claude Code: `claude mcp add --transport http workstation https://TU_PROYECTO.supabase.co/functions/v1/mcp --header "Authorization: Bearer ws_…"`
  - Clientes que solo aceptan una URL (p. ej. conectores personalizados): `…/functions/v1/mcp?key=ws_…`. La key queda en la URL, así que trátala como una contraseña.
- **MCP local** (Claude Desktop, Cursor, LM Studio): `cd mcp && npm install && npm run build` y, en la configuración del cliente:
  ```json
  {
    "mcpServers": {
      "workstation": {
        "command": "node",
        "args": ["/RUTA/A/WorkStation/mcp/dist/index.js"],
        "env": {
          "WORKSTATION_API_KEY": "ws_…",
          "WORKSTATION_SUPABASE_URL": "https://TU_PROYECTO.supabase.co",
          "WORKSTATION_SUPABASE_ANON_KEY": "eyJ…"
        }
      }
    }
  }
  ```
  Sin cuenta en la nube, el servidor local también funciona con un fichero: `WORKSTATION_DATA=/ruta/backup.json`, el backup exportado desde la app.

Herramientas: `training_summary`, `list_workouts`, `get_workout`, `exercise_history`, `period_report`, `personal_records`, `achievements`, `suggest_next`, `today_plan`, `list_exercises`, `list_routines`, `list_programs`, y, con permiso de escritura, `create_routine`, `add_program`, `log_workout`, `log_measurement` e `import_from_hevy`. Lo que escribe la IA aparece en la app al sincronizar.

## Importar desde Hevy

- **CSV (gratis):** en Hevy, Perfil → Ajustes → Exportar e importar datos → Exportar entrenamientos. Luego en Workstation: Ajustes → *Importar CSV exportado de Hevy*.
- **API oficial (Hevy Pro):** saca tu key en https://hevy.com/settings?developer, ponla en `HEVY_API_KEY` del MCP y pide a la IA "importa mis entrenamientos de Hevy".
