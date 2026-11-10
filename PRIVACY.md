# Privacidad

Workstation **no usa analítica, ni publicidad, ni cookies de seguimiento.** Sin cuenta, todo se queda en tu dispositivo. Con cuenta en la web o el APK oficiales, tu copia se guarda en un proyecto de Supabase común, como se explica aquí.

> Borrador pendiente de revisión legal.

## Quién trata tus datos

- **Responsable:** Adrián Arroyo. **Contacto de privacidad:** adriarroyo2002@gmail.com.
- **Finalidad y base legal:** sincronizar tus datos entre dispositivos y gestionar tu cuenta. La base legal es la ejecución del servicio que solicitas al crear la cuenta (art. 6.1.b del RGPD). Las medidas corporales y el pulso se tratan con tu consentimiento explícito (art. 9.2.a del RGPD), que puedes retirar en cualquier momento borrando esos datos o tu cuenta.
- **Proyecto común de Supabase:** la web y el APK oficiales están conectados a un único proyecto de Supabase que administra el responsable. Supabase actúa como proveedor de alojamiento y base de datos. Región: Unión Europea (Irlanda, `eu-west-1`).
- **Quién puede verlos:** la seguridad por usuario (RLS) impide que otros usuarios lean tus filas. La administración del proyecto y Supabase, como proveedor, tienen acceso técnico a la base de datos.
- **Qué se guarda en ese proyecto:** tu email y, si entras con Google, tu nombre y foto de perfil; los entrenamientos, rutinas, ejercicios, medidas y ajustes que sincronizas; el hash de tus API keys y sus contadores de uso; y si ya se te envió el email de bienvenida.
- **Emails de la cuenta:** los de bienvenida, confirmación y recuperación de contraseña se envían por SMTP a través de Brevo.
- **Conservación:** mientras mantengas la cuenta. Después de borrarla, tus datos pueden permanecer hasta 30 días en las copias de seguridad. Los registros técnicos de los proveedores se rigen por sus propias políticas.
- **Proyecto propio:** si configuras tu propio proyecto de Supabase en Ajustes, tus datos van a ese proyecto y el responsable de Workstation no tiene acceso a él.

## Qué se guarda y dónde

| Dato | Dónde | Sale del dispositivo |
| --- | --- | --- |
| Entrenamientos, rutinas, ejercicios, medidas y ajustes | En tu navegador o en la app Android (IndexedDB) | Solo si activas la sincronización |
| Copias automáticas | En el dispositivo (IndexedDB) | No |
| Fotos de progreso | En el dispositivo (IndexedDB) | No: nunca se sincronizan ni se envían |
| API keys (IA, ExerciseDB) | En el dispositivo | Solo al servicio al que pertenecen |
| Pulso del reloj o pulsómetro | Dentro del entrenamiento en el que lo registras | Igual que el resto del entrenamiento |
| Exportación a Health Connect (optativa, Android) | En Health Connect, en tu móvil | Workstation no la envía a ningún servidor |

## Servicios externos (todos opcionales)

- **Supabase (cuenta y sincronización):** solo si creas una cuenta. Ver [Quién trata tus datos](#quién-trata-tus-datos).
- **Coach IA:** cuando usas el coach o el análisis de informes, se envía al proveedor que elijas (Gemini, Groq, OpenRouter, un modelo local…) un resumen de tu entrenamiento y tu pregunta. Se aplica la política de privacidad de ese proveedor.
- **API keys y servidor MCP:** una IA solo puede leer tus datos con una API key que generes tú. En la base de datos se guarda solo su hash (SHA-256) y puedes revocarla en cualquier momento.
- **ExerciseDB (RapidAPI):** se piden los GIFs de los ejercicios con tu clave. No se envían datos de tus entrenamientos.
- **Imágenes de free-exercise-db:** se descargan de `raw.githubusercontent.com` (GitHub ve la petición, como en cualquier web).
- **Importar desde Hevy:** el CSV exportado de Hevy se procesa en tu dispositivo. Desde el servidor MCP también puedes importar con tu API key de Hevy (variable de entorno en tu ordenador). No se envía nada a Hevy.
- **Wear OS:** el móvil y el reloj se comunican directamente por la capa de datos de Wear OS (Bluetooth/Wi-Fi), sin pasar por internet. El reloj guarda una copia de tus rutinas, tu biblioteca y tu historial reciente para entrenar sin el móvil. Si usas la sincronización, el móvil guarda una API key de escritura ("Reloj (subida automática)", visible en tus API keys) para subir los entrenos del reloj con la app cerrada; se guarda cifrada, caduca y se renueva sola, y se revoca al cerrar sesión (si no hay conexión, en cuanto vuelva). Los datos locales de la app Android no entran en las copias de seguridad del sistema: para conservarlos al cambiar de móvil usa la sincronización o el backup de Ajustes.
- **Health Connect (Android):** solo si lo activas en Ajustes y concedes el permiso, base legal de tu consentimiento explícito (art. 9.2.a del RGPD). Por cada entrenamiento que termines en ese móvil se escribe en Health Connect su nombre, inicio y fin y, si das ese permiso y lo registraste, tu pulso. Workstation nunca lee datos de Health Connect ni escribe calorías u otros datos estimados. Mientras se escribe, la sesión se guarda brevemente en el almacenamiento privado de la app. Otras apps a las que hayas dado permiso en Health Connect podrán leer estos datos. Puedes retirar el consentimiento desactivando la opción o el permiso; lo ya exportado se borra desde Health Connect, también si borras tu cuenta de Workstation.
- **Alojamiento:** la web se sirve desde GitHub Pages, que registra los accesos como cualquier servidor web.

## Tus derechos

Puedes **exportar** (JSON o CSV compatible con Hevy) y **borrar** los datos del dispositivo desde *Perfil → Ajustes → Datos*.

Puedes **borrar tu cuenta** desde *Perfil → Borrar cuenta*. Al confirmar desaparecen del proyecto tu usuario, tus datos sincronizados, tus API keys con sus contadores de uso y el registro del email de bienvenida. Los datos guardados en tus dispositivos no se borran: puedes eliminarlos en *Ajustes → Datos*. Con tu propio proyecto de Supabase, el botón necesita la función `delete-account` desplegada en él.

Para ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad, o para retirar tu consentimiento, escribe a adriarroyo2002@gmail.com. Si consideras que no se han respetado, puedes reclamar ante la Agencia Española de Protección de Datos ([aepd.es](https://www.aepd.es)).
