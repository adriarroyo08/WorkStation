# Workstation 🏋️

App personal de entrenamiento de fuerza (estilo Hevy) con **coach IA gratuito** y **servidor MCP**.
Hecha desde cero: no contiene ni deriva de código de Hevy. Puedes traer tus datos de Hevy mediante su exportación CSV o su API pública oficial.

## Qué incluye

| Carpeta | Qué es |
| --- | --- |
| `app/` | PWA (React + Vite). Funciona offline, se instala en el móvil ("Añadir a pantalla de inicio"). Datos en el navegador (IndexedDB). |
| `mcp/` | Servidor MCP (stdio) para que Claude Desktop, Cursor, LM Studio, etc. lean y editen tus entrenamientos. |
| `shared/` | Modelo de datos, estadísticas (1RM de Epley, récords, volumen), importadores de Hevy y cliente IA. |

### Funciones de la app

**Entrenar**
- Registro en vivo: kg/reps, peso corporal (+lastre o asistido), tiempo (con cronómetro) y distancia.
- Tipos de serie: calentamiento, drop set y al fallo. RPE opcional.
- Columna "Anterior" con la sesión previa (toca para copiarla; los calentamientos se emparejan con calentamientos).
- 🏆 Récord en vivo al completar una serie que bate tu marca.
- Superseries, reordenar, reemplazar ejercicio y nota fija por ejercicio.
- Temporizador de descanso por ejercicio, con sonido, vibración y barra de progreso. En superseries arranca tras el último ejercicio del bloque.
- Generador de series de calentamiento y calculadora de discos (barra y discos configurables).
- Pantalla siempre encendida mientras entrenas y aviso de "entrenamiento en curso" en las demás pestañas.
- Al terminar: resumen con récords batidos y distribución muscular, imagen para compartir, "Guardar como rutina" y "Actualizar rutina".

**Rutinas**
- Carpetas, duplicar, mover, compartir como texto y editor serie a serie.
- Explorar 7 programas predefinidos: Cuerpo completo, 5×5, Torso/Pierna, PPL, Arnold split, En casa y Glúteo.
- El Coach IA crea rutinas o programas enteros que guardas con un toque.

**Ejercicios**
- 115 ejercicios en español con imágenes animadas (inicio/fin del movimiento) e instrucciones.
- Catálogo completo de 870+ ejercicios de [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (dominio público).
- Ejercicios personalizados con músculos secundarios.
- Ficha por ejercicio:
  - Gráficas de 1RM estimado, peso máximo, mejor serie, volumen y reps, filtrables por rango.
  - Historial.
  - Cómo hacerlo (con traducción por IA).
  - Récords: mejor peso por número de repeticiones y totales de por vida.

**Historial**: lista agrupada por mes con buscador y calendario. Cada entrenamiento se puede editar (fecha, duración, series), repetir o borrar.

**Perfil**
- Totales y racha de semanas seguidas.
- Gráfico de las últimas 12 semanas (entrenos, duración, volumen, series o reps).
- Distribución muscular (30 días / 3 meses / 1 año), calendario y ejercicios principales.
- **Informes semanales, mensuales y anuales**:
  - Comparación con el periodo anterior y objetivo semanal cumplido.
  - Volumen por día, récords batidos, series por músculo y ejercicios más trabajados.
  - Análisis del coach IA, impresión a PDF y copia como texto.
- **Medidas**: peso, % de grasa y 11 perímetros con gráficas, más fotos de progreso con comparador (las fotos se quedan en el dispositivo).

**Ajustes**: descanso por defecto, objetivo semanal, RPE, sonido/vibración, pantalla encendida, inicio de semana, tema claro/oscuro, barra y discos, IA, backups JSON, exportación CSV compatible con Hevy e importación del CSV de Hevy.

Funciona sin conexión: el catálogo y las imágenes vistas quedan en caché.

## Desarrollo

```bash
npm install && npm test          # tests del código compartido (vitest)
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

## MCP

```bash
cd mcp && npm install && npm run build
```

Añade a la config de tu cliente MCP (en Claude Desktop: *Ajustes → Desarrollador → Editar config*), ver `mcp/claude_desktop_config.example.json`:

```json
{
  "mcpServers": {
    "workstation": {
      "command": "node",
      "args": ["/RUTA/A/workstation/mcp/dist/index.js"],
      "env": { "WORKSTATION_DATA": "/RUTA/A/data.json", "HEVY_API_KEY": "opcional" }
    }
  }
}
```

Herramientas: `training_summary`, `period_report` (informe semanal/mensual/anual), `list_workouts`, `get_workout`, `exercise_history`, `personal_records`, `list_exercises`, `list_routines`, `create_routine` (con superseries), `list_programs`, `add_program`, `log_workout`, `log_measurement`, `import_from_hevy`.

**Sincronización app ↔ MCP:** el servidor trabaja sobre un fichero JSON con el mismo formato que el backup de la app.
Exporta el backup desde la app → guárdalo en la ruta de `WORKSTATION_DATA` → pide a la IA lo que quieras (p. ej. "créame una rutina de pierna") → importa ese fichero de nuevo en la app (se fusiona sin duplicar).

## Importar desde Hevy

- **CSV (gratis):** en Hevy, Perfil → Ajustes → Exportar e importar datos → Exportar entrenamientos. Luego en Workstation: Ajustes → *Importar CSV exportado de Hevy*.
- **API oficial (Hevy Pro):** saca tu key en https://hevy.com/settings?developer, ponla en `HEVY_API_KEY` del MCP y pide a la IA "importa mis entrenamientos de Hevy".
