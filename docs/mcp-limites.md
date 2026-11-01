# Límite de peticiones por API key (MCP)

Issue #40, parte de #32. Implementación: `supabase/migrations/008_api_key_rate_limit.sql` (base de datos), `shared/cloud-source.ts` (`RateLimitError`) y `shared/mcp-http.ts` (respuesta 429 y tope de lotes).

## Política

| Ventana | Máximo por clave | Tipo |
| --- | --- | --- |
| 1 minuto | 60 llamadas | Ventana fija (`date_trunc('minute')`) |
| 1 hora | 1000 llamadas | Ventana fija (`date_trunc('hour')`) |
| Por petición HTTP al MCP | 20 mensajes JSON-RPC (`MAX_BATCH`) | Se rechaza el lote entero con 400 |

- **Qué cuenta como llamada:** cada ejecución de `api_records` o `api_upsert`, que son las únicas funciones públicas que aceptan una API key. Una herramienta MCP gasta 1–3 llamadas: una lectura, más páginas si hay más de 1000 registros, y una escritura si modifica datos. 60 por minuto equivalen a unas 20–60 herramientas por minuto, de sobra para un asistente y corto para un abuso.
- **Qué no cuenta:** las claves inexistentes o caducadas, que se rechazan antes de contar. La sincronización de la propia app tampoco cuenta, porque usa la sesión del usuario y RLS, no API keys.
- **Al pasarse:** PostgREST responde **429** con `Retry-After` (segundos hasta que acaba la ventana) y un JSON `{ "code": "WS429", "message": "Demasiadas peticiones…" }`. El servidor MCP propaga el 429 y el `Retry-After` (expuesto por CORS). En un lote, deja de llamar a la base de datos al primer 429: el resto de herramientas del lote responde con el error JSON-RPC `-32029`.
- **Una petición rechazada no gasta cuota:** la excepción deshace el incremento.

## Por qué en la base de datos

`api_records` y `api_upsert` están expuestas en `/rest/v1/rpc` para el rol `anon`, a propósito: el MCP las llama así. Un límite solo en el servidor MCP (la Edge Function) se esquivaría llamando a las RPC directamente. Por eso el límite está en `api_key_user()`, la validación de clave por la que pasan las dos (la versión antigua de `api_records` de 2 argumentos se eliminó en 003).

## Almacenamiento compartido y coste

- Tabla `public.api_key_usage (key_id, span, window_start, calls)`: es la misma para todas las instancias de la Edge Function y para las llamadas directas. No hay memoria por instancia.
- Incremento atómico con `insert … on conflict do update … returning`, sin carreras entre peticiones simultáneas.
- Coste por llamada: 2 upserts de una fila sobre la clave primaria, más un `delete` de las ventanas de esa clave con más de 2 horas. Como mucho guarda unas 3 filas por clave activa.
- Se cuenta por `api_keys.id`: la clave en claro no se guarda nunca (solo existe su hash SHA-256 en `api_keys.key_hash`).
- Al revocar una clave, sus contadores se borran en cascada.

## Permisos y aislamiento

- `api_key_usage` tiene RLS activada sin políticas y `revoke all` para `anon` y `authenticated`: nadie la lee ni la escribe desde la API.
- `api_key_hit()`, `api_now()` y `api_key_user()` no se pueden ejecutar desde fuera (`revoke all`): solo se llega a ellas a través de `api_records` y `api_upsert`.
- Cada clave tiene su propio contador. El límite de una clave no afecta a las demás, aunque sean del mismo usuario.

## Amenazas consideradas

| Amenaza | Mitigación |
| --- | --- |
| Llamar a las RPC directamente para saltarse el MCP | El límite está dentro de la base de datos |
| Varias instancias de la Edge Function con contadores propios | Contador en tabla compartida |
| Lotes JSON-RPC grandes para multiplicar trabajo en una petición | Tope de 20 mensajes; cada herramienta gasta cuota igualmente, y el lote para al primer 429 |
| Peticiones simultáneas para colarse en el límite | Incremento atómico; test con 70 llamadas simultáneas: pasan exactamente 60 |
| Leer o reiniciar los contadores | Tabla y funciones sin permisos para `anon`/`authenticated` |
| Fuerza bruta de claves | Fuera del alcance de este límite: las claves son aleatorias de 256 bits y solo se guarda su hash; las claves falsas no consumen cuota de nadie |
| Agotar la cuota de otro usuario | Solo es posible teniendo su clave; en ese caso, revocarla corta el acceso y borra sus contadores |

## Pruebas

En `supabase/migrations.test.ts` (Postgres real en memoria con PGlite y reloj controlado por `api_now()`) se comprueba:
- el límite de 60 y la llamada 61 con 429 y `Retry-After`;
- el reinicio de la ventana;
- que las claves son independientes;
- el tope por hora y en escrituras;
- la concurrencia;
- los permisos;
- la revocación.

En `shared/mcp.test.ts` se comprueba:
- `RateLimitError` y la respuesta 429 con `Retry-After`;
- que un lote se corta al primer 429 y no vuelve a llamar a la base de datos;
- el rechazo de lotes de más de 20 mensajes.

Ninguna prueba usa claves reales.
