# Fixtures Strong

Ejemplos sintéticos anonimizados del contrato solicitado en #83, sin entrenamientos ni nombres personales reales. No son archivos extraídos de cuentas de usuarios.

- `unitless.csv`: cabeceras clásicas con coma, sin unidades, coma decimal entre comillas, notas con comillas y salto de línea, W/D/F y duración textual/reloj.
- `explicit.csv`: variante con punto y coma, `Workout #`, `Duration (sec)`, `Weight (kg)` y `Distance (meters)`, coma decimal y columna desconocida.

Las variantes admitidas y las restricciones se documentan en `shared/strong.ts`; las variantes lb y unidades por fila se ejercitan en `shared/strong.test.ts`. Las fechas ambiguas se rechazan, sin elegir un formato por defecto.
