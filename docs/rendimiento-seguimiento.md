# Seguimiento de la referencia inicial

Referencia: [rendimiento.md](rendimiento.md), generada con `npm run perf` en #127.

- [#133: Reducir la espera al ampliar el historial con 416 sesiones](https://github.com/adriarroyo08/WorkStation/issues/133), Parte de #125. La ampliación más lenta tiene una mediana de 2449,7 ms; las 13 ampliaciones suman 16533,8 ms. El perfilado y la optimización quedan fuera de #127.

El scroll completo dura 4652,7 ms porque recorre toda la lista a pasos del 80 % del viewport por fotograma. Su peor intervalo tiene una mediana de 283,3 ms (máximo observado 950 ms); no se ha medido una pausa individual superior a 1 s durante el scroll. Arranque y cambios de pestaña tampoco superan 1 s de mediana.

Para comparar con la beta, conservar el informe original y comparar las mismas operaciones, el conjunto de datos, el navegador, el viewport y las condiciones de la máquina con los nuevos informes en `test-results/`. No comparar la duración total de un recorrido con un tiempo de respuesta a una sola interacción.
