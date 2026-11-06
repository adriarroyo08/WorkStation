// Fichas de investigación bibliográfica con fuentes científicas verificadas (Issue #53, Épica #35).
// Base de conocimiento estructurada para futuros artículos y respuestas del coach de entrenamiento.

export type ResearchTopicId = 'creatina' | 'proteina' | 'volumen' | 'frecuencia' | 'descanso' | 'sueno' | 'deficit' | 'recomposicion' | 'cardio-fuerza' | 'progresion';

export const RESEARCH_TOPIC_IDS: readonly ResearchTopicId[] = [
  'creatina',
  'proteina',
  'volumen',
  'frecuencia',
  'descanso',
  'sueno',
  'deficit',
  'recomposicion',
  'cardio-fuerza',
  'progresion',
] as const;

export type ResearchEvidenceLevel = 'posicion_oficial' | 'metaanalisis' | 'ensayos_controlados' | 'revision_sistematica' | 'observacional' | 'evidencia_limitada';

export interface VerifiedSource {
  titulo: string;
  autores: string[];
  año: number;
  doi: string;
  url?: string;
  fechaConsulta: string; // Formato YYYY-MM-DD
  tipoEstudio: 'posicion_oficial' | 'metaanalisis' | 'revision_sistematica' | 'ensayo_controlado';
}

export interface TopicResearchSheet {
  id: ResearchTopicId;
  tema: string;
  pregunta: string;
  nivelEvidencia: ResearchEvidenceLevel;
  poblacion: {
    tipo: string;
    detalles: string;
  };
  conclusionesPermitidas: string[];
  limites: {
    asociacionVsCausalidad: string;
    noExtrapolar: string[];
    ausenciaEvidencia: string[];
  };
  fuentes: VerifiedSource[];
}

