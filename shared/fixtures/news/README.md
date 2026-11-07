# Fixtures de noticias

Respuestas **sintéticas**, sin artículos copiados, basadas en los formatos de las fuentes aprobadas en `docs/investigacion-fuentes-noticias.md`: Frontiers (RSS 2.0), JISSN (RSS 1.0/RDF), PLOS ONE (Atom), Fisiología del Ejercicio y Stronger by Science (RSS WordPress). No requieren red.

Los marcadores en `content`/`content:encoded` comprueban que nunca se utiliza el cuerpo como resumen. Los tests añaden XML hostil y malformado. `parseNewsFeed` falla para documentos inválidos y omite entradas sin titular o enlace HTTP(S); fechas desconocidas se representan con `''` y se ordenan al final. Los temas proceden del catálogo auditado, sin inferirlos del contenido.

El resumen tiene un máximo global de 280 caracteres Unicode, incluida la elipsis, o el límite de la fuente si es menor. Los enlaces relativos se resuelven contra `xml:base` o el endpoint; los fragmentos se eliminan para deduplicar por URL. Los IDs se derivan de fuente y URL canónica; la fecha más reciente gana y los empates se resuelven por orden léxico, sin depender de la hora de ingesta ni del orden del feed.
