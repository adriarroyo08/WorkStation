# Verificación de la exportación a Health Connect (#163)

Hecha el 2026-11-10 con la APK de depuración en emuladores sin ventana y solo lectura. Las capturas contienen únicamente sesiones de prueba creadas para esto, sin cuenta ni datos personales. El pulso son muestras de prueba que entran por el mismo canal que las del reloj.

## Android 16 (API 36), Health Connect del sistema

| Caso | Resultado | Captura |
| --- | --- | --- |
| Sin activar | Interruptor apagado y explicación. | `01-ajustes-desactivado.png` |
| Pantalla de permisos | Solo pide escribir ejercicio y pulso. | `02-permisos-health-connect.png`, `04-permisos-marcados.png` |
| Permiso denegado | Sigue apagado, lo explica y ofrece abrir Health Connect. | `03-permiso-denegado.png` |
| Segunda denegación | Android ya no muestra el diálogo; la app mantiene la explicación y el botón. | — |
| Permiso concedido | Activado. | `05-activado.png` |
| Sesión terminada con pulso | Entrada de 10:23 a 10:24 en Health Connect. Pulso con 3 muestras reales: 110, 115 y 120 ppm. | `06-sesion-terminada.png`, `08-entradas-ejercicio.png`, `09-entradas-pulso.png`, `09b-detalle-pulso.png` |
| Escribir tres veces la misma sesión | Una sola entrada («Repetida»). | `08-entradas-ejercicio.png` |
| Reapertura | Tras forzar el cierre sigue activado y las entradas no cambian. | — |
| Permiso revocado | Lo explica. La sesión siguiente queda en el historial y no llega a Health Connect. | `10-permiso-revocado.png`, `11-historial-conservado.png` |
| Desactivación | Vuelve a apagado y `healthConnectExport` devuelve `false`. | `12-desactivado.png` |
| Política de privacidad | La actividad abre el navegador. | — |

`07-health-connect-inicio.png` muestra a Workstation en los accesos recientes de Health Connect.

## Android 11 (API 30), sin Health Connect instalado

Sin interruptor, con el aviso y el botón de instalar. La sesión se termina y se guarda con normalidad. Captura: `13-android11-sin-proveedor.png`.

## No verificado en dispositivo

- **Reintento por fallo transitorio:** no se puede provocar un fallo real del proveedor del sistema en el emulador. Lo cubren las pruebas de `HealthExporterTest` (reintento sin duplicar). En dispositivo solo se comprobó que repetir la escritura no duplica.
- **Android 9 a 13 con la app de Health Connect instalada:** el emulador de API 30 no la tiene.
- **Dispositivo físico y reloj real.**
