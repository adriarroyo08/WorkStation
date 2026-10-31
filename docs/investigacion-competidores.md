# Investigación comparativa de funciones: Hevy, Strong, Fitbod y Boostcamp

> **Documento de investigación funcional**  
> **Fecha de consulta y recopilación:** 29 de octubre de 2026  
> **Épica relacionada:** Parte de #31 (Revisión exhaustiva frente a Hevy)  
> **Issue resuelta:** #37 (Investigar funciones de Hevy, Strong, Fitbod y Boostcamp)  
> **Objetivo:** Recopilar evidencia pública de competidores en 7 categorías clave, con URLs oficiales y distinción de planes, e inventariar con precisión las capacidades de Workstation con rutas concretas en `app/`, `shared/`, `mcp/` y `android/`.

---

## 1. Metodología y condiciones de la investigación

- **Fecha de recopilación:** 29 de octubre de 2026.
- **Fuentes:** Documentación oficial, sitios web comerciales, centros de ayuda oficiales y tiendas de aplicaciones de cada producto.
- **Áreas funcionales evaluadas (7 categorías obligatorias):**
  1. `Entreno`: registro de series, pesos, repeticiones, tipos de serie (calentamiento, drop set, fallo), RPE/RIR, temporizadores de descanso, calculadora de discos, superseries y notas.
  2. `Rutinas`: creadores de plantillas, límites gratuitos vs de pago, carpetas, compartir rutinas y programas prediseñados.
  3. `Estadísticas`: historial (alcance temporal), 1RM estimado, récords personales (PRs), gráficas de volumen/frecuencia, mapas musculares de fatiga/recuperación y medidas corporales.
  4. `Progresión`: sugerencias de sobrecarga progresiva, periodización, doble progresión y autorregulación.
  5. `Importación / Exportación`: exportación e importación CSV, backups locales, sincronización con plataformas de salud (Apple Health, Health Connect) y sincronización en la nube.
  6. `Conexión IA`: entrenadores IA, asistentes conversacionales, generación de rutinas mediante LLMs, APIs públicas para desarrolladores y servidores/conectores MCP (*Model Context Protocol*).
  7. `Reloj`: aplicaciones para Wear OS y watchOS (Apple Watch), sincronización en tiempo real, funcionamiento autónomo sin teléfono y registro de pulso.
- **Restricción de propiedad intelectual:** No se reproducen textos, interfaces protegidas ni código de las aplicaciones investigadas; se analizan exclusivamente características funcionales públicas.

---

## 2. Matriz global por producto y categoría

| Categoría | Hevy | Strong | Fitbod | Boostcamp | Workstation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Entreno** | Ilimitado en Free. RPE, notas, superseries y calculadora de discos en Free. Calculadora de calentamiento en Pro. | Ilimitado en Free. RPE, notas y superseries en Free. Calculadora de discos y calentamiento en PRO. | Prueba gratuita de 3 entrenos; luego 100% de pago (Elite). Sustitución inteligente de ejercicios, vídeos HD, temporizadores. | Ilimitado en Free. RPE con guía RIR, superseries, descansos. Calculadora de discos limitada (10 usos en Free, ilimitada en Pro). | **Implementado**: ilimitado y gratis. Series, reps, peso corporal/asistido, RPE, drop/fallo/warmup, calculadora de discos, superseries, notas y descansos con alarma nativa. RIR independiente parcial. |
| **2. Rutinas** | Hasta 4 rutinas en Free; ilimitadas y carpetas en Pro. Compartir por enlace/QR. | Hasta 3 plantillas en Free; ilimitadas en PRO. Sin carpetas. Compartir por enlace/texto. | Generación algorítmica dinámica por sesión según recuperación y material. Rutinas estáticas secundarias. | Acceso gratuito a más de 130 programas de entrenadores. Creador web y móvil ilimitado gratis. Programas IA en Pro. | **Implementado**: rutinas y carpetas ilimitadas gratis. Compartir por enlace comprimido sin servidor (LZ-string). 7 programas predefinidos y sugerencia "Hoy toca". |
| **3. Estadísticas** | Historial de 3 meses en Free; ilimitado en Pro. 1RM y PRs en Free. Desglose muscular avanzado y medidas completas en Pro. | Historial ilimitado en Free. Gráficas de evolución de 1RM y medidas corporales bloqueadas en Free (solo PRO). Sin mapa muscular. | 1RM y PRs en Elite. Mapa térmico de fatiga y recuperación muscular dinámico por músculo. Bloqueo tras 3 entrenos de prueba. | PRs e insignias gratis. Strength Score básico en Free; desglose por edad/peso, mapa muscular térmico y gráficas 1RM en Pro. | **Implementado**: historial ilimitado, 1RM Epley, PRs en vivo, mapa corporal de fatiga y recuperación (3 días / 30d / 1a), heatmap anual, 21 logros, niveles de fuerza y medidas con fotos. |
| **4. Progresión** | Visualización de la sesión previa en vivo. Planes de progresión estructurados en Hevy Pro / Trainer. | Visualización de sesión previa. Sin sobrecarga algorítmica automática (manual por el usuario). | Sobrecarga progresiva automática algorítmica (*mStrength™*) que ajusta cargas y series sesión a sesión según rendimiento. | Progresión pautada por programas en Free. Función *Auto Progression* algorítmica lineal/doble exclusiva de Pro. | **Implementado / Parcial**: sugerencia automática "Hoy toca: peso x reps" según sesión anterior y comparador "Frente a la última vez". Reglas de doble progresión formal min-max parciales. |
| **5. Importación / Exportación** | Exportación CSV gratis. Importación de CSV de Strong y Hevy gratis en app móvil. Apple Health / Health Connect. | Exportación CSV gratis. **Sin importación CSV** (unidireccional). Apple Health / Google Fit. | Exportación CSV en app. **Sin importación CSV**. Apple Health, Health Connect y Strava. | **Sin exportación CSV oficial** (solo extensiones web comunitarias). Sin importación CSV. Apple Health. | **Implementado**: exportación CSV compatible Hevy, importación CSV Hevy, importación por API oficial Hevy Pro, backups JSON automáticos y sync Supabase. Importador nativo Strong directo parcial. |
| **6. Conexión IA** | API REST oficial para usuarios Pro (`hevy.com/settings?developer`). Conector ChatGPT (`@hevy`) y servidores MCP comunitarios. | Ausente. No ofrece API pública ni integración con asistentes IA. | Algoritmo propietario de recomendación (*mStrength™*). Sin API pública, chat LLM ni conector MCP. | Generador de programas por cuestionario IA en Pro. Sin API para desarrolladores ni conector MCP. | **Implementado**: servidor MCP local (stdio), servidor MCP remoto Edge Function (HTTP/SSE con bearer tokens), 17 herramientas MCP de lectura/escritura y Coach IA multimodelo en la PWA (Gemini, Groq, OpenRouter, Ollama). |
| **7. Reloj** | Apple Watch (watchOS) y Wear OS (Wear OS 3+). Live Sync, rutinas, registro offline y pulso. | Apple Watch (watchOS 10+) con Live Sync y pulso. **Wear OS descontinuado/ausente**. | Apple Watch (watchOS) con registro completo. Wear OS disponible (básico: marcar series, requiere teléfono para editar y guardar). | **Ausente**: no tiene app para Apple Watch ni Wear OS (solo Live Activities en iOS). | **Implementado / Parcial**: app Wear OS nativa (Compose for Wear OS) con modo autónomo, pulso y Live Sync con teléfono Android. App Apple Watch (watchOS) ausente. |