export const TOPIC_RESEARCH_SHEETS: readonly TopicResearchSheet[] = [
  {
    id: 'creatina',
    tema: 'Monohidrato de creatina en rendimiento y masa muscular',
    pregunta: '¿Cuáles son la dosis eficaz, el protocolo de ingesta y los efectos contrastados de la suplementación con monohidrato de creatina en la fuerza y la masa magra?',
    nivelEvidencia: 'posicion_oficial',
    poblacion: {
      tipo: 'Población general activa, deportistas y adultos mayores',
      detalles: 'Estudiado ampliamente en hombres y mujeres jóvenes entrenados y no entrenados, así como en adultos mayores para mitigar sarcopenia.',
    },
    conclusionesPermitidas: [
      'El monohidrato de creatina incrementa de forma estadísticamente significativa la concentración de fosfocreatina intramuscular, mejorando la fuerza máxima (1RM), la potencia y la acumulación de volumen en series sucesivas.',
      'Dosis de mantenimiento: 3 a 5 g/día de forma continuada saturan las reservas musculares en aproximadamente 3 a 4 semanas sin requerir fase de carga obligatoria.',
      'La fase de carga tradicional (20 g/día divididos en 4 tomas de 5 g durante 5-7 días) satura las reservas con mayor rapidez pero produce ganancias equivalentes a largo plazo.',
      'No existe evidencia científica que respalde que el monohidrato cause daño renal, calambres o caída del cabello en individuos sanos que consuman dosis recomendadas.',
      'El monohidrato de creatina es la forma química más eficaz, estable y coste-efectiva; ninguna variante comercializada ha demostrado superioridad funcional.',
    ],
    limites: {
      asociacionVsCausalidad:
        'La elevación de creatinina sérica en analíticas es un metabolito inocuo de la excreción de creatina exógena (marcador de laboratorio) y no implica deterioro causal de la tasa de filtración glomerular renal.',
      noExtrapolar: [
        'No extrapolar la seguridad demostrada en riñones sanos a pacientes con patologías renales preexistentes graves sin supervisión nefrológica.',
        'La ganancia inicial de peso (1-2 kg) se debe a retención hídrica intracelular (ósmosis celular miocítica) y no debe confundirse con hipertrofia contráctil ni acumulación de tejido graso.',
      ],
      ausenciaEvidencia: [
        'Ausencia de evidencia sobre supuesta caída capilar: la hipótesis popular deriva de un único estudio con mediciones de DHT sérica en 25 rugbiers sin replicación clínica posterior.',
        'Existe un porcentaje de no respondedores (aprox. 20-30%) que ya cuentan con reservas musculares basales casi saturadas (común en dietas ricas en carne roja) y experimentan menor magnitud de cambio.',
      ],
    },
    fuentes: [
      {
        titulo: 'International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation in exercise, sport, and medicine',
        autores: ['Kreider RB', 'Kalman DS', 'Antonio J', 'Ziegenfuss TN', 'Wildman R', 'Collins R', 'Candow DG', 'Kleiner SM', 'Almada AL', 'Lopez HL'],
        año: 2017,
        doi: '10.1186/s12970-017-0173-z',
        url: 'https://doi.org/10.1186/s12970-017-0173-z',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'posicion_oficial',
      },
      {
        titulo: 'Common questions and misconceptions about creatine supplementation: what does the scientific evidence really show?',
        autores: ['Antonio J', 'Candow DG', 'Forbes SC', 'Gualano B', 'Jagim AR', 'Kreider RB', 'Rawson ES', 'Smith-Ryan AE', 'VanDusseldorp TA', 'Willoughby DS', 'Ziegenfuss TN'],
        año: 2021,
        doi: '10.1186/s12970-021-00412-w',
        url: 'https://doi.org/10.1186/s12970-021-00412-w',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'revision_sistematica',
      },
    ],
  },
  {
    id: 'proteina',
    tema: 'Ingesta proteica total diaria y distribución en hipertrofia muscular',
    pregunta: '¿Cuál es la cantidad diaria óptima de proteína y qué relevancia tiene su distribución por toma para maximizar la síntesis proteica miofibrilar y la hipertrofia?',
    nivelEvidencia: 'metaanalisis',
    poblacion: {
      tipo: 'Adultos sanos que realizan entrenamiento de fuerza',
      detalles: 'Abarca tanto personas no entrenadas como sujetos con años de experiencia en deportes de fuerza e hipertrofia.',
    },
    conclusionesPermitidas: [
      'La ingesta proteica total diaria óptima para maximizar ganancias de masa muscular y fuerza inducidas por entrenamiento de resistencia se sitúa en un rango de 1,6 a 2,2 g/kg/día.',
      'El metaanálisis y meta-regresión de Morton et al. identifica un punto de corte meseta en 1,62 g/kg/día (IC 95%: 1,03 - 2,20 g/kg/día), más allá del cual las ganancias adicionales en sujetos en normocaloría son marginales.',
      'Para maximizar la respuesta anabólica por toma, se recomienda un aporte de 0,40 a 0,55 g/kg/toma (aprox. 25 a 40 g de proteína de alta calidad rica en leucina) repartido en 3 a 5 comidas diarias.',
      'La ingesta total diaria es el factor determinante primario; la ventana temporal perientrenamiento es amplia y no requiere un consumo inmediato forzado si la ingesta proteica diaria es adecuada.',
    ],
    limites: {
      asociacionVsCausalidad:
        'Los picos agudos de síntesis proteica muscular (MPS) medidos a 3-4 horas tras la ingesta no correlacionan de forma lineal y causal perfecta con la hipertrofia neta acumulada tras meses de entrenamiento.',
      noExtrapolar: [
        'No extrapolar los requerimientos en personas sedentarias (RDA de 0,8 g/kg) a deportistas que realizan sobrecarga muscular continua.',
        'No extrapolar que doblar la ingesta por encima de 2,2-2,5 g/kg/día en normocaloría produzca proporcionalmente el doble de hipertrofia muscular.',
      ],
      ausenciaEvidencia: [
        'Ausencia de evidencia sobre toxicidad renal o hepática derivada de ingestas elevadas (>2,5 g/kg/día) en individuos con función renal y hepática íntegra.',
        'Datos limitados sobre si la ingesta de proteína antes de dormir mejora el anabolismo global de forma independiente o si actúa simplemente como otro vehículo para elevar la ingesta total diaria.',
      ],
    },
    fuentes: [
      {
        titulo: 'International Society of Sports Nutrition Position Stand: protein and exercise',
        autores: [
          'Jäger R',
          'Kerksick CM',
          'Campbell BI',
          'Cribb PJ',
          'Wells SD',
          'Skwiat TM',
          'Purpura M',
          'Ziegenfuss TN',
          'Ferrando AA',
          'Arent SM',
          'Smith-Ryan AE',
          'Stout JR',
          'Arciero PJ',
          'Ormsbee MJ',
          'Taylor LW',
          'Wilborn CD',
          'Kalman DS',
          'Kreider RB',
          'Willoughby DS',
          'Hoffman JR',
          'Krzykowski JL',
          'Antonio J',
        ],
        año: 2017,
        doi: '10.1186/s12970-017-0177-8',
        url: 'https://doi.org/10.1186/s12970-017-0177-8',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'posicion_oficial',
      },
      {
        titulo: 'A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults',
        autores: ['Morton RW', 'Murphy KT', 'McKellar SR', 'Schoenfeld BJ', 'Henselmans M', 'Helms E', 'Aragon AA', 'Devries MC', 'Banfield L', 'Krieger JW', 'Phillips SM'],
        año: 2018,
        doi: '10.1136/bjsports-2017-097608',
        url: 'https://doi.org/10.1136/bjsports-2017-097608',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'metaanalisis',
      },
      {
        titulo: 'How much protein can the body use in a single meal for muscle-building? Implications for daily protein distribution',
        autores: ['Schoenfeld BJ', 'Aragon AA'],
        año: 2018,
        doi: '10.1186/s12970-018-0215-1',
        url: 'https://doi.org/10.1186/s12970-018-0215-1',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'revision_sistematica',
      },
    ],
  },
  {
    id: 'volumen',
    tema: 'Relación dosis-respuesta del volumen de series semanales por músculo',
    pregunta: '¿Cuál es el volumen óptimo de series efectivas semanales por grupo muscular para maximizar la hipertrofia y dónde se sitúa el rendimiento decreciente?',
    nivelEvidencia: 'metaanalisis',
    poblacion: {
      tipo: 'Sujetos entrenados y no entrenados',
      detalles: 'La literatura incluye ensayos de 6 a 12 semanas evaluando cambios de sección transversal o grosor muscular por ultrasonido y resonancia.',
    },
    conclusionesPermitidas: [
      'Existe una relación dosis-respuesta escalonada y positiva entre el número de series efectivas semanales y la hipertrofia muscular: realizar 10 o más series semanales por grupo muscular produce ganancias superiores frente a realizar menos de 5 o entre 5 y 9 series.',
      'Un rango de 10 a 20 series efectivas semanales por grupo muscular representa la ventana de mayor eficiencia hipertrófica para la mayoría de practicantes intermedios y avanzados.',
      'Superar las 20 a 22 series semanales por grupo muscular muestra rendimientos decrecientes y un riesgo exponencial de fatiga acumulada desproporcionada (volumen basura) si las series se llevan con esfuerzo real.',
      'Para que una serie sea considerada efectiva debe ejecutarse con una intensidad de esfuerzo cercana al fallo muscular voluntario (RIR ≤ 3 a 4).',
    ],
    limites: {
      asociacionVsCausalidad: 'Aumentar el número de series no causa automáticamente más hipertrofia si la proximidad al fallo o la técnica decaen drásticamente por fatiga neuromuscular central.',
      noExtrapolar: [
        'No extrapolar la tolerancia de atletas avanzados o con soporte ergogénico a sujetos naturales con capacidad de recuperación limitada.',
        'No contar series secundarias o indirectas (p. ej., tríceps en press de banca) como series idénticas a una serie de aislamiento directo sin ponderación.',
      ],
      ausenciaEvidencia: [
        'Ausencia de consenso empírico que demuestre superioridad de volúmenes ultra-altos (>30 series semanales) frente a volúmenes moderados cuando el esfuerzo por serie se controla rigurosamente.',
        'Variabilidad interindividual significativa en la respuesta de volumen óptimo (volumen mínimo efectivo vs volumen máximo recuperable).',
      ],
    },
    fuentes: [
      {
        titulo: 'Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis',
        autores: ['Schoenfeld BJ', 'Ogborn D', 'Krieger JW'],
        año: 2017,
        doi: '10.1080/02640414.2016.1210197',
        url: 'https://doi.org/10.1080/02640414.2016.1210197',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'metaanalisis',
      },
      {
        titulo: 'A Systematic Review of The Effects of Different Resistance Training Volumes on Muscle Hypertrophy',
        autores: ['Baz-Valle E', 'Balsalobre-Fernández C', 'Alix-Fages C', 'Santos-Concejero J'],
        año: 2022,
        doi: '10.2478/hukin-2022-0017',
        url: 'https://doi.org/10.2478/hukin-2022-0017',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'revision_sistematica',
      },
    ],
  },
  {
    id: 'frecuencia',
    tema: 'Frecuencia de entrenamiento semanal por grupo muscular',
    pregunta: '¿Afecta la frecuencia de entrenamiento (1, 2 o más veces por semana por grupo muscular) a la hipertrofia cuando el volumen total semanal está igualado?',
    nivelEvidencia: 'metaanalisis',
    poblacion: {
      tipo: 'Individuos jóvenes entrenados y no entrenados',
      detalles:
        'Ensayos clínicos de intervención longitudinal comparando rutinas tipo "bro-split" (1 día por músculo) frente a rutinas de mayor frecuencia (torso/pierna, empuje/tracción o cuerpo completo).',
    },
    conclusionesPermitidas: [
      'Cuando el volumen total semanal de series está igualado, la frecuencia de entrenamiento por grupo muscular (1 frente a 2 o 3 veces por semana) no muestra diferencias estadísticamente significativas en la hipertrofia muscular.',
      'La frecuencia es principalmente una variable de distribución que permite gestionar el volumen: dividir volúmenes semanales altos (>8-10 series por músculo) en 2 o más sesiones semanales reduce la fatiga intra-sesión y preserva la calidad de cada serie.',
      'Para personas que requieren más de 10-12 series semanales en un músculo, frecuencias de 2 veces por semana suelen ser superiores en la práctica que 1 vez por semana debido a la prevención del volumen basura por fatiga aguda.',
    ],
    limites: {
      asociacionVsCausalidad:
        'La aparente ventaja observada en rutinas de mayor frecuencia en estudios sin igualar volumen se debe al mayor volumen total acumulado y no a un efecto causal intrínseco de la frecuencia.',
      noExtrapolar: [
        'No extrapolar que entrenar un músculo a diario con volumen desmedido ofrezca ventajas adicionales; el músculo requiere 48 a 72 horas para recuperación tisular según el daño inducido.',
        'La preferencia del usuario y la adherencia al horario son más críticas que la frecuencia teórica exacta.',
      ],
      ausenciaEvidencia: [
        'Ausencia de evidencia sólida que respalde frecuencias superiores a 3 veces por semana para hipertrofia en músculos grandes en sujetos naturales.',
        'Escasez de literatura que compare frecuencias ultra-altas (4-6 veces por semana) en deportes de fuerza manteniendo el volumen estricto.',
      ],
    },
    fuentes: [
      {
        titulo:
          'How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis of studies examining the effects of resistance training frequency',
        autores: ['Schoenfeld BJ', 'Grgic J', 'Krieger J'],
        año: 2019,
        doi: '10.1080/02640414.2018.1555906',
        url: 'https://doi.org/10.1080/02640414.2018.1555906',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'metaanalisis',
      },
      {
        titulo: 'Resistance training frequency and skeletal muscle hypertrophy: A review of available evidence',
        autores: ['Grgic J', 'Schoenfeld BJ', 'Latella C'],
        año: 2019,
        doi: '10.1016/j.jsams.2018.09.223',
        url: 'https://doi.org/10.1016/j.jsams.2018.09.223',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'revision_sistematica',
      },
    ],
  },
  {
    id: 'descanso',
    tema: 'Duración de los intervalos de descanso entre series',
    pregunta: '¿Cómo influye la duración del descanso entre series (cortos ≤ 60 s vs largos ≥ 2-3 min) en el rendimiento de fuerza y la ganancia de masa muscular?',
    nivelEvidencia: 'metaanalisis',
    poblacion: {
      tipo: 'Hombres y mujeres jóvenes con experiencia previa en fuerza',
      detalles: 'Estudios controlados que evalúan adaptaciones de fuerza máxima en sentadilla/press de banca y grosor muscular por ecografía tras periodos de 8 a 10 semanas.',
    },
    conclusionesPermitidas: [
      'Los intervalos de descanso más largos (de 2 a 3 minutos o más) promueven de forma consistente mayores ganancias de fuerza máxima y mayor hipertrofia muscular en ejercicios compuestos multiarticulares que los descansos cortos (≤ 60 segundos).',
      'El mecanismo principal radica en la capacidad de mantener cargas más altas y mayor volumen de repeticiones efectivas en series sucesivas al permitir la resíntesis completa de fosfocreatina y la recuperación neuromuscular central.',
      'En ejercicios analíticos o de aislamiento monoarticulares (p. ej., flexiones de bíceps, elevaciones laterales), descansos de 60 a 90 segundos son suficientes sin perjudicar significativamente el rendimiento acumulado.',
      'El estrés metabólico elevado y los picos transitorios de hormona del crecimiento producidos por descansos cortos no compensan la pérdida de tensión mecánica por fatiga prematura.',
    ],
    limites: {
      asociacionVsCausalidad: 'Los picos hormonales agudos (GH, testosterona) tras descansos cortos no causan mayor síntesis proteica miofibrilar ni hipertrofia longitudinal.',
      noExtrapolar: [
        'No extrapolar que descansos infinitos (>5-10 minutos) aporten ventajas proporcionales infinitas; el tiempo disponible por sesión y el enfriamiento articular imponen límites prácticos.',
        'En técnicas de alta densidad (drop-sets, rest-pause), el mecanismo busca fatiga en tiempo reducido, pero no debe sustituir el bloque principal de fuerza pesada.',
      ],
      ausenciaEvidencia: [
        'Ausencia de evidencia que demuestre que recortar el descanso a menos de 1 minuto mantenga el volumen de carga en series llevadas cerca del fallo.',
        'Pocos estudios evaluando descansos auto-seleccionados frente a descansos cronometrados fijos en sujetos de élite.',
      ],
    },
    fuentes: [
      {
        titulo: 'The effects of short versus long inter-set rest intervals on resistance training-induced muscle hypertrophy: A systematic review and meta-analysis',
        autores: ['Grgic J', 'Lazinica B', 'Mikulic P', 'Krieger JW', 'Schoenfeld BJ'],
        año: 2017,
        doi: '10.1080/17461391.2017.1340524',
        url: 'https://doi.org/10.1080/17461391.2017.1340524',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'metaanalisis',
      },
      {
        titulo: 'Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men',
        autores: ['Schoenfeld BJ', 'Pope ZK', 'Benik FM', 'Hester GM', 'Sellers J', 'Nooner JL', 'Schnaiter JA', 'Miranda KE', 'Gotshalk LA', 'Krieger JW', 'Evetovich TK'],
        año: 2016,
        doi: '10.1519/JSC.0000000000001272',
        url: 'https://doi.org/10.1519/JSC.0000000000001272',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'ensayo_controlado',
      },
    ],
  },
  {
    id: 'sueno',
    tema: 'Efectos del sueño y la restricción del descanso en la composición corporal y la fuerza',
    pregunta: '¿De qué manera afecta la restricción crónica de sueño a la pérdida de grasa, la retención de masa muscular y la expresión de fuerza máxima?',
    nivelEvidencia: 'ensayos_controlados',
    poblacion: {
      tipo: 'Adultos con sobrepeso sometidos a déficit y deportistas sometidos a pruebas de rendimiento',
      detalles: 'Estudios de restricción de sueño en laboratorio metabólico y revisiones sistemáticas en atletas de fuerza.',
    },
    conclusionesPermitidas: [
      'La restricción crónica de sueño (reducción de ~1 hora a 1,5 horas por noche durante varias semanas) altera negativamente la composición del peso perdido durante un déficit calórico: se pierde una proporción significativamente mayor de masa magra libre de grasa y menor proporción de tejido graso.',
      'Dormir menos de 7 horas de forma continuada perjudica de manera selectiva la fuerza en movimientos multiarticulares complejos (sentadillas, peso muerto) mediado por fatiga neural y disminución del esfuerzo percibido.',
      'Una única noche de privación parcial de sueño tiene un impacto menor en fuerza máxima aislada de 1RM que la acumulación de déficit de sueño durante múltiples noches consecutivas.',
      'La higiene del sueño (regularidad horaria, ambiente oscuro y fresco, reducción de estimulantes) es una intervención no negociable para la recuperación neuromuscular y la síntesis tisular.',
    ],
    limites: {
      asociacionVsCausalidad:
        'Aunque la correlación entre mal sueño y descenso de testosterona/aumento de cortisol es sólida, las fluctuaciones hormonales puntuales no explican por sí solas todo el deterioro; el factor motivacional y neural es el mediador causal primario.',
      noExtrapolar: [
        'No extrapolar que el "sueño compensatorio" de fin de semana elimine por completo el impacto metabólico de la deuda acumulada entre semana.',
        'No asumir que dormir 11-12 horas diarias ofrezca un incremento hipertrófico proporcional ilimitado; existe una curva en U donde tanto el déficit extremo (<6 h) como el exceso extremo (>10 h en no deportistas) correlacionan con peor salud.',
      ],
      ausenciaEvidencia: [
        'Ausencia de ensayos longitudinales controlados de más de 6 meses que midan hipertrofia con MRI bajo diferentes duraciones estandarizadas de sueño en culturistas de competición.',
        'Evidencia limitada sobre la eficacia aislada de suplementos inductores del sueño (melatonina, magnesio) frente al impacto de la higiene de hábitos básica.',
      ],
    },
    fuentes: [
      {
        titulo: 'Influence of sleep restriction on weight loss outcomes associated with caloric restriction',
        autores: ['Wang X', 'Sparks JR', 'Bowyer KP', 'Youngstedt SD'],
        año: 2018,
        doi: '10.1093/sleep/zsy027',
        url: 'https://doi.org/10.1093/sleep/zsy027',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'ensayo_controlado',
      },
      {
        titulo: 'Inadequate sleep and muscle strength: Implications for resistance training',
        autores: ['Knowles OE', 'Drinkwater EJ', 'Urwin CS', 'Lamon S', 'Aisbett B'],
        año: 2018,
        doi: '10.1016/j.jsams.2018.01.012',
        url: 'https://doi.org/10.1016/j.jsams.2018.01.012',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'revision_sistematica',
      },
      {
        titulo: 'Sleep Hygiene for Optimizing Recovery in Athletes: Review and Recommendations',
        autores: ['Vitale KC', 'Owens R', 'Hopkins SR', 'Malhotra A'],
        año: 2019,
        doi: '10.1055/a-0905-3103',
        url: 'https://doi.org/10.1055/a-0905-3103',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'revision_sistematica',
      },
    ],
  },
  {
    id: 'deficit',
    tema: 'Ritmo de pérdida de peso y preservación de masa magra en déficit energético',
    pregunta: '¿Cuál es la tasa semanal óptima de reducción de peso corporal y qué requerimientos nutricionales permiten retener la masa magra en etapas de definición?',
    nivelEvidencia: 'posicion_oficial',
    poblacion: {
      tipo: 'Atletas de fuerza, culturistas naturales y deportistas con bajo porcentaje de grasa',
      detalles: 'Ensayos de pérdida de peso rápida vs lenta en deportistas y recomendaciones de sociedades científicas.',
    },
    conclusionesPermitidas: [
      'Un ritmo de pérdida de peso gradual situado entre el 0,5% y el 1,0% del peso corporal total por semana maximiza la retención de masa magra y minimiza las caídas de rendimiento de fuerza en comparación con déficits agresivos.',
      'El estudio de referencia de Garthe et al. demostró que una pérdida lenta (0,7%/semana) permitió aumentar la masa magra (+2,1%) y la fuerza 1RM en atletas entrenados, mientras que una pérdida rápida (1,4%/semana) no produjo ganancia magra (-0,2%).',
      'Durante el déficit calórico, los requerimientos proteicos aumentan: se recomienda una ingesta de 2,3 a 3,1 g/kg de masa libre de grasa para prevenir el catabolismo proteico muscular.',
      'El entrenamiento de fuerza con alta intensidad relativa de carga debe mantenerse como estímulo de preservación tisular no negociable; el cardio actúa solo como herramienta de gasto energético complementario.',
    ],
    limites: {
      asociacionVsCausalidad:
        'La pérdida de peso en báscula refleja agua, glucógeno, grasa y tejido magro; la correlación temporal entre déficit y pérdida de peso no permite atribuir toda la reducción a pérdida de tejido adiposo sin medición antropométrica fiable.',
      noExtrapolar: [
        'No extrapolar la recomendación de déficit lento (0,5-1%/semana) a personas con obesidad mórbida que requieren intervenciones clínicas médicas específicas.',
        'No asumir que un déficit agresivo siempre cause pérdida muscular si el sujeto tiene un porcentaje de grasa elevado (>25-30% en hombres, >35% en mujeres).',
      ],
      ausenciaEvidencia: [
        'Ausencia de evidencia que demuestre superioridad de los refeeds o descansos de dieta (diet breaks) en la tasa metabólica basal a largo plazo más allá de beneficios psicológicos y de adherencia.',
        'Poca literatura sobre déficits extremos prolongados en mujeres atletas naturales sin desencadenar la tríada de la atleta femenina (deficiencia energética relativa en el deporte / RED-S).',
      ],
    },
    fuentes: [
      {
        titulo: 'Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes',
        autores: ['Garthe I', 'Raastad T', 'Refsnes PE', 'Koivisto A', 'Sundgot-Borgen J'],
        año: 2011,
        doi: '10.1123/ijsnem.21.2.97',
        url: 'https://doi.org/10.1123/ijsnem.21.2.97',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'ensayo_controlado',
      },
      {
        titulo: 'Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation',
        autores: ['Helms ER', 'Aragon AA', 'Fitschen PJ'],
        año: 2014,
        doi: '10.1186/1550-2783-11-20',
        url: 'https://doi.org/10.1186/1550-2783-11-20',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'revision_sistematica',
      },
      {
        titulo: 'International society of sports nutrition position stand: diets and body composition',
        autores: [
          'Aragon AA',
          'Schoenfeld BJ',
          'Wildman R',
          'Kleiner S',
          'VanDusseldorp T',
          'Taylor L',
          'Earnest CP',
          'Arciero PJ',
          'Wilborn C',
          'Kalman DS',
          'Stout JR',
          'Willoughby DS',
          'Campbell B',
          'Arent SM',
          'Bannock L',
          'Smith-Ryan AE',
          'Antonio J',
        ],
        año: 2017,
        doi: '10.1186/s12970-017-0174-y',
        url: 'https://doi.org/10.1186/s12970-017-0174-y',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'posicion_oficial',
      },
    ],
  },
  {
    id: 'recomposicion',
    tema: 'Recomposición corporal: ganancia simultánea de masa muscular y pérdida de grasa',
    pregunta: '¿En qué poblaciones es fisiológicamente posible la recomposición corporal simultánea y qué condiciones de entrenamiento y nutrición la posibilitan?',
    nivelEvidencia: 'revision_sistematica',
    poblacion: {
      tipo: 'Individuos novatos, desentrenados, personas con sobrepeso y sujetos entrenados',
      detalles: 'Revisión exhaustiva de Barakat et al. y ensayos controlados con dietas hiperproteicas bajo restricción calórica combinadas con fuerza intensa.',
    },
    conclusionesPermitidas: [
      'La recomposición corporal (ganar masa muscular magra mientras se reduce masa grasa en el mismo periodo) es un fenómeno ampliamente documentado y viable no solo en principiantes o personas con sobrepeso, sino también en individuos entrenados en fuerza.',
      'El estímulo mecánico de la sobrecarga progresiva en el entrenamiento de fuerza es el factor desencadenante indispensable para elevar la síntesis de proteína muscular por encima del balance neto de degradación.',
      'Una ingesta proteica elevada (≥ 2,0 a 2,4 g/kg/día) combinada con un déficit calórico moderado (10% a 20%) es la estrategia con mayor tasa de éxito demostrada.',
      'El ensayo de Longland et al. en sujetos con sobrepeso confirmó que el grupo con alta proteína (2,4 g/kg/d) ganó 1,2 kg de masa magra mientras perdió 4,8 kg de grasa en 4 semanas de déficit marcado con entrenamiento intenso.',
    ],
    limites: {
      asociacionVsCausalidad:
        'El balance energético negativo no impide la síntesis proteica miofibrilar local si las reservas de triglicéridos corporales aportan la energía necesaria para el coste metabólico de la hipertrofia.',
      noExtrapolar: [
        'No extrapolar la magnitud de la recomposición observada en novatos a competidores de élite cerca de su límite genético, donde el ritmo de cambio es extremadamente sutil y difícil de capturar.',
        'Los errores de precisión de mediciones de impedancia bioeléctrica o pliegues cutáneos pueden generar falsos positivos de recomposición; se requiere DEXA o ecografía para rigor.',
      ],
      ausenciaEvidencia: [
        'Ausencia de ensayos que comparen directamente fases tradicionales de volumen/definición frente a recomposición continua a lo largo de varios años en atletas avanzados.',
        'Poca evidencia empírica en sujetos entrenados muy magros (<8-10% grasa en hombres) logrando hipertrofia significativa sin superávit calórico.',
      ],
    },
    fuentes: [
      {
        titulo: 'Body Recomposition: Can Trained Individuals Build Muscle and Lose Fat at the Same Time?',
        autores: ['Barakat C', 'Pearson J', 'Escalante G', 'Campbell B', 'De Souza EO'],
        año: 2020,
        doi: '10.1519/SSC.0000000000000584',
        url: 'https://doi.org/10.1519/SSC.0000000000000584',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'revision_sistematica',
      },
      {
        titulo: 'Higher compared with lower dietary protein during an energy deficit combined with intense exercise promotes greater lean mass gain and fat mass loss: a randomized trial',
        autores: ['Longland TM', 'Oikawa SY', 'Mitchell CJ', 'Devries MC', 'Phillips SM'],
        año: 2016,
        doi: '10.3945/ajcn.115.119339',
        url: 'https://doi.org/10.3945/ajcn.115.119339',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'ensayo_controlado',
      },
    ],
  },
  {
    id: 'cardio-fuerza',
    tema: 'Entrenamiento concurrente: compatibilidad de cardio y fuerza y fenómeno de interferencia',
    pregunta: '¿Existe una interferencia biológica real del entrenamiento aeróbico sobre la fuerza y la hipertrofia muscular y cómo debe programarse para minimizarla?',
    nivelEvidencia: 'metaanalisis',
    poblacion: {
      tipo: 'Deportistas y adultos jóvenes activos',
      detalles: 'Metaanálisis de Schumann et al. (2022) y Wilson et al. (2012) integrando decenas de estudios sobre entrenamiento concurrente vs entrenamiento exclusivo de fuerza.',
    },
    conclusionesPermitidas: [
      'El entrenamiento concurrente (fuerza + ejercicio aeróbico) no compromete la hipertrofia muscular ni las ganancias de fuerza máxima (1RM) cuando se programa con un volumen e intensidad aeróbica moderados.',
      'El fenómeno de interferencia afecta de forma selectiva y estadísticamente significativa al desarrollo de potencia explosiva y tasa de desarrollo de fuerza (RFD).',
      'La modalidad de cardio influye decisivamente: el ciclismo genera menor interferencia que la carrera a pie, debido al componente excéntrico y al mayor daño tisular de la carrera.',
      'Separar las sesiones de cardio y de fuerza por al menos 3 a 6 horas (o realizarlas en días alternos) atenúa significativamente la interferencia en la potencia y reduce la fatiga neuromuscular residual.',
    ],
    limites: {
      asociacionVsCausalidad:
        'La interferencia no se debe a un bloqueo molecular insalvable entre las vías AMPK y mTOR in vivo en humanos, sino primariamente a fatiga neuromuscular residual no disipada y volumen excesivo no recuperado.',
      noExtrapolar: [
        'No extrapolar que corredores de fondo de 80 km semanales puedan maximizar hipertrofia igual que un levantador exclusivo.',
        'La interferencia es altamente específica de los grupos musculares involucrados (el cardio de piernas no interfiere con el press de banca).',
      ],
      ausenciaEvidencia: [
        'Ausencia de evidencia que demuestre interferencia perjudicial del cardio de baja intensidad en estado estacionario (LISS, como caminar o elíptica suave) en la hipertrofia.',
        'Falta de protocolos estandarizados definitivos sobre la frecuencia óptima de HIIT combinada con fuerza en sujetos de élite.',
      ],
    },
    fuentes: [
      {
        titulo: 'Compatibility of Concurrent Aerobic and Strength Training for Skeletal Muscle Size and Maximal Strength: An Updated Systematic Review and Meta-Analysis',
        autores: ['Schumann M', 'Feuerbacher JF', 'Sünkeler M', 'Freitag N', 'Rønnestad BR', 'Doma K', 'Cheng S'],
        año: 2022,
        doi: '10.1007/s40279-021-01587-7',
        url: 'https://doi.org/10.1007/s40279-021-01587-7',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'metaanalisis',
      },
      {
        titulo: 'Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises',
        autores: ['Wilson JM', 'Marin PJ', 'Rhea MR', 'Wilson SMC', 'Loenneke JP', 'Anderson JC'],
        año: 2012,
        doi: '10.1519/JSC.0b013e31823a3e2d',
        url: 'https://doi.org/10.1519/JSC.0b013e31823a3e2d',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'metaanalisis',
      },
    ],
  },
  {
    id: 'progresion',
    tema: 'Modelos de sobrecarga progresiva y progresión de cargas',
    pregunta: '¿Cuáles son las estrategias científicamente validadas para aplicar sobrecarga progresiva (aumento de carga vs repeticiones vs periodización) en fuerza e hipertrofia?',
    nivelEvidencia: 'posicion_oficial',
    poblacion: {
      tipo: 'Adultos sanos de nivel principiante, intermedio y avanzado',
      detalles:
        'Posición oficial del ACSM (2009), metaanálisis de Williams et al. sobre periodización y ensayo controlado de Plotkin et al. (2022) comparando progresión por peso vs por repeticiones.',
    },
    conclusionesPermitidas: [
      'La sobrecarga progresiva es el principio biológico indispensable para la adaptación neuromuscular continuada; requiere incrementar de forma sistemática las demandas mecánicas sobre el músculo a lo largo del tiempo.',
      'El aumento de la carga externa (peso en la barra) y el incremento de repeticiones con una carga fija generan adaptaciones hipertróficas equivalentes siempre que las series se ejecuten con cercanía similar al fallo muscular (Plotkin et al., 2022).',
      'El modelo de progresión de cargas de la ACSM recomienda la "regla del 2 por 2": cuando el usuario puede realizar 1 a 2 repeticiones adicionales por encima del objetivo fijado en 2 entrenamientos consecutivos, se debe aumentar la carga entre un 2% y un 10%.',
      'El entrenamiento periodizado (lineal o no lineal / ondulante) produce ganancias de fuerza máxima significativamente superiores a largo plazo que el entrenamiento no periodizado en sujetos con experiencia previa.',
    ],
    limites: {
      asociacionVsCausalidad:
        'Levantar más peso es una consecuencia de adaptaciones morfológicas y neurales, y a su vez una causa de mayor tensión mecánica; pero forzar subidas de carga descuidando la técnica o el rango de movimiento no causa mayor hipertrofia.',
      noExtrapolar: [
        'No extrapolar progresiones lineales continuadas semana a semana (típicas de novatos) a sujetos avanzados, donde la progresión debe medirse en meses o mediante periodización ondulante.',
        'No asumir que añadir volumen indiscriminadamente compense una falta de sobrecarga progresiva en intensidad o tensión mecánica.',
      ],
      ausenciaEvidencia: [
        'Ausencia de evidencia que demuestre la superioridad absoluta de un modelo de periodización específico (ondulante diaria vs ondulante semanal vs lineal en bloques) en hipertrofia pura cuando el volumen e intensidad están igualados.',
        'Poca literatura con seguimiento a más de 12 meses en modelos de autorregulación por RPE/RIR frente a porcentajes fijos de 1RM en población femenina de competición.',
      ],
    },
    fuentes: [
      {
        titulo: 'American College of Sports Medicine position stand: Progression models in resistance training for healthy adults',
        autores: ['American College of Sports Medicine'],
        año: 2009,
        doi: '10.1249/MSS.0b013e3181915670',
        url: 'https://doi.org/10.1249/MSS.0b013e3181915670',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'posicion_oficial',
      },
      {
        titulo: 'Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations',
        autores: ['Plotkin D', 'Coleman M', 'Van Every D', 'Maldonado J', 'Oberlin D', 'Israetel M', 'Feather J', 'Alto A', 'Vigotsky AD', 'Schoenfeld BJ'],
        año: 2022,
        doi: '10.7717/peerj.14142',
        url: 'https://doi.org/10.7717/peerj.14142',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'ensayo_controlado',
      },
      {
        titulo: 'Comparison of Periodized and Non-Periodized Resistance Training on Maximal Strength: A Meta-Analysis',
        autores: ['Williams TD', 'Tolusso DV', 'Fedewa MV', 'Esco MR'],
        año: 2017,
        doi: '10.1007/s40279-017-0734-y',
        url: 'https://doi.org/10.1007/s40279-017-0734-y',
        fechaConsulta: '2026-11-02',
        tipoEstudio: 'metaanalisis',
      },
    ],
  },
];

