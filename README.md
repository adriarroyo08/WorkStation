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
- Entrenamiento en vivo: series con kg/reps (o tiempo/distancia), tipos de serie (calentamiento, drop, fallo), columna "Anterior" con la sesión previa, temporizador de descanso con vibración.
- Rutinas: crear, editar, reordenar y empezar desde rutina.
- Historial con volumen, duración y series.
- Progreso por ejercicio: gráfica de 1RM estimado, peso máximo, volumen y reps; récords personales (avisa al batir uno).
- Peso corporal.
- **Coach IA**: chat con contexto de tu historial; si te propone una rutina, se guarda con un toque.
- Backup/restauración en JSON e **importación del CSV de Hevy**.

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

Herramientas: `training_summary`, `list_workouts`, `get_workout`, `exercise_history`, `personal_records`, `list_exercises`, `list_routines`, `create_routine`, `log_workout`, `log_measurement`, `import_from_hevy`.

**Sincronización app ↔ MCP:** el servidor trabaja sobre un fichero JSON con el mismo formato que el backup de la app.
Exporta el backup desde la app → guárdalo en la ruta de `WORKSTATION_DATA` → pide a la IA lo que quieras (p. ej. "créame una rutina de pierna") → importa ese fichero de nuevo en la app (se fusiona sin duplicar).

## Importar desde Hevy

- **CSV (gratis):** en Hevy, Perfil → Ajustes → Exportar e importar datos → Exportar entrenamientos. Luego en Workstation: Ajustes → *Importar CSV exportado de Hevy*.
- **API oficial (Hevy Pro):** saca tu key en https://hevy.com/settings?developer, ponla en `HEVY_API_KEY` del MCP y pide a la IA "importa mis entrenamientos de Hevy".
