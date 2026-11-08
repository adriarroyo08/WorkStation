# Auditoría de seguridad previa a la beta

Issue #138, parte de #125. Revisión del código de `main` a fecha de 2026-11-08 (commit de partida `b42750d`).

**Resultado:** no se ha encontrado ninguna vía para leer o escribir los datos de Workstation de otro usuario (S-04 afecta, si se dan sus condiciones, a datos de una cuenta de Hevy). El riesgo principal de la beta es la falta de límites de almacenamiento: una sola cuenta puede llenar la base de datos común (S-01). Hay 16 hallazgos: 5 arreglados o mitigados en este PR y 11 con su propia issue. Ningún secreto real aparece en este documento.

## Método

- Lectura completa de `supabase/migrations/`, las Edge Functions, `mcp/`, `shared/mcp-*`, `shared/news*`, `shared/routine-share.ts`, `shared/sync.ts`, `shared/ai.ts`, `app/src/cloud.ts`, las pantallas de cuenta, API keys, Coach, noticias y artículos, los manifiestos y el puente nativo de Android, y los workflows.
- Búsqueda de sumideros de XSS (`dangerouslySetInnerHTML`, `innerHTML`, `eval`, `href` y `src` dinámicos).
- Comprobación **por ejecución** de lo que no bastaba leer: las migraciones reales sobre Postgres en memoria (PGlite) y las funciones de `shared/` con entradas hostiles. Cada arreglo tiene su test.
- Búsqueda de patrones de secretos en el árbol y en **todo el historial de git** (JWT, claves de proveedores, claves privadas), de ficheros sensibles añadidos alguna vez, y en el bundle compilado.
- `npm audit --omit=dev` en la raíz, `app` y `mcp`: 0 vulnerabilidades.
- **No se ha ejecutado nada contra producción.** Todo lo que depende del panel de Supabase, de GitHub o de un dispositivo está en [No verificable desde el código](#no-verificable-desde-el-código).

Severidad: **Alta**, afecta a todos los usuarios o a sus datos sin condiciones difíciles. **Media**, daño real con alguna condición previa. **Baja**, requiere condiciones improbables o tiene un impacto limitado. **Info**, a tener en cuenta, sin fallo concreto.

## Hallazgos

| Id | Severidad | Hallazgo | Estado |
| --- | --- | --- | --- |
| S-01 | Alta | Sin límite de tamaño ni de filas en `records` | #142 |
| S-02 | Media | `client_updated_at` sin tope: bloqueo de filas tras una filtración | #143 |
| S-03 | Media | Las API keys sobreviven a la recuperación de contraseña | #144 |
| S-04 | Media (condicional) | `HEVY_API_KEY` compartida entre usuarios del MCP remoto | #145 |
| S-05 | Media | Sin borrado de cuenta; `PRIVACY.md` no describe el proyecto común | #146 |
| S-12 | Media | Una fila remota mal formada rompía la app | Arreglado aquí |
| S-06 | Baja | API key del reloj en claro y dentro de la copia de seguridad | #147 |
| S-07 | Baja | El MCP acepta la API key en la URL | #148 |
| S-08 | Baja | MCP sin validar la clave en métodos públicos; `/mcp/news` sin límite | #149 |
| S-09 | Baja | Función `welcome` sin autenticar y con error SMTP en la respuesta | #150 |
| S-10 | Baja | `SUPABASE_ACCESS_TOKEN` expuesto a `npm ci` | #151 |
| S-11 | Baja | Contraseñas de firma de Android por defecto en el repositorio | #152 |
| S-13 | Baja | Enlaces de rutina: validación esquivable y bomba de compresión | Arreglado aquí |
| S-14 | Baja | Coste cuadrático al limpiar el texto de las noticias | Arreglado aquí |
| S-15 | Baja | MCP sin tope de tamaño del cuerpo | Arreglado aquí |
| S-16 | Baja | Inyección de prompt desde rutinas compartidas | Mitigado aquí |

### S-01 · Alta · Sin límite de tamaño ni de filas en `records` (#142)

`public.records` guarda `doc jsonb` sin tope, y ni RLS ni `api_upsert` limitan bytes ni número de filas. Comprobado en PGlite: se acepta un documento de 5 MB.
**Ataque:** alguien crea una cuenta y sube documentos grandes en bucle con su propia sesión. El límite de 60 llamadas por minuto solo se aplica a las API keys. La base de datos se llena y el servicio se degrada para toda la beta.

### S-02 · Media · `client_updated_at` sin tope (#143)

El conflicto se resuelve con una fecha que envía el cliente, sin validar. Comprobado en PGlite: tras escribir con el año 9999 y **revocar la key**, una edición legítima se ignora y la fila conserva el contenido del atacante.
**Ataque:** con una key de escritura filtrada se marcan las filas con una fecha futura. La revocación no deshace el daño, y las ediciones posteriores se pierden en silencio.

### S-03 · Media · Las API keys sobreviven a la recuperación de contraseña (#144)

`cloud.updatePassword` solo cambia la contraseña y `api_key_user` no mira el estado de la cuenta.
**Ataque:** quien entra en una cuenta crea una key de escritura sin caducidad. La víctima recupera la contraseña y el atacante sigue dentro por el MCP.

### S-04 · Media (condicional) · `HEVY_API_KEY` compartida (#145)

`mcp/src/edge.ts` pasa el entorno de la función a `import_from_hevy`, y la función es la misma para todos. La documentación solo prevé esa variable en el MCP local.
**Ataque:** si el secreto está definido en la función, cualquier usuario con una key de escritura copia a su cuenta los entrenamientos de la cuenta de Hevy dueña de la clave. No se puede saber desde el código si está definido.

### S-05 · Media · Borrado de cuenta y privacidad (#146)

No hay borrado de cuenta en la app. `PRIVACY.md` habla de "tu propio proyecto" y de que Workstation no tiene acceso, y la tarjeta de cuenta promete "solo tú ves tus datos", pero la web y el APK van conectados a un proyecto común que administra su dueño.
**Escenario:** una persona de la beta pide borrar sus datos de salud (peso, grasa, pulso) y no tiene cómo. El texto legal no se corresponde con la realidad.

### S-06 · Baja · API key del reloj (#147)

Con un reloj emparejado se crea sola una key de escritura sin caducidad, guardada en claro en `SharedPreferences`. `allowBackup="true"` sin reglas la incluye en la copia del sistema. Si se cierra sesión sin conexión, el borrado remoto falla en silencio.
**Ataque:** quien restaure esa copia o tenga acceso root obtiene una key que no caduca. `MODE_PRIVATE` protege frente a otras apps.

### S-07 · Baja · API key en la URL (#148)

`apiKeyFrom` acepta `?key=ws_…`, aunque la interfaz recomienda no usarlo.
**Ataque:** la key queda en historiales, proxies o capturas y sirve hasta que se revoque.

### S-08 · Baja · Métodos sin validar la clave y `/mcp/news` (#149)

Comprobado: con una clave inventada, `search_articles` responde sin consultar la base de datos. Lo mismo ocurre con `initialize`, `tools/list`, `resources/read` y `list_programs`. No se expone nada privado. `/mcp/news` es público, sin límite, y su caché es por instancia.
**Ataque:** consumo de invocaciones de la función y, con instancias frías, descargas repetidas a las fuentes aprobadas.

### S-09 · Baja · Función `welcome` (#150)

Se despliega sin JWT ni secreto, responde distinto según exista el usuario y devuelve `String(e)` del error SMTP.
**Ataque:** requiere conocer un UUID de usuario. Permitiría confirmar que existe y leer detalles del servidor de correo si el envío falla.

### S-10 · Baja · Token de Supabase en `npm ci` (#151)

`supabase.yml` define el token a nivel de job, así que `npm --prefix mcp ci` también lo recibe.
**Ataque:** un paquete comprometido con script de instalación roba un token con acceso de gestión.

### S-11 · Baja · Contraseñas de firma por defecto (#152)

`android.yml` y los `build.gradle.kts` recurren a valores fijos visibles en el repositorio si faltan los secrets.
**Ataque:** solo sirve si además se obtiene el almacén de claves, que no está en el repositorio. Sin el secret del almacén, el build se firma con una clave temporal y solo avisa.

### S-12 · Media · Fila remota mal formada (arreglado)

`applyRemote` aceptaba cualquier JSON. Comprobado: un entrenamiento sin `exercises` hacía fallar `trainingSummary` con `w.exercises is not iterable`.
**Ataque:** con una key de escritura filtrada se deja una fila así. La app falla al procesar los entrenamientos en los dispositivos de la víctima y el error se captura en la raíz, de modo que puede impedir llegar a la pantalla donde se revoca la key.
**Arreglo:** `validRemoteDoc` en `shared/sync.ts` ignora los documentos sin la forma esperada y los ajustes con un tipo incorrecto.

### S-13 · Baja · Enlaces de rutina (arreglado)

La validación usaba `in`, y `__proto__` o `constructor` pasaban como músculo o tipo. Comprobado: se aceptaban y quedarían guardados y sincronizados tras importar. Un tipo de serie `0.5` dejaba la serie sin tipo, una estructura incorrecta daba un error interno, y la descompresión no tenía tope.
**Ataque:** un enlace manipulado, guardado por la víctima, mete valores inválidos en su biblioteca, o una bomba de compresión cuelga la pestaña al abrirlo.
**Arreglo:** `Object.hasOwn`, comprobación de estructura, topes de 200.000 caracteres de enlace y 1 MB descomprimido.

### S-14 · Baja · Limpieza de noticias (arreglado)

La expresión que quita etiquetas era cuadrática con muchos `<` sin cierre. Medido: 40.000 caracteres tardaban 5 s y 160.000 más de 2 minutos, frente a un máximo de 2 MB por feed.
**Ataque:** una fuente aprobada comprometida deja sin CPU la función de noticias.
**Arreglo:** expresión lineal y tope de 20.000 caracteres por campo.

### S-15 · Baja · Cuerpo del MCP sin tope (arreglado)

`handleMcp` parseaba el cuerpo entero con cualquier valor de clave.
**Arreglo:** máximo de 1 MB comprobado durante la lectura, con respuesta 413.

### S-16 · Baja · Inyección de prompt (mitigado)

Las notas y los nombres de ejercicios de una rutina compartida llegan al prompt de sistema del Coach y a las herramientas del MCP sin marcarse como datos.
**Ataque:** un enlace trae una nota con instrucciones. En el Coach, el daño se limita a un mal consejo o a una rutina que hay que guardar a mano: la respuesta se pinta como texto, sin imágenes ni enlaces externos. Por MCP, un cliente con key de escritura podría intentar `delete_routine`.
**Mitigación:** el prompt del Coach y las instrucciones del MCP avisan de que esos campos son datos. **Queda riesgo residual**, porque ningún texto impide del todo una inyección: conviene usar keys de solo lectura y confirmar las acciones destructivas en el cliente. `delete_routine` y `update_routine` ya se anuncian como destructivas.

### Observaciones (Info)

- **Enumeración de cuentas:** el registro indica si un email ya existe. La recuperación de contraseña no lo revela. La API de Auth lo expondría igualmente.
- **Sin `frame-ancestors`:** una CSP por `<meta>` no lo admite y GitHub Pages no permite cabeceras. El particionado de almacenamiento de los navegadores actuales reduce el riesgo, porque el marco no tendría sesión.
- **Cerrar sesión no borra los datos locales:** es coherente con el uso sin conexión, pero importa en dispositivos compartidos.
- **Sin MFA**, y las API keys se crean sin caducidad por defecto.
- **DNS rebinding en noticias:** ventana residual ya documentada en `docs/recolector-noticias.md`. La lista blanca fija impide que el cliente la aproveche.
- `.idea/` está versionado. No contiene secretos, aunque sobra en el repositorio.

## Resultado por área

| Área | Resultado |
| --- | --- |
| Autenticación y recuperación (PWA y Android) | **Correcto en el cliente.** Nonce de Google con SHA-256, tokens del enlace consumidos por supabase-js, política de contraseñas y mensaje neutro al recuperar. Pendiente: S-03, S-05 e Info. La política de contraseñas también debe imponerse en el servidor (ver abajo). |
| API keys | **Correcto en el diseño.** 256 bits aleatorios, solo se guarda el SHA-256, se valida permiso y caducidad en cada llamada, y la revocación es inmediata y borra los contadores. Sin política `update`: el permiso no se puede ampliar. Pendiente: S-02, S-03, S-06, S-07. |
| RLS y migraciones | **Correcto.** RLS en todas las tablas, las políticas exigen `auth.uid() = user_id`, las funciones internas no son invocables desde fuera y todas las `security definer` fijan `search_path`. Cubierto por `supabase/migrations.test.ts`. Pendiente: S-01. |
| Servidor MCP y Edge Function | **Correcto en lo esencial.** Los datos solo se alcanzan con una key válida, CORS `*` es aceptable porque no hay cookies, y lotes y cuotas están limitados. El permiso de escritura se impone en la base de datos. Pendiente: S-04, S-07, S-08. Arreglado: S-15. |
| Recolector de noticias (SSRF) | **Sin fallos de SSRF.** Ninguna URL procede de la petición: lista blanca exacta, solo HTTPS, redirecciones rechazadas, direcciones resueltas y filtradas, tiempo y bytes limitados, parser XML sin DTD. Arreglado: S-14. |
| Coach IA | **Correcto.** La clave se guarda en IndexedDB, no se sincroniza ni entra en los backups, y solo va al proveedor elegido. Se envía un resumen del entrenamiento, indicado en la pantalla y en `PRIVACY.md`. Las noticias no llegan al Coach ni al MCP, y los artículos son contenido del repositorio. Mitigado: S-16. |
| Enlaces compartidos | **Sin servidor:** la rutina viaja tras el `#`, y el enlace se retira de la URL al abrirlo. Solo se importa con confirmación. Arreglado: S-13. |
| Markdown y contenido externo (XSS) | **Sin fallos.** No hay `dangerouslySetInnerHTML` ni equivalentes. El Markdown se convierte en un árbol cerrado, y los enlaces de artículos y noticias solo admiten `http` y `https`. La CSP solo permite scripts propios. Android abre fuera del WebView cualquier navegación a otro dominio, así que el puente nativo no llega a páginas externas. |
| Secretos | **Sin secretos en el árbol ni en el historial.** Tampoco `.env`, `.jks` ni `google-services.json` versionados. Lo único que coincide en el bundle es texto de la librería supabase-js. La URL y la clave `anon` de Supabase y el id de cliente de Google son públicos por diseño. |

## Si se filtra una clave

| Clave | Qué permite | Qué hacer |
| --- | --- | --- |
| API key de lectura (`ws_…`) | Leer todos los registros del usuario, incluidos peso, grasa y pulso. Las fotos no se sincronizan. El límite de cuota no protege, porque basta una llamada. | Revocarla en Ajustes: efecto inmediato. |
| API key de escritura | Lo anterior, más sobrescribir o borrar todos los registros. No hay historial en el servidor. | Revocarla y restaurar desde una copia local. Hoy no deshace las filas con fecha futura (S-02). |
| Clave `anon` | Nada por sí sola: es pública y RLS protege los datos. | No hace falta rotarla. |
| `service_role` | Acceso total, saltándose RLS. En el código solo la usa la función `welcome`, desde el entorno del servidor. | Rotarla de inmediato. |
| `SUPABASE_ACCESS_TOKEN` | Gestión de la cuenta de Supabase. | Revocarlo. Ver S-10. |
| Clave de IA del usuario | Consumo en el proveedor de esa persona. No da acceso a otros datos. | Revocarla en el proveedor. |

Una clave `ws_` no se puede adivinar: tiene 256 bits y las claves inválidas se rechazan antes de contar cuota.

## No verificable desde el código

Marcado como tal porque no se ha consultado producción:

- **Panel de Supabase Auth:** registro abierto, confirmación de email, longitud mínima de contraseña en el servidor, lista de URL de redirección, límites de intentos. `supabase/config.toml` no define `[auth]`. La política de contraseñas del cliente se puede saltar llamando directamente a la API si el servidor no la impone.
- **Estado real de la base de datos:** que todas las migraciones estén aplicadas, que RLS esté activa y los permisos coincidan, y el plan y su límite de almacenamiento.
- **Realtime:** el filtrado por RLS de `postgres_changes` lo hace la plataforma.
- **Si `HEVY_API_KEY` existe** como secreto de la función (S-04) y si los secrets de firma están definidos (S-11).
- **Si los registros de Supabase guardan la query string** (S-07) y los límites de tamaño de la plataforma.
- **Comportamiento real de la copia de seguridad de Android** (S-06): no se ha probado en un dispositivo.
- **Efectividad de la mitigación S-16** frente a cada modelo: depende del proveedor.

## Pruebas

Los arreglos están cubiertos en `shared/routine-share.test.ts`, `shared/sync.test.ts`, `shared/news.test.ts` y `shared/mcp.test.ts`. `npm run check` pasa en este PR.