export function getTopicResearch(id: string): TopicResearchSheet | undefined {
  return TOPIC_RESEARCH_SHEETS.find((sheet) => sheet.id === id);
}

export function getAllTopicResearch(): readonly TopicResearchSheet[] {
  return TOPIC_RESEARCH_SHEETS;
}

export function getEvidenceSummaryForPrompt(topicId: ResearchTopicId): string {
  const sheet = getTopicResearch(topicId);
  if (!sheet) return '';
  const conclusiones = sheet.conclusionesPermitidas.map((c) => `- ${c}`).join('\n');
  const limites = [
    `- Causalidad: ${sheet.limites.asociacionVsCausalidad}`,
    ...sheet.limites.noExtrapolar.map((ne) => `- No extrapolar: ${ne}`),
    ...sheet.limites.ausenciaEvidencia.map((ae) => `- Sin evidencia inventada: ${ae}`),
  ].join('\n');
  return `EVIDENCIA CIENTÍFICA [${sheet.tema.toUpperCase()} - Nivel: ${sheet.nivelEvidencia}]:\nPregunta: ${sheet.pregunta}\nPoblación: ${sheet.poblacion.tipo} (${sheet.poblacion.detalles})\nConclusiones validadas:\n${conclusiones}\nLímites y precauciones:\n${limites}`;
}