---

## 3. Análisis detallado por producto competidor

### 3.1. Hevy

- **Página oficial:** [hevy.com](https://hevy.com) / [hevyapp.com](https://hevyapp.com)
- **Documentación y comparativa Pro:** [hevyapp.com/hevy-pro](https://hevyapp.com/hevy-pro/)
- **Centro de ayuda y exportación:** [hevyapp.com/export-data](https://hevyapp.com/export-data/)
- **Integración smartwatch:** [hevyapp.com/apple-watch](https://hevyapp.com/apple-watch/) y [hevyapp.com/wear-os-apple-watch-workout-tracker](https://hevyapp.com/wear-os-apple-watch-workout-tracker/)
- **Calculadora de discos:** [hevyapp.com/barbell-plate-calculator](https://hevyapp.com/barbell-plate-calculator/)
- **Integración IA y API desarrolladores:** [hevy.com/settings?developer](https://hevy.com/settings?developer) y [hevyapp.com/chatgpt-ai-workout-tracker](https://hevyapp.com/chatgpt-ai-workout-tracker/)
- **Plataformas soportadas:** iOS, Android, watchOS (Apple Watch), Wear OS (smartwatches Android) y Web ([hevy.com](https://hevy.com)).
- **Fecha de consulta:** 29 de octubre de 2026.
- **Planes de precios:**
  - *Versión gratuita*: $0 para siempre.
  - *Hevy Pro*: $2.99 / mes, $23.99 / año (~$2.00/mes) o $74.99 pago único de por vida (*Lifetime*).

#### Detalle por categoría en Hevy:
1. **Entreno:**
   - *Gratuito:* Registro ilimitado de sesiones, series, repeticiones y peso en kg o lb; tipos de serie estándar (normal, calentamiento, drop set y al fallo); RPE opcional; notas por ejercicio; temporizador de descanso ajustable con avisos sonoros; superseries; calculadora de discos para barra olímpica o estándar.
   - *Hevy Pro:* Calculadora de calentamiento automática que desglosa porcentajes del peso de trabajo en series preparatorias.
2. **Rutinas:**
   - *Gratuito:* Límite de hasta 4 rutinas guardadas activas; hasta 7 ejercicios personalizados. Compartición de rutinas por enlace web o código QR.
   - *Hevy Pro:* Rutinas ilimitadas, ejercicios personalizados ilimitados y organización de rutinas en carpetas temáticas.
3. **Estadísticas:**
   - *Gratuito:* Historial limitado a los últimos 3 meses (los entrenamientos anteriores no se eliminan pero quedan bloqueados a la visualización); estimación de 1RM; mejores marcas (PRs); registro de peso y perímetro de cintura.
   - *Hevy Pro:* Historial completo de por vida sin límites; todas las medidas corporales (porcentaje de grasa, bíceps, pecho, cuello, etc.); analítica avanzada de distribución de series y volumen por grupo muscular; informes periódicos.
4. **Progresión:**
   - *Gratuito:* Consulta de los valores de la sesión previa directamente en la pantalla de entrenamiento para copiar o comparar.
   - *Hevy Pro:* Integración con rutinas planificadas y seguimiento dentro de Hevy Trainer para progresión guiada.
5. **Importación / Exportación:**
   - *Gratuito:* Exportación completa de entrenamientos y medidas a formato CSV desde la app móvil (*Perfil → Ajustes → Exportar datos*). Importador nativo de CSV generado por Strong o por el propio Hevy. Sincronización bidireccional con Apple Health y Google Health Connect.
6. **Conexión IA:**
   - *Hevy Pro:* API REST oficial para desarrolladores con generación de API keys desde la interfaz web (`hevy.com/settings?developer`). Permite lectura y escritura de entrenamientos, plantillas, ejercicios y registros de sincronización.
   - *Ecosistema IA:* Conector oficial para ChatGPT (`@hevy`) que permite consultar historial o crear rutinas mediante lenguaje natural. Servidores MCP comunitarios (p. ej. `hevy-coach` en npm) para Claude.
7. **Reloj:**
   - *Gratuito:* App nativa para Apple Watch (watchOS) con sincronización en vivo (*Live Sync*) con el iPhone, temporizador de descanso, lectura de frecuencia cardíaca e inicio de entrenamientos offline.
   - *Gratuito:* App nativa para Wear OS (relojes con Wear OS 3 o superior, como Samsung Galaxy Watch 4+ o Pixel Watch), optimizada para pantallas circulares con control independiente del móvil.

---

### 3.2. Strong (Strong Workout Tracker)

- **Página oficial:** [strong.app](https://www.strong.app/) / [strongapp.io](https://strongapp.io/)
- **Centro de ayuda y exportación:** [help.strongapp.io/article/18-export-data](https://help.strongapp.io/article/18-export-data)
- **Funcionalidades y características:** [strongapp.io/features](https://strongapp.io/features)
- **Integración Apple Watch:** [help.strongapp.io](https://help.strongapp.io)
- **Plataformas soportadas:** iOS, Android y watchOS (Apple Watch).  
  *Nota sobre plataforma:* Strong descontinuó y no ofrece soporte activo para Wear OS en la actualidad.
- **Fecha de consulta:** 29 de octubre de 2026.
- **Planes de precios:**
  - *Versión gratuita*: $0.
  - *Strong PRO*: $4.99 / mes, $29.99 / año o $99.99 pago único de por vida (*Lifetime*).

#### Detalle por categoría en Strong:
1. **Entreno:**
   - *Gratuito:* Registro ilimitado de entrenamientos; series, repeticiones y peso; tipos de serie (calentamiento, drop set, al fallo); RPE; notas de ejercicio; temporizador de descanso y superseries.
   - *Strong PRO:* Calculadora de discos integrada; calculadora de calentamiento automática; temas visuales e iconos personalizados (iOS).
2. **Rutinas:**
   - *Gratuito:* Límite estricto de hasta 3 plantillas de entrenamiento (*templates*). Compartir rutinas como enlace o texto.
   - *Strong PRO:* Creación y almacenamiento de plantillas/rutinas ilimitadas. (Carece de sistema avanzado de carpetas).
3. **Estadísticas:**
   - *Gratuito:* Acceso a todo el historial de entrenamientos anteriores sin límite temporal.
   - *Strong PRO:* Acceso desbloqueado a gráficos de progreso histórico, curvas de 1RM estimado por ejercicio, progresión de volumen y módulo de medidas corporales (peso, grasa y perímetros).
4. **Progresión:**
   - *Gratuito:* Muestra en cada serie los datos logrados en la última sesión para referencia manual.
   - *Ausente:* No incluye algoritmos de sobrecarga progresiva automatizada; el usuario debe incrementar manualmente las cargas o repeticiones.
5. **Importación / Exportación:**
   - *Gratuito:* Exportación de todo el historial de entrenamientos a archivo CSV desglosado por series (*Perfil → Ajustes → Exportar entrenamientos*). Sincronización con Apple Health y Google Fit.
   - *Ausente:* **No permite importar archivos CSV** hacia Strong; la función de exportación es estrictamente unidireccional de salida.
6. **Conexión IA:**
   - *Ausente:* Strong no cuenta con asistente IA, generador conversacional ni API oficial pública para desarrolladores ni servidores MCP. Los usuarios que desean análisis de IA recurren a alimentar su CSV exportado en herramientas externas.
7. **Reloj:**
   - *Gratuito:* Aplicación nativa para Apple Watch (watchOS 10+) con *Live Sync* bidireccional con el iPhone, temporizadores, monitorización de frecuencia cardíaca y calorías.
   - *Ausente:* No cuenta con soporte para smartwatches Wear OS.

---

### 3.3. Fitbod

- **Página oficial:** [fitbod.me](https://fitbod.me/)
- **Cómo funciona el algoritmo:** [fitbod.me/how-it-works](https://fitbod.me/how-it-works/)
- **Preguntas frecuentes y soporte:** [fitbod.me/faq](https://fitbod.me/faq/)
- **Soporte Apple Watch:** [fitbod.me/apple-watch](https://fitbod.me/apple-watch/)
- **Soporte Android y Wear OS:** [fitbod.me/android](https://fitbod.me/android/)
- **Plataformas soportadas:** iOS, Android, watchOS (Apple Watch) y Wear OS.
- **Fecha de consulta:** 29 de octubre de 2026.
- **Planes de precios:**
  - *Versión gratuita:* Prueba gratuita limitada únicamente a los **3 primeros entrenamientos**. No existe plan gratuito ilimitado sostenible.
  - *Fitbod Elite:* $12.99 / mes o $79.99 / año (~$6.66/mes).

#### Detalle por categoría en Fitbod:
1. **Entreno:**
   - *Fitbod Elite:* Registro de series, reps, peso y RPE; temporizador de descanso automático; vídeos de demostración en alta definición para más de 1.000 ejercicios; sustitución inmediata de ejercicios según equipamiento disponible; calculadora de discos integrada.
2. **Rutinas:**
   - *Fitbod Elite:* Enfoque basado en generación dinámica diaria en lugar de rutinas fijas rígidas. Permite configurar múltiples perfiles de equipamiento (gimnasio comercial, mancuernas en casa, peso corporal en hotel, bandas elásticas). Permite guardar rutinas manuales, aunque el uso principal es la generación por IA/algoritmo.
3. **Estadísticas:**
   - *Fitbod Elite:* Mapa corporal de fatiga y recuperación muscular en tiempo real (porcentajes de recuperación por músculo calculados tras cada entrenamiento); curvas de 1RM estimado; historial de marcas personales y volumen total acumulado.
4. **Progresión:**
   - *Fitbod Elite:* Algoritmo de sobrecarga progresiva automatizada (*mStrength™*) respaldado por aprendizaje automático sobre millones de registros; recalcula pesos y repeticiones sesión tras sesión adaptándose a la autorregulación indicada por el usuario.
5. **Importación / Exportación:**
   - *Fitbod Elite:* Exportación de entrenamientos a CSV desde la pestaña de historial (*Log → Ajustes → Exportar datos*). Sincronización con Apple Health, Google Health Connect y Strava.
   - *Ausente:* No admite importación de datos desde archivos CSV externos de otros competidores.
6. **Conexión IA:**
   - *Fitbod Elite:* Motor propietario algorítmico/IA cerrado (*mStrength™*) para confección de entrenamientos y adaptación de cargas.
   - *Ausente:* No cuenta con interfaz de chat conversacional LLM abierta, API pública para desarrolladores ni compatibilidad con el estándar MCP.
7. **Reloj:**
   - *Apple Watch:* Aplicación nativa watchOS que permite registrar series, consultar pesos y sincronizar en vivo con iPhone y Apple Health.
   - *Wear OS:* Aplicación para Wear OS (Android 8.0+); permite consultar ejercicios y marcar series completadas desde la muñeca; requiere recurrir al teléfono para modificar la estructura de ejercicios o finalizar y guardar la sesión en el historial.

---

### 3.4. Boostcamp

- **Página oficial:** [boostcamp.app](https://www.boostcamp.app/)
- **Comparativa Pro:** [boostcamp.app/pro](https://www.boostcamp.app/pro)
- **Biblioteca de programas:** [boostcamp.app/programs](https://www.boostcamp.app/programs)
- **Plataformas soportadas:** iOS, Android y versión web completa de escritorio ([boostcamp.app](https://www.boostcamp.app/)).  
  *Nota sobre smartwatches:* No dispone de aplicación para Apple Watch ni Wear OS.
- **Fecha de consulta:** 29 de octubre de 2026.
- **Planes de precios:**
  - *Boostcamp Free ($0 para siempre):* Acceso gratuito y completo a más de 130 programas de entrenadores reconocidos, registro ilimitado y creador de programas.
  - *Boostcamp Pro:* $14.99 / mes o $59.99 / año (con 7 días de prueba gratis).

#### Detalle por categoría en Boostcamp:
1. **Entreno:**
   - *Gratuito:* Registro ilimitado de series, reps y cargas; registro de RPE con sugerencia de RIR (*Reps In Reserve*); temporizadores de descanso con inicio automático; soporte de superseries, drop sets y series de calentamiento; 10 usos gratuitos de la calculadora de discos.
   - *Boostcamp Pro:* Calculadora de discos y generador de series de calentamiento de uso ilimitado.
2. **Rutinas:**
   - *Gratuito:* Acceso a más de 130 programas pautados multi-semana diseñados por entrenadores de renombre (Greg Nuckols, Eric Helms, Alberto Nuñez, Alex Bromley, etc.); creador de programas personalizados multi-semana ilimitado tanto en la app móvil como en la plataforma web de escritorio.
   - *Boostcamp Pro:* Más de 20 programas premium adicionales exclusivos; generador de programas personalizados por cuestionario IA (*AI Program Generator*) según objetivos, días de entrenamiento y lesiones.
3. **Estadísticas:**
   - *Gratuito:* Medallas de marcas personales (PRs) en vivo; tabla de marcas históricas; puntuación de fuerza básica (*Strength Score*).
   - *Boostcamp Pro:* Desglose analítico avanzado de fuerza ajustado por sexo, edad y peso corporal; *Muscle Tracker* (mapa térmico de volumen acumulado por grupo muscular); análisis de tendencias de 1RM estimado y curvas de rendimiento por rango de repeticiones (de 1 a 12 reps).
4. **Progresión:**
   - *Gratuito:* Progresión lineal o porcentual preprogramada integrada en los programas de los entrenadores.
   - *Boostcamp Pro:* Función *Auto Progression* que calcula e incrementa automáticamente las cargas y repeticiones sugeridas para futuras sesiones según las series completadas mediante progresión lineal o doble.
5. **Importación / Exportación:**
   - *Ausente en la app:* No cuenta con botón nativo oficial en los ajustes de la app para exportar el historial a CSV (la comunidad suele recurrir a extensiones de navegador no oficiales como *Boostcamp History to CSV* o a inspección de peticiones de red en la web). Tampoco admite importación de CSV.
   - *Gratuito:* Sincronización con Apple Health.
6. **Conexión IA:**
   - *Boostcamp Pro:* *AI Program Generator* que genera rutinas a partir de un formulario de entrada.
   - *Ausente:* No dispone de chat interactivo con coach IA, API REST pública ni conector de protocolo MCP.
7. **Reloj:**
   - *Ausente:* Boostcamp no ofrece aplicación nativa ni para Apple Watch ni para smartwatches con Wear OS (únicamente utiliza *Live Activities* en la pantalla de bloqueo de iOS para mostrar la serie y el descanso actual).

---

## 4. Inventario exhaustivo de capacidades de Workstation

Inventario detallado de Workstation verificado en los módulos `app/` (PWA React + Vite), `shared/` (lógica y tipos compartidos), `mcp/` (servidor Model Context Protocol) y `android/` (aplicación móvil y Wear OS). Clasificado rigurosamente en **Implementado**, **Parcial** y **Ausente**.

### 4.1. Categoría 1: Entreno

| Capacidad | Estado | Rutas y ficheros concretos | Notas de implementación |
| :--- | :---: | :--- | :--- |
| **Registro de series, reps y peso (kg/lb)** | **Implementado** | `app/src/components/WorkoutLogger.tsx`<br>`shared/session.ts`<br>`shared/types.ts`<br>`shared/units.ts` | Datos almacenados siempre en kg; visualización en kg o lb mediante `shared/units.ts`. |
| **Peso corporal (+lastre o asistido)** | **Implementado** | `shared/types.ts#L40-L46`<br>`app/src/components/WorkoutLogger.tsx` | Soporte tipado de peso corporal positivo (lastre) y negativo (asistido en máquina o gomas). |
| **Tipos de serie (calentamiento, drop, fallo)** | **Implementado** | `shared/types.ts#L48-L55`<br>`app/src/components/WorkoutLogger.tsx` | Tipado explícito de `warmup`, `drop`, `failure` y `normal`, con distintivos visuales y colores. |
| **Referencia a sesión anterior por serie** | **Implementado** | `app/src/components/WorkoutLogger.tsx`<br>`shared/stats.ts` | Columna "Anterior" con un toque para duplicar carga y reps; emparejamiento inteligente de series. |
| **RPE (Rate of Perceived Exertion)** | **Implementado** | `shared/types.ts#L52`<br>`app/src/components/WorkoutLogger.tsx`<br>`app/src/components/Settings.tsx` | Registro de escala RPE de 6 a 10 configurable en Ajustes. |
| **Temporizador de descanso por ejercicio** | **Implementado** | `app/src/components/RestPicker.tsx`<br>`app/src/rest.ts`<br>`android/phone/src/main/java/com/workstation/app/RestAlarmReceiver.kt` | Cuenta atrás con barra visual, sonido, vibración y alarma nativa exacta en Android con pantalla apagada. |
| **Calculadora de discos (plate calculator)** | **Implementado** | `shared/session.ts`<br>`app/src/components/WorkoutLogger.tsx`<br>`app/src/components/Settings.tsx` | Peso de barra y conjunto de discos configurables en Ajustes; colores olímpicos estándar. |
| **Generador de series de calentamiento** | **Implementado** | `shared/session.ts#L180-L215`<br>`app/src/components/WorkoutLogger.tsx` | Cálculo automático de series progresivas a partir del peso de trabajo planeado. |
| **Superseries y reordenación de ejercicios** | **Implementado** | `shared/session.ts`<br>`app/src/components/Reorder.tsx`<br>`app/src/components/WorkoutLogger.tsx` | Agrupación de ejercicios en bloques de superserie y reordenación por arrastre táctil o teclado. |
| **Frecuencia cardíaca en vivo** | **Implementado** | `app/src/hr.ts`<br>`android/phone/src/main/java/com/workstation/app/PhoneListenerService.kt`<br>`android/wear/src/main/java/com/workstation/app/HeartRateService.kt` | Compatible con pulsómetros Web Bluetooth estándar y lectura continua del sensor en Wear OS. |
| **Selector de RIR (Reps In Reserve) independiente** | **Parcial** | `shared/types.ts#L52` | Se registra RPE numérico (del cual RIR = 10 - RPE), pero no existe selector UI explícito de RIR. |
| **Cronómetro de tiempo bajo tensión (TUT)** | **Ausente** | Ninguno | No existe medición de cadencia o segundos por repetición. |

### 4.2. Categoría 2: Rutinas

| Capacidad | Estado | Rutas y ficheros concretos | Notas de implementación |
| :--- | :---: | :--- | :--- |
| **Creador y editor de rutinas ilimitadas** | **Implementado** | `app/src/components/RoutineEditor.tsx`<br>`shared/types.ts` | 100% gratuito sin límite de plantillas; edición serie a serie, notas y descansos por defecto. |
| **Organización en carpetas** | **Implementado** | `app/src/components/Train.tsx`<br>`shared/types.ts` | Creación de carpetas, duplicar, mover y organizar rutinas jerárquicamente. |
| **Compartir rutinas sin servidor** | **Implementado** | `shared/routine-share.ts`<br>`app/src/components/SharedRoutine.tsx` | Compresión LZ-string en la URL; el destinatario importa la rutina completa sin depender de backend. |
| **Programas predefinidos** | **Implementado** | `shared/templates.ts`<br>`app/src/components/Explore.tsx` | 7 rutinas de referencia integradas (Cuerpo completo, 5×5, Torso/Pierna, PPL, Arnold, Casa, Glúteo). |
| **Sugerencia "Hoy toca"** | **Implementado** | `shared/planning.ts`<br>`app/src/components/Train.tsx` | Rotación inteligente de la siguiente rutina del programa dentro de una carpeta. |
| **Creación de rutinas mediante Coach IA** | **Implementado** | `shared/ai.ts`<br>`app/src/components/Coach.tsx`<br>`mcp/src/index.ts` | El Coach IA de la app o clientes MCP pueden diseñar y guardar rutinas directamente en la app. |
| **Planificador de mesociclos multi-semana con % 1RM** | **Parcial** | `shared/planning.ts` | Se pueden organizar rutinas por días, pero no existe una vista de periodización ondulatoria de semanas 1 a 12 con porcentajes de 1RM formalizados. |
| **Feed social público de rutinas de la comunidad** | **Ausente** | Ninguno | Workstation es una app personal y privada; no dispone de red social centralizada ni catálogo público de terceros. |

### 4.3. Categoría 3: Estadísticas

| Capacidad | Estado | Rutas y ficheros concretos | Notas de implementación |
| :--- | :---: | :--- | :--- |
| **Historial de entrenamientos ilimitado** | **Implementado** | `app/src/components/History.tsx`<br>`shared/stats.ts` | Historial completo de por vida, buscador por nombre/ejercicio y vista de calendario mensual. |
| **Cálculo de 1RM estimado (fórmula de Epley)** | **Implementado** | `shared/stats.ts`<br>`app/src/components/LineChart.tsx`<br>`app/src/components/ExercisesTab.tsx` | Cálculo en `shared/stats.ts` y visualización temporal con rangos configurables (3m, 6m, 1a, todo). |
| **Récords personales (PRs) por repeticiones** | **Implementado** | `shared/stats.ts`<br>`app/src/components/WorkoutLogger.tsx`<br>`app/src/components/ExercisesTab.tsx` | Detección de mejores marcas por número de reps (1, 3, 5, 10 reps) y celebración en vivo al completar la serie. |
| **Mapa corporal de volumen muscular** | **Implementado** | `shared/muscle-detail.ts`<br>`app/src/components/BodyMap.tsx`<br>`app/src/components/Profile.tsx` | Mapa interactivo de distribución muscular por periodos (30 días, 3 meses, 1 año). |
| **Mapa térmico de recuperación muscular** | **Implementado** | `shared/muscle-detail.ts`<br>`app/src/components/Train.tsx` | Cálculo de porcentaje de recuperación muscular según series realizadas en los últimos 3 días. |
| **Calendario de actividad anual (heatmap)** | **Implementado** | `app/src/components/YearHeatmap.tsx`<br>`app/src/components/Profile.tsx` | Vista estilo GitHub con intensidad de volumen/sesiones por día a lo largo del año. |
| **Niveles de fuerza (Principiante a Élite)** | **Implementado** | `shared/strength.ts`<br>`app/src/components/Strength.tsx` | Baremos de fuerza para 8 levantamientos fundamentales según peso corporal y sexo del usuario. |
| **Sistema de logros desbloqueables (21 logros)** | **Implementado** | `shared/achievements.ts`<br>`app/src/components/Achievements.tsx` | Celebración y seguimiento de hitos de constancia, tonelaje y clubes de marcas. |
| **Resumen anual ("Tu año en Workstation")** | **Implementado** | `shared/wrapped.ts`<br>`app/src/components/Wrapped.tsx` | Historias interactivas estilo Wrapped con horas, volumen, equivalencias y tarjeta para compartir. |
| **Informes periódicos (semana, mes, año)** | **Implementado** | `shared/reports.ts`<br>`app/src/components/Reports.tsx` | Comparativa con periodos anteriores, análisis de coach IA y exportación a PDF o texto. |
| **Medidas corporales y fotos de progreso** | **Implementado** | `shared/types.ts`<br>`app/src/components/Measurements.tsx` | Peso, grasa corporal, 11 perímetros corporales y fotos de progreso con deslizador comparativo local. |
| **Métricas de carga aguda/crónica (ACWR)** | **Ausente** | Ninguno | No implementa cálculo de fatiga acumulada mediante modelos ACWR o marcadores de sobreentrenamiento fisiológico. |

### 4.4. Categoría 4: Progresión

| Capacidad | Estado | Rutas y ficheros concretos | Notas de implementación |
| :--- | :---: | :--- | :--- |
| **Sugerencia de sobrecarga progresiva** | **Implementado** | `shared/progression.ts`<br>`app/src/components/WorkoutLogger.tsx` | Sugiere incremento de carga ("Hoy: 82,5 kg × 8") si se cumplió el objetivo en la sesión anterior. |
| **Comparativa "Frente a la última vez"** | **Implementado** | `shared/stats.ts`<br>`app/src/components/WorkoutLogger.tsx`<br>`app/src/components/WorkoutDetail.tsx` | Comparación global de volumen, series, repeticiones y tiempo frente a la sesión previa de la misma rutina. |
| **Doble progresión configurable por ejercicio** | **Parcial** | `shared/progression.ts` | El cálculo sugiere subidas al superar el histórico, pero la interfaz no permite al usuario configurar explícitamente un rango objetivo (p. ej. "8-12 reps") en la definición de la rutina. |
| **Periodización por autorregulación RPE en vivo** | **Parcial** | `shared/ai.ts`<br>`shared/session.ts` | El usuario puede registrar RPE y consultar al Coach IA, pero el motor de la app no recalcula automáticamente las series siguientes en vivo según el RPE registrado. |
| **Detección de estancamiento y descarga automática (*deload*)** | **Ausente** | Ninguno | No dispone de detección heurística de fallo reiterado para recomendar semanas de descarga programadas. |

### 4.5. Categoría 5: Importación / Exportación

| Capacidad | Estado | Rutas y ficheros concretos | Notas de implementación |
| :--- | :---: | :--- | :--- |
| **Exportación completa a CSV (compatible Hevy)** | **Implementado** | `shared/hevy.ts`<br>`app/src/components/Settings.tsx` | Genera archivo CSV con estructura compatible con la exportación de Hevy para máxima portabilidad. |
| **Importación de CSV de Hevy** | **Implementado** | `shared/hevy.ts`<br>`app/src/components/Settings.tsx` | Importa entrenamientos, ejercicios, series, notas y RPE desde archivos CSV generados por Hevy. |
| **Importación por API oficial de Hevy Pro** | **Implementado** | `shared/hevy.ts`<br>`mcp/src/index.ts`<br>`shared/mcp-tools.ts` | Descarga entrenamientos directamente desde la API oficial de Hevy usando la API key de Hevy Pro del usuario. |
| **Copias automáticas diarias y por eventos (JSON)** | **Implementado** | `shared/backups.ts`<br>`app/src/backups.ts`<br>`app/src/components/AutoBackups.tsx` | Guarda las últimas 7 copias diarias y 5 copias previas a importaciones o limpiezas en el almacenamiento local. |
| **Copia de seguridad y restauración manual (JSON)** | **Implementado** | `app/src/backups.ts`<br>`app/src/components/Settings.tsx` | Exportación e importación íntegra de la base de datos de la app en formato JSON. |
| **Sincronización en la nube (Supabase)** | **Implementado** | `shared/sync.ts`<br>`app/src/cloud.ts`<br>`supabase/migrations/001_records.sql`<br>`supabase/migrations/003_sync_hardening.sql` | Sincronización en tiempo real y offline con resolución de conflictos por marca de tiempo (*last write wins*). |
| **Importador nativo de CSV de Strong directo** | **Parcial** | `shared/hevy.ts` | No cuenta con un parser nativo directo para el dialecto CSV de Strong; requiere convertirlo al esquema compatible de Hevy previamente. |
| **Sincronización con Apple Health / Google Health Connect** | **Parcial** | `android/phone/src/main/java/com/workstation/app/` | La app Android maneja notificaciones nativas y Wearable Data Layer, pero carece de enlace directo con los APIs de Apple HealthKit o Android Health Connect. |

### 4.6. Categoría 6: Conexión IA

| Capacidad | Estado | Rutas y ficheros concretos | Notas de implementación |
| :--- | :---: | :--- | :--- |
| **Servidor MCP nativo local (stdio)** | **Implementado** | `mcp/src/index.ts`<br>`mcp/src/store.ts` | Conexión local lista para Claude Desktop, Cursor, LM Studio; opera con base de datos Supabase o archivo JSON local. |
| **Servidor MCP remoto HTTP/SSE (Edge Function)** | **Implementado** | `mcp/src/edge.ts`<br>`shared/mcp-http.ts`<br>`supabase/migrations/002_api_keys.sql` | Desplegado sobre Supabase Edge Functions con autenticación Bearer por API key personal (`ws_...`). |
| **Conjunto de herramientas MCP de lectura y escritura** | **Implementado** | `shared/mcp-tools.ts` | 17 herramientas completas: consulta de entrenos, análisis, récords, logros, creación de rutinas, registro de entrenos y medidas. |
| **Coach IA conversacional en la app (Multi-proveedor)** | **Implementado** | `shared/ai.ts`<br>`app/src/components/Coach.tsx`<br>`app/src/components/Settings.tsx` | Compatible con Google Gemini, Groq, OpenRouter y Ollama local; sin coste adicional usando API key propia del usuario. |
| **Traducción y explicación de ejercicios por IA** | **Implementado** | `shared/ai.ts`<br>`app/src/components/ExercisesTab.tsx` | Generación y traducción al castellano de guías paso a paso de ejecución de ejercicios. |
| **Análisis de informes de periodo por IA** | **Implementado** | `shared/reports.ts`<br>`app/src/components/Reports.tsx` | Comentarios cualitativos de progreso insertados en los informes semanales y mensuales. |
| **Entrada de entrenamientos por voz o lenguaje natural en app** | **Parcial** | `shared/mcp-tools.ts` | Posible a través de clientes de IA conectados mediante MCP (`log_workout`), pero ausente como control de dictado o parseo de audio en la UI de la PWA. |

### 4.7. Categoría 7: Reloj

| Capacidad | Estado | Rutas y ficheros concretos | Notas de implementación |
| :--- | :---: | :--- | :--- |
| **App Wear OS nativa (Compose for Wear OS)** | **Implementado** | `android/wear/src/main/java/com/workstation/app/MainActivity.kt`<br>`android/wear/src/main/java/com/workstation/app/WatchUi.kt` | Interfaz optimizada para pantallas redondas de Wear OS (Wear OS 3+). |
| **Entreno autónomo desde la muñeca** | **Implementado** | `android/wear/src/main/java/com/workstation/app/Local.kt`<br>`android/wear/src/main/java/com/workstation/app/WatchUi.kt` | Permite iniciar entrenos o rutinas, registrar series, ajustar peso/reps con botones +/− y finalizar el entreno sin el móvil. |
| **Sincronización en vivo reloj ↔ móvil** | **Implementado** | `android/wear/src/main/java/com/workstation/app/PhoneLink.kt`<br>`android/phone/src/main/java/com/workstation/app/PhoneListenerService.kt`<br>`android/phone/src/main/java/com/workstation/app/WatchBus.kt` | Comunicación bidireccional mediante el *Wearable Data Layer* (`MessageClient`). |
| **Temporizador de descanso en muñeca con háptica** | **Implementado** | `android/wear/src/main/java/com/workstation/app/WatchUi.kt` | Cuenta atrás circular con controles −15s / +15s / saltar y vibración háptica al concluir. |
| **Monitorización continua de frecuencia cardíaca** | **Implementado** | `android/wear/src/main/java/com/workstation/app/HeartRateService.kt`<br>`android/wear/src/main/java/com/workstation/app/HeartRate.kt` | Lectura del sensor de pulso del reloj, cálculo de media, máxima y mínima, y guardado en la sesión. |
| **Notificación fija y alarma exacta en teléfono** | **Implementado** | `android/phone/src/main/java/com/workstation/app/WorkoutService.kt`<br>`android/phone/src/main/java/com/workstation/app/RestAlarmReceiver.kt` | Servicio en primer plano con cronómetro en barra de estado y alarma exacta con pantalla apagada. |
| **App para Apple Watch (watchOS)** | **Ausente** | Ninguno | Workstation está desarrollada como PWA web y aplicación Android nativa; carece de aplicación para el ecosistema watchOS de Apple. |

---

## 5. Conclusiones y preparación para la issue #38

1. **Ventajas competitivas de Workstation:**
   - **Coste cero y privacidad:** A diferencia de Hevy (que limita rutinas a 4 e historial a 3 meses en Free) y Strong (que limita a 3 plantillas y bloquea gráficas), Workstation ofrece historial ilimitado, rutinas ilimitadas, calculadora de discos, generador de calentamiento y gráficas completas de forma 100% gratuita y sin anuncios.
   - **Ecosistema IA abierto y pionero:** Ningún competidor del mercado cuenta con un servidor MCP nativo (local y remoto) que permita a modelos de lenguaje (Claude, ChatGPT, Cursor) interactuar de forma bidireccional con los entrenamientos. Además, su Coach IA interno en la PWA admite proveedores gratuitos (Gemini, Groq, OpenRouter, Ollama) sin requerir suscripciones mensuales como Fitbod ($79.99/año).
   - **Soporte de Wear OS maduro:** Posee aplicación autónoma para Wear OS con pulso y sincronización en vivo, superando a Strong (que no soporta Wear OS) y Boostcamp (que carece de apps para reloj).
2. **Huecos prioritarios detectados para transformar en tareas (Issue #38):**
   - *Doble progresión configurable:* Permitir al usuario definir rangos de repeticiones objetivo (ej. 8-12) en las plantillas y automatizar el incremento cuando se alcanza el techo en todas las series.
   - *Selector dedicado de RIR:* Añadir un selector de repeticiones en reserva diferenciado del RPE en la pantalla de entrenamiento para usuarios de escuelas de hipertrofia.
   - *Importador nativo de CSV de Strong:* Facilitar la migración de usuarios desde Strong sin requerir pasos intermedios.
   - *Estructuración formal de mesociclos:* Proveer soporte para programas de varias semanas con cargas planificadas por porcentajes de 1RM.
