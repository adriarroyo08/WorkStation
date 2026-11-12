# Exportación a Health Connect (Android)

Cubre la propuesta H6 de `docs/revision-hevy.md` (issue #163). Exporta los entrenamientos terminados en el móvil a Health Connect, solo si el usuario lo activa. Nunca lee datos de Health Connect.

Documentación oficial consultada el 2026-11-10:

- [Primeros pasos](https://developer.android.com/health-and-fitness/guides/health-connect/develop/get-started): disponibilidad, permisos, manifiesto.
- [Escribir datos](https://developer.android.com/health-and-fitness/guides/health-connect/develop/write-data): `clientRecordId`, metadatos, errores, registros de pulso por minuto y `WorkManager`.
- [Notas de versión](https://developer.android.com/jetpack/androidx/releases/health-connect): `connect-client` 1.1.0 es la última estable (2025-10-08); 1.2.0 sigue en alfa (alpha06, 2026-08-26).

## Decisiones

| Decisión | Motivo |
| --- | --- |
| SDK `androidx.health.connect:connect-client:1.1.0` | Última estable. Exige `compileSdk` 36 y AGP 8.9.1 o superiores: el proyecto usa 37 y 9.5.0. |
| El consentimiento vive en Android, por dispositivo | Activarlo en un móvil no debe hacer que otro escriba datos de salud. Por eso no va en `settings`, que se sincroniza. |
| Cola en disco y `WorkManager` | La escritura sobrevive a cerrar la app y a reiniciar. El fichero de la cola evita el límite de 10 KB de los datos de un `Worker`. |
| Deduplicación con `clientRecordId` | La única garantía real: Health Connect sustituye en lugar de insertar. |
| Pulso desde las muestras guardadas en el entrenamiento | Es la misma serie que ve el usuario en el historial (como mucho 360 puntos). |

## Flujo

1. **Activar.** El interruptor de Ajustes llama a `healthConnectEnable()`. Android muestra su pantalla de permisos. Si se concede el de ejercicio, queda activado en este móvil.
2. **Terminar.** `finishActive` guarda primero el entrenamiento en local y después entrega la sesión con `healthConnectExport(json)`. Nada de lo que ocurra a partir de ahí afecta al historial.
3. **Encolar.** Si está activado, Android guarda la sesión en `noBackupFilesDir/health-connect/<id>.json`, con el huso horario de ese momento, y programa un trabajo único por sesión.
4. **Escribir.** `HealthExportWorker` comprueba activación, proveedor y permisos, escribe la sesión y, después, el pulso. Al terminar borra el fichero.

Una sesión descartada no llama a `finishActive`, y `finishWorkout` no devuelve nada si no hay series hechas: en ninguno de los dos casos se exporta.

## Contrato web/nativo

Todos los métodos son opcionales en `NativeApi`. La web comprueba `healthConnectRefresh` para saber si la app los admite: en el navegador y en versiones antiguas de la app la sección no aparece y el resto funciona igual.

| Método | Efecto |
| --- | --- |
| `healthConnectRefresh()` | Pide el estado. |
| `healthConnectEnable()` | Pide permisos si faltan y activa. |
| `healthConnectDisable()` | Desactiva, cancela lo pendiente y borra la cola. |
| `healthConnectOpen()` | Abre Health Connect o, si falta, su ficha en la tienda. |
| `healthConnectExport(json): boolean` | Encola una sesión. `false` si no está activado o el JSON no es válido. |

Android responde siempre con este mensaje, también al volver a primer plano, porque el permiso puede haber cambiado fuera de la app:

```json
{ "kind": "health_connect", "denied": false, "status": { "availability": "available", "enabled": true, "exercise": true, "heartRate": false } }
```

`availability` es `available`, `update_required` o `unavailable`. La sesión sigue el tipo `HealthExport` de `shared/health-connect.ts`:

```json
{ "v": 1, "id": "abc123", "title": "Pierna", "startMs": 1794000000000, "endMs": 1794003600000, "hr": [[1794000005000, 120]] }
```

Android rechaza versiones desconocidas de `v`, duraciones no positivas e identificadores fuera de `[A-Za-z0-9_-]{1,64}`, porque el identificador forma parte de un nombre de fichero.

## Disponibilidad

| Android | Health Connect | Estado en la app |
| --- | --- | --- |
| 14 o superior (API 34+) | Parte del sistema | `available` |
| 9 a 13 (API 28-33) | App de Google Play | `available` si está instalada; si no, `update_required` con botón a la tienda |
| 8 (API 26-27) | No compatible | La app funciona; Health Connect no se ofrece |

Sin `available` no se muestra el interruptor, y los entrenamientos se siguen guardando.

## Permisos

Solo dos, de escritura: `android.permission.health.WRITE_EXERCISE` y `android.permission.health.WRITE_HEART_RATE`. El primero es imprescindible. El segundo es opcional: sin él se exporta la sesión sin pulso.

El manifiesto declara además `<queries>` del proveedor, y `HealthRationaleActivity` con su `activity-alias`, que abren la política de privacidad desde la pantalla de permisos.

Antes de publicar en Google Play hay que declarar el acceso a estos dos tipos de datos en Play Console.

## Registros

- **`ExerciseSessionRecord`:** tipo `EXERCISE_TYPE_STRENGTH_TRAINING`, inicio y fin reales y título de la sesión. `Metadata.activelyRecorded` con dispositivo de tipo móvil.
- **`HeartRateRecord`:** uno por minuto de sesión, como recomienda la guía oficial. Dispositivo `TYPE_UNKNOWN`, porque las muestras no guardan si vinieron del reloj o de un pulsómetro.
- **Sin datos inventados:** nunca se escriben calorías ni distancia. Sin muestras reales de pulso, no hay registro de pulso. El resumen (media, máximo, mínimo) no se convierte en muestras.

## Deduplicación

| Registro | `clientRecordId` |
| --- | --- |
| Sesión | `workstation:session:<id>` |
| Pulso | `workstation:hr:<id>:<minuto desde el inicio>` |

Con `clientRecordVersion` fija en 1, repetir la escritura de la misma sesión no crea registros nuevos. Si una sesión se edita después de exportada, el cambio no llega a Health Connect.

## Errores y reintentos

| Situación | Resultado |
| --- | --- |
| `IOException`, `RemoteException`, `IllegalStateException` u otro fallo transitorio | Reintento con espera exponencial desde 1 minuto, 8 intentos como máximo (unas 2 horas). |
| `IllegalArgumentException` (datos rechazados) | Se abandona: repetir daría el mismo error. |
| Sin permiso de ejercicio | Se abandona sin reintentar. |
| Permiso de pulso retirado a mitad | La sesión ya escrita se mantiene. |
| Desactivación o proveedor no disponible | Se abandona y se borra la cola. |

Las sesiones terminadas con el permiso retirado no se recuperan al volver a concederlo: la retirada se respeta. Tras agotar los intentos, la sesión tampoco se reexporta, y sigue en el historial de la app.

## Alcance respecto al reloj

- **Se exporta:** la sesión terminada en el móvil, también si se pulsa «Terminar» en el reloj mientras controla esa sesión, con el pulso que el reloj envió durante ella.
- **No se exporta:** el entrenamiento hecho de forma autónoma en el reloj y recibido después en el móvil. Sigue guardándose en el historial con normalidad.
- **No se importa:** ningún dato de Health Connect ni de otras apps.

## Privacidad

Los datos van del móvil a Health Connect, sin pasar por ningún servidor de Workstation. Desactivar la exportación no borra lo ya escrito, que se gestiona desde Health Connect. Lo mismo ocurre al borrar la cuenta. Ver `PRIVACY.md`.

## Verificación

Evidencias y resultados en `docs/issue-163/`.