export function validateResearchSheet(sheet: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!sheet || typeof sheet !== 'object') {
    return { valid: false, errors: ['La ficha debe ser un objeto.'] };
  }
  const s = sheet as Partial<TopicResearchSheet>;
  if (!s.id || !RESEARCH_TOPIC_IDS.includes(s.id as ResearchTopicId)) {
    errors.push(`ID de tema ausente o no válido: "${s.id}".`);
  }
  if (!s.tema || typeof s.tema !== 'string' || s.tema.trim().length === 0) {
    errors.push('Falta el nombre del tema.');
  }
  if (!s.pregunta || typeof s.pregunta !== 'string' || s.pregunta.trim().length === 0) {
    errors.push('Falta la pregunta de investigación.');
  }
  if (!s.nivelEvidencia || !['posicion_oficial', 'metaanalisis', 'ensayos_controlados', 'revision_sistematica', 'observacional', 'evidencia_limitada'].includes(s.nivelEvidencia)) {
    errors.push(`Nivel de evidencia no válido: "${s.nivelEvidencia}".`);
  }
  if (!s.poblacion || typeof s.poblacion !== 'object' || !s.poblacion.tipo || !s.poblacion.detalles) {
    errors.push('La población debe especificar tipo y detalles.');
  }
  if (!Array.isArray(s.conclusionesPermitidas) || s.conclusionesPermitidas.length === 0) {
    errors.push('Debe incluir al menos una conclusión permitida.');
  }
  if (!s.limites || typeof s.limites !== 'object' || typeof s.limites.asociacionVsCausalidad !== 'string' || !Array.isArray(s.limites.noExtrapolar) || !Array.isArray(s.limites.ausenciaEvidencia)) {
    errors.push('Los límites deben incluir asociacionVsCausalidad, noExtrapolar y ausenciaEvidencia.');
  }
  if (!Array.isArray(s.fuentes) || s.fuentes.length === 0) {
    errors.push('Debe incluir al menos una fuente científica verificada.');
  } else {
    for (let i = 0; i < s.fuentes.length; i++) {
      const f = s.fuentes[i];
      if (!f.titulo || typeof f.titulo !== 'string' || f.titulo.trim().length === 0) {
        errors.push(`Fuente #${i + 1}: falta el título.`);
      }
      if (!Array.isArray(f.autores) || f.autores.length === 0) {
        errors.push(`Fuente #${i + 1}: debe contener al menos un autor.`);
      }
      if (!f.año || typeof f.año !== 'number' || f.año < 1900 || f.año > 2030) {
        errors.push(`Fuente #${i + 1}: año no válido.`);
      }
      if (!f.doi || !/^10\.\d{4,9}\/[^\s]+$/i.test(f.doi)) {
        errors.push(`Fuente #${i + 1}: formato de DOI no válido (${f.doi}).`);
      }
      if (!f.fechaConsulta || !/^\d{4}-\d{2}-\d{2}$/.test(f.fechaConsulta)) {
        errors.push(`Fuente #${i + 1}: fechaConsulta debe seguir formato YYYY-MM-DD.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateAllResearchSheets(sheets: unknown): { valid: boolean; errors: string[] } {
  if (!Array.isArray(sheets)) {
    return { valid: false, errors: ['Se esperaba un array de fichas.'] };
  }
  const allErrors: string[] = [];
  const foundIds = new Set<string>();

  for (const sheet of sheets) {
    const res = validateResearchSheet(sheet);
    if (!res.valid) {
      allErrors.push(...res.errors);
    }
    const s = sheet as Partial<TopicResearchSheet>;
    if (s.id) {
      if (foundIds.has(s.id)) {
        allErrors.push(`ID de tema duplicado: "${s.id}".`);
      }
      foundIds.add(s.id);
    }
  }

  for (const requiredId of RESEARCH_TOPIC_IDS) {
    if (!foundIds.has(requiredId)) {
      allErrors.push(`Falta la ficha requerida para el tema: "${requiredId}".`);
    }
  }

  return { valid: allErrors.length === 0, errors: allErrors };
}
