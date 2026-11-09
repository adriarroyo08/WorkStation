# Recolector de noticias (#60)

## Endpoint y despliegue

Se reutiliza la Edge Function MCP existente (`mcp/src/edge.ts`): `GET /functions/v1/mcp/news` devuelve `{ updatedAt, items, sources }`. No se añade función, herramienta MCP, pantalla, versión ni workflow. El resto del transporte MCP conserva su comportamiento. El endpoint es público, solo lectura, con CORS; no acepta parámetros, cuerpo de configuración ni URLs. `OPTIONS` devuelve 204 y otros métodos 405. `updatedAt` es el último éxito real; cada fuente tiene su fecha, indicador `stale` y error genérico. Sin ningún éxito, fecha nula y lista vacía; un fallo parcial mantiene las otras fuentes.

Ejecutar `npm run check` (genera `supabase/functions/mcp/index.ts`) y desplegar mediante el procedimiento existente: `supabase functions deploy mcp --no-verify-jwt`. No requiere secretos nuevos: `SUPABASE_SERVICE_ROLE_KEY` la inyecta Supabase. La caché compartida necesita la migración 012. Verificación manual: `curl https://<proyecto>.supabase.co/functions/v1/mcp/news`.

## Red, cuotas y formatos

La lista blanca son exclusivamente los endpoints exactos con estado `aprobada` de `shared/news-sources.ts`, sin añadir parámetros. HTTPS obligatorio; sin credenciales, IPs literales ni hosts locales. Se resuelven A/AAAA en el servidor y se rechaza la fuente si alguna dirección no es pública, o si no hay direcciones. Todas las redirecciones se rechazan, incluso al mismo host. El timeout de 8 segundos cubre DNS, descarga y lectura; máximo 2.000.000 bytes por fuente, comprobado durante streaming (también sin Content-Length). No se descargan artículos, DTD ni enlaces de entradas. El fetch estándar vuelve a resolver DNS: para eliminar también la ventana de DNS rebinding entre comprobación y conexión hace falta una política de salida de red que bloquee rangos privados en el despliegue; la allowlist fija impide que el cliente controle ese DNS.

RSS/Atom usan el parser #59. Las respuestas JSON PLOS, PubMed esummary y Crossref se normalizan con el mismo contrato y límites de extracto. Los endpoints se usan tal cual están auditados: PubMed esummary sin IDs devuelve error, por lo que quedará marcado como no disponible hasta que el catálogo incluya un endpoint operativo; no se inventa una búsqueda ni se amplía la lista blanca. No hay descubrimiento ni llamadas encadenadas. Las descargas son secuenciales, una por fuente y hora entre todas las instancias (ver la caché compartida); llamadas concurrentes comparten la actualización. HTTP 429 se trata como fallo y no se reintenta durante ese TTL.

## Caché en memoria y caché compartida

TTL: una hora desde el intento, tanto éxito como fallo; así las peticiones públicas no fuerzan reintentos continuos. El último resultado correcto se conserva sin caducidad, con su fecha original y `stale: true` ante fallo. Un éxito vacío válido sustituye el anterior. No se guarda el cuerpo original del feed.

La tabla `news_cache` (`supabase/migrations/012_api_key_check_news_cache.sql`, #149) es común a todas las instancias; el adaptador `supabaseNewsStore` la usa solo desde el servidor, con service role. `anon` y `authenticated` no tienen ningún permiso sobre ella, porque quien pudiera escribirla podría publicar noticias en la app.

Cuando la memoria de una instancia caduca, lee la tabla y valida cada fila contra el catálogo. Por cada fuente aún caducada pide una reserva atómica (`news_cache_claim`, 30 segundos): solo la instancia que la obtiene descarga, y guarda el resultado con `news_cache_store`, que al fallar consume TTL y conserva noticias y fecha anteriores. Las demás sirven lo último conocido y vuelven a mirar la tabla al cabo de un minuto.

Así, el número de descargas no depende de cuántas peticiones lleguen ni de cuántas instancias haya, y una instancia con la memoria al día no consulta la base de datos. Si la tabla no responde o la migración aún no está aplicada, cada instancia sigue sola con su memoria y su TTL.

## Pruebas

Tests offline con fetch, DNS y reloj inyectados: hosts, IPs, redirecciones, timeout, bytes, 429, TTL exacto, concurrencia, normalización JSON, fallos parciales, recuperación y último éxito. `npm run check` verifica lint, tipos, cobertura y compilación.
