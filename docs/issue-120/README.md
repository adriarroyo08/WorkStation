# Evidencia de la issue #120

`e2e/deload.spec.ts` siembra tres sesiones al mismo peso y repeticiones, con esfuerzo alto, y una rutina con rango 8-12. Comprueba el placeholder al vaciar las reps, el objetivo del chip, el aviso plegable, aplicar la descarga (3 series pendientes → 2 manteniendo el peso), deshacer y descartar el aviso.

Se ejecuta en claro y oscuro a 360 × 740, con movimiento reducido, sin desbordamiento horizontal y sin violaciones axe WCAG A/AA. Las capturas `registro-light.png` y `registro-dark.png` muestran el objetivo y el aviso desplegados. Un tercer caso comprueba el objetivo en libras y la meseta sin esfuerzo alto, que no ofrece aplicar descarga.

`shared/deload.test.ts` verifica la reducción para 0-5 series pendientes, el redondeo hacia arriba y la conservación de calentamientos, series hechas y pesos.
