# Evidencia de la issue #139

`e2e/duration.spec.ts` recorre el cronómetro, el objetivo de la rutina y el detalle en claro y oscuro a 360 × 740, con movimiento reducido, sin desbordamiento y con axe (WCAG A y AA).

## Auditoría previa

Plancha, suspensión en barra (`wger-182`) y sentadilla isométrica en pared (`wger-718`), recorridas en el registro real antes de cambiar nada.

| Comprobación | Antes |
| --- | --- |
| Los tres ejercicios se registran por tiempo, sin campo de repeticiones | Funcionaba |
| La plancha duplicada del catálogo (por repeticiones) queda oculta tras la propia | Funcionaba |
| Objetivo en segundos editable en la rutina, que llega a la sesión | Funcionaba |
| El cronómetro usa el reloj real al bloquear la pantalla o cambiar de pestaña | Funcionaba |
| Completar la serie con el cronómetro en marcha guarda su tiempo | Funcionaba |
| Recargar conserva el cronómetro | **Fallaba**: se perdía el tiempo |
| Pausar y reanudar | **No existía** |
| Aviso al alcanzar el objetivo | **No existía** |
| Sugerencia según el objetivo de la rutina | **Fallaba**: lo ignoraba y sumaba 5 s a la mejor marca |
| Tiempos como `mm:ss` o `X s` | **Fallaba**: `1min 15s` |
| Cambiar de serie o tocar el menú del ejercicio conserva el tiempo | **Fallaba**: se descartaba |

## Límites de la verificación

- El bloqueo de pantalla se simula adelantando el reloj guardado y recargando; no se ha probado en un móvil real.
- La vibración del aviso no se puede comprobar en el e2e.

## Pendiente, fuera de esta issue

- Buscar «cuelgue» no da resultados: el catálogo lo llama «Suspensión colgado en barra».
- El registro no marca récord en series por tiempo, aunque el detalle sí lo cuenta.
- El detalle muestra «0 reps» en sesiones solo por tiempo.
- `suggest_next` del MCP no recibe objetivo de duración y sigue sumando 5 s a la mejor marca.
