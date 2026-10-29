# Privacidad

Workstation es una app personal: **no tiene servidores propios, ni analítica, ni publicidad, ni cookies de seguimiento.**

## Qué se guarda y dónde

| Dato | Dónde | Sale del dispositivo |
| --- | --- | --- |
| Entrenamientos, rutinas, ejercicios, medidas y ajustes | En tu navegador o en la app Android (IndexedDB) | Solo si activas la sincronización |
| Copias automáticas | En el dispositivo (IndexedDB) | No |
| Fotos de progreso | En el dispositivo (IndexedDB) | No: nunca se sincronizan ni se envían |
| API keys (IA, ExerciseDB) | En el dispositivo | Solo al servicio al que pertenecen |
| Pulso del reloj o pulsómetro | Dentro del entrenamiento en el que lo registras | Igual que el resto del entrenamiento |

## Servicios externos (todos opcionales y configurados por ti)

- **Supabase (cuenta y sincronización):** tus datos se copian en *tu propio* proyecto de Supabase, protegidos con seguridad por usuario (RLS). Workstation no tiene acceso a ese proyecto.
- **Coach IA:** cuando usas el coach o el análisis de informes, se envía al proveedor que elijas (Gemini, Groq, OpenRouter, un modelo local…) un resumen de tu entrenamiento y tu pregunta. Se aplica la política de privacidad de ese proveedor.
- **API keys y servidor MCP:** una IA solo puede leer tus datos con una API key que generes tú. En la base de datos se guarda solo su hash (SHA-256) y puedes revocarla en cualquier momento.
- **ExerciseDB (RapidAPI):** se piden los GIFs de los ejercicios con tu clave. No se envían datos de tus entrenamientos.
- **Imágenes de free-exercise-db:** se descargan de `raw.githubusercontent.com` (GitHub ve la petición, como en cualquier web).
- **Importar desde Hevy:** el CSV exportado de Hevy se procesa en tu dispositivo. Desde el servidor MCP también puedes importar con tu API key de Hevy (variable de entorno en tu ordenador). No se envía nada a Hevy.
- **Wear OS:** el móvil y el reloj se comunican directamente por la capa de datos de Wear OS (Bluetooth/Wi-Fi), sin pasar por internet. El reloj guarda una copia de tus rutinas, tu biblioteca y tu historial reciente para entrenar sin el móvil. Si usas la sincronización, el móvil guarda una API key de escritura ("Reloj (subida automática)", visible en tus API keys) para subir los entrenos del reloj con la app cerrada; se borra al cerrar sesión.
- **Alojamiento:** la web se sirve desde GitHub Pages, que registra los accesos como cualquier servidor web.

## Tus derechos

Todo es tuyo y está a tu alcance: puedes **exportar** (JSON o CSV compatible con Hevy) y **borrar** tus datos desde *Perfil → Ajustes → Datos*. Si usas Supabase, puedes borrar también tu cuenta y tus filas desde tu proyecto.
