# Contrato científico de ejercicios

`Exercise.science` es opcional: los backups versión 1 y los ejercicios personalizados anteriores siguen siendo válidos. La normalización y sincronización conservan los campos de personalizados; la biblioteca base sigue refrescándose desde su definición compartida.

`parseExerciseScience` valida los metadatos al introducirlos. `patron` usa `MOVEMENT_PATTERNS` de `shared/types.ts`: sentadilla, bisagra, empuje horizontal/vertical, tracción horizontal/vertical, zancada, acarreo, rotación, antirrotación y aislamiento (valores sin tildes y con guiones). `musculos` acepta grupos existentes y regiones de `REGIONS`, sin duplicados, con `rol` principal/secundario/estabilizador e `intensidad` finita de 0 a 100. El rol es explícito e independiente de los umbrales de color o `intensityLabel`.

`evidencia` admite `estimada`, `emg` e `hipertrofia`. Las dos últimas requieren fuentes con título, autores, año entero y DOI o URL HTTP(S) sin credenciales. El validador comprueba formato, no la existencia de un estudio ni su validez científica. La evidencia estimada no lleva citas.

`exerciseScience` devuelve los metadatos validados cuando existen. Para datos antiguos devuelve evidencia estimada sin fuentes ni patrón inferido: músculo principal 100 y secundarios 50, con roles del modelo antiguo. No transforma las intensidades históricas en evidencia medida. `exerciseActivation` y `sessionMuscles` mantienen su comportamiento; completar el catálogo y mostrar estos metadatos se aborda por separado.
