# Recolector de noticias (#60)

## Endpoint y despliegue

Se reutiliza la Edge Function MCP existente (`mcp/src/edge.ts`): `GET /functions/v1/mcp/news` devuelve `{ updatedAt, items, sources }`. No se añade función, herramienta MCP, pantalla, versión ni workflow. El resto del transporte MCP conserva su comportamiento. El endpoint es público, solo lectura, con CORS; no acepta parámetros, cuerpo de configuración ni URLs. `OPTIONS` devuelve 204 y otros métodos 405. `updatedAt` es el último éxito real; cada fuente tiene su fecha, indicador `stale` y error genérico. Sin ningún éxito, fecha nula y lista vacía; un fallo parcial mantiene las otras fuentes.

Ejecutar `npm run check` (genera `supabase/functions/mcp/index.ts`) y desplegar mediante el procedimiento existente: `supabase functions deploy mcp --no-verify-jwt`. No requiere secretos nuevos ni aplicar SQL. Verificación manual: `curl https://<proyecto>.supabase.co/functions/v1/mcp/news`.

## Red, cuotas y formatos

La lista blanca son exclusivamente los endpoints exactos con estado `aprobada` de `shared/news-sources.ts`, sin añadir parámetros. HTTPS obligatorio; sin credenciales, IPs literales ni hosts locales. Se resuelven A/AAAA en el servidor y se rechaza la fuente si alguna dirección no es pública, o si no hay direcciones. Todas las redirecciones se rechazan, incluso al mismo host. El timeout de 8 segundos cubre DNS, descarga y lectura; máximo 2.000.000 bytes por fuente, comprobado durante streaming (también sin Content-Length). No se descargan artículos, DTD ni enlaces de entradas. El fetch estándar vuelve a resolver DNS: para eliminar también la ventana de DNS rebinding entre comprobación y conexión hace falta una política de salida de red que bloquee rangos privados en el despliegue; la allowlist fija impide que el cliente controle ese DNS.

RSS/Atom usan el parser #59. Las respuestas JSON PLOS, PubMed esummary y Crossref se normalizan con el mismo contrato y límites de extracto. Los endpoints se usan tal cual están auditados: PubMed esummary sin IDs devuelve error, por lo que quedará marcado como no disponible hasta que el catálogo incluya un endpoint operativo; no se inventa una búsqueda ni se amplía la lista blanca. No hay descubrimiento ni llamadas encadenadas. Las descargas son secuenciales, una por fuente y hora por instancia; llamadas concurrentes comparten la actualización. HTTP 429 se trata como fallo y no se reintenta durante ese TTL.

## Caché actual y persistencia pendiente

TTL: una hora desde el intento, tanto éxito como fallo; así las peticiones públicas no fuerzan reintentos continuos. El último resultado correcto se conserva sin caducidad mientras viva la instancia, con su fecha original y `stale: true` ante fallo. Un éxito vacío válido sustituye el anterior. No se guarda el cuerpo original del feed.

No hay almacenamiento de noticias reutilizable: `records` pertenece a usuarios, y las tablas de claves, cuotas y bienvenida no son cachés de contenido público. Según la concreción de la tarea se usa memoria como respaldo temporal. **Esta fase todavía depende de la vida de la instancia y no cumple la persistencia entre instancias de la issue original**: reinicio o escalado pierden ese respaldo y pueden repetir descargas. Antes de activar la PWA debe aprobarse e implementarse un adaptador persistente y coordinación entre instancias.

Propuesta de migración para revisión (NO aplicada, NO incluida en supabase/migrations):

```sql
create table public.news_cache (
  source_id text primary key,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz,
  attempted_at timestamptz not null,
  error text,
  lease_until timestamptz
);
alter table public.news_cache enable row level security;
revoke all on public.news_cache from anon, authenticated;
```

El futuro adaptador solo servidor deberá usar service role (sin exponerla), validar el payload y source_id contra el catálogo, leer antes de descargar, adquirir lease atómico por fuente, conservar items/updated_at al fallar y guardar attempted_at/error. Una escritura fallida conserva el respaldo en memoria. La migración necesita aprobación y ejecución separada; este PR no la ejecuta ni cambia permisos existentes.

## Pruebas

Tests offline con fetch, DNS y reloj inyectados: hosts, IPs, redirecciones, timeout, bytes, 429, TTL exacto, concurrencia, normalización JSON, fallos parciales, recuperación y último éxito. `npm run check` verifica lint, tipos, cobertura y compilación.
