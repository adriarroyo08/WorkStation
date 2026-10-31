// Matriz de evidencia científica investigada y cobertura de ejercicios (issue #49, parte de #34).
// Proporciona el patrón propuesto, desglose muscular con roles e intensidades, estado de evidencia y fuentes comprobadas.
import type { Exercise, ExerciseScience, MovementPattern, MuscleGroup, Region } from './types';
import { MOVEMENT_PATTERNS } from './types';

export interface ExerciseEvidenceItem extends ExerciseScience {
  patron: MovementPattern;
  musculos: { id: MuscleGroup | Region; rol: 'principal' | 'secundario' | 'estabilizador'; intensidad: number }[];
  evidencia: 'estimada' | 'emg' | 'hipertrofia';
}

export const EXERCISE_EVIDENCE_MATRIX: Record<string, ExerciseEvidenceItem> = {
  "press-banca": {
    "patron": "empuje-horizontal",
    "musculos": [
      {
        "id": "pecho-med",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-inf",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "pecho-sup",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "triceps-medial",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "triceps-larga",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Influence of bench angle on upper extremity muscular activation during bench press exercise",
        "autores": [
          "Jakob D. Lauver",
          "Trent E. Cayot",
          "Barry W. Scheuermann"
        ],
        "año": 2016,
        "doi": "10.1080/17461391.2015.1022605",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Press de banca plano, inclinado (30°, 45°) y declinado (-15°) con barra"
      },
      {
        "titulo": "A comparison of muscle activity and 1-RM strength of three chest-press exercises with different stability requirements",
        "autores": [
          "Atle Hole Saeterbakken",
          "Roland van den Tillaar",
          "Marius Steiro Fimland"
        ],
        "año": 2011,
        "doi": "10.1080/02640414.2010.543916",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Press de banca plano con barra libre, mancuernas y máquina Smith"
      }
    ]
  },
  "press-banca-mancuernas": {
    "patron": "empuje-horizontal",
    "musculos": [
      {
        "id": "pecho-med",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-inf",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "pecho-sup",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "triceps-lateral",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "triceps-medial",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "A comparison of muscle activity and 1-RM strength of three chest-press exercises with different stability requirements",
        "autores": [
          "Atle Hole Saeterbakken",
          "Roland van den Tillaar",
          "Marius Steiro Fimland"
        ],
        "año": 2011,
        "doi": "10.1080/02640414.2010.543916",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Press de banca plano con barra libre, mancuernas y máquina Smith"
      }
    ]
  },
  "press-inclinado": {
    "patron": "empuje-horizontal",
    "musculos": [
      {
        "id": "pecho-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-med",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "pecho-inf",
        "rol": "estabilizador",
        "intensidad": 25
      },
      {
        "id": "hombro-ant",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "triceps-medial",
        "rol": "secundario",
        "intensidad": 40
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "An electromyographical analysis of 3 different incline positions during the bench press exercise",
        "autores": [
          "Arthur A. Trebs",
          "Jason P. Brandenburg",
          "William A. Pitney"
        ],
        "año": 2010,
        "doi": "10.1519/JSC.0b013e3181ddfae7",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Press inclinado a varios ángulos (0°, 28°, 44°, 56°)"
      },
      {
        "titulo": "Influence of bench angle on upper extremity muscular activation during bench press exercise",
        "autores": [
          "Jakob D. Lauver",
          "Trent E. Cayot",
          "Barry W. Scheuermann"
        ],
        "año": 2016,
        "doi": "10.1080/17461391.2015.1022605",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Press de banca plano, inclinado (30°, 45°) y declinado (-15°) con barra"
      }
    ]
  },
  "press-inclinado-mancuernas": {
    "patron": "empuje-horizontal",
    "musculos": [
      {
        "id": "pecho-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-med",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "pecho-inf",
        "rol": "estabilizador",
        "intensidad": 20
      },
      {
        "id": "hombro-ant",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "triceps-lateral",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "triceps-medial",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "A comparison of muscle activity and 1-RM strength of three chest-press exercises with different stability requirements",
        "autores": [
          "Atle Hole Saeterbakken",
          "Roland van den Tillaar",
          "Marius Steiro Fimland"
        ],
        "año": 2011,
        "doi": "10.1080/02640414.2010.543916",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Press de banca plano con barra libre, mancuernas y máquina Smith"
      }
    ]
  },
  "press-declinado": {
    "patron": "empuje-horizontal",
    "musculos": [
      {
        "id": "pecho-inf",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-med",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "pecho-sup",
        "rol": "estabilizador",
        "intensidad": 25
      },
      {
        "id": "hombro-ant",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "triceps-medial",
        "rol": "secundario",
        "intensidad": 45
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Influence of bench angle on upper extremity muscular activation during bench press exercise",
        "autores": [
          "Jakob D. Lauver",
          "Trent E. Cayot",
          "Barry W. Scheuermann"
        ],
        "año": 2016,
        "doi": "10.1080/17461391.2015.1022605",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Press de banca plano, inclinado (30°, 45°) y declinado (-15°) con barra"
      }
    ]
  },
  "press-banca-smith": {
    "patron": "empuje-horizontal",
    "musculos": [
      {
        "id": "pecho-med",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-inf",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "pecho-sup",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "triceps-medial",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "triceps-larga",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "A comparison of muscle activity and 1-RM strength of three chest-press exercises with different stability requirements",
        "autores": [
          "Atle Hole Saeterbakken",
          "Roland van den Tillaar",
          "Marius Steiro Fimland"
        ],
        "año": 2011,
        "doi": "10.1080/02640414.2010.543916",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Press de banca plano con barra libre, mancuernas y máquina Smith"
      }
    ]
  },
  "press-pecho-maquina": {
    "patron": "empuje-horizontal",
    "musculos": [
      {
        "id": "pecho-med",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-inf",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "pecho-sup",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "triceps-medial",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "aperturas": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "pecho-med",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-inf",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "pecho-sup",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "biceps-corta",
        "rol": "estabilizador",
        "intensidad": 20
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "A Comparison of Muscle Activation between Barbell Bench Press and Dumbbell Flyes in Resistance-Trained Males",
        "autores": [
          "Tom Erik Solstad",
          "Vidar Andersen",
          "Matthew Shaw",
          "Erlend Mogstad Hoel",
          "Andreas Vonheim",
          "Atle Hole Saeterbakken"
        ],
        "año": 2020,
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7675616/",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Aperturas con mancuernas (dumbbell flyes) comparadas con press de banca"
      }
    ]
  },
  "aperturas-inclinadas": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "pecho-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-med",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "biceps-corta",
        "rol": "estabilizador",
        "intensidad": 20
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "pec-deck": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "pecho-med",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-inf",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "pecho-sup",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-ant",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "A Comparison of Muscle Activation between Barbell Bench Press and Dumbbell Flyes in Resistance-Trained Males",
        "autores": [
          "Tom Erik Solstad",
          "Vidar Andersen",
          "Matthew Shaw",
          "Erlend Mogstad Hoel",
          "Andreas Vonheim",
          "Atle Hole Saeterbakken"
        ],
        "año": 2020,
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7675616/",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Aperturas con mancuernas (dumbbell flyes) comparadas con press de banca"
      }
    ]
  },
  "cruce-poleas": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "pecho-inf",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-med",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "pecho-sup",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "hombro-ant",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "cruce-poleas-bajo": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "pecho-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-med",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "biceps-corta",
        "rol": "estabilizador",
        "intensidad": 20
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "fondos": {
    "patron": "empuje-horizontal",
    "musculos": [
      {
        "id": "pecho-inf",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-med",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "triceps-lateral",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "triceps-medial",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "triceps-larga",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 50
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Bench, Bar, and Ring Dips: Do Kinematics and Muscle Activity Differ?",
        "autores": [
          "Alec McKenzie",
          "Zachary Crowley-McHattan",
          "Rudi Meir",
          "John Whitting",
          "Wynand Volschenk"
        ],
        "año": 2022,
        "doi": "10.3390/ijerph192013211",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Fondos en paralelas (bar dip) y fondos en banco (bench dip)"
      }
    ]
  },
  "flexiones": {
    "patron": "empuje-horizontal",
    "musculos": [
      {
        "id": "pecho-med",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-inf",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "pecho-sup",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "triceps-medial",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "abd-inf",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Bench press and push-up at comparable levels of muscle activity results in similar strength gains",
        "autores": [
          "Joaquín Calatayud",
          "Sebastien Borreani",
          "Juan C. Colado",
          "Fernando Martin",
          "Víctor Tella",
          "Lars L. Andersen"
        ],
        "año": 2015,
        "doi": "10.1519/JSC.0000000000000589",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Flexiones de brazos tradicionales en suelo (push-up) con resistencia graduada"
      },
      {
        "titulo": "Kinetic analysis of several variations of push-ups",
        "autores": [
          "William P. Ebben",
          "Bradley Wurm",
          "Tyler L. VanderZanden",
          "Mark L. Spadavecchia",
          "John J. Durocher",
          "Curtis T. Bickham",
          "Erich J. Petushek"
        ],
        "año": 2011,
        "doi": "10.1519/JSC.0b013e31820c8587",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Flexiones declinadas con pies elevados sobre banco de 30 cm y 60 cm"
      }
    ]
  },
  "flexiones-declinadas": {
    "patron": "empuje-horizontal",
    "musculos": [
      {
        "id": "pecho-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-med",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "hombro-ant",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "triceps-medial",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Kinetic analysis of several variations of push-ups",
        "autores": [
          "William P. Ebben",
          "Bradley Wurm",
          "Tyler L. VanderZanden",
          "Mark L. Spadavecchia",
          "John J. Durocher",
          "Curtis T. Bickham",
          "Erich J. Petushek"
        ],
        "año": 2011,
        "doi": "10.1519/JSC.0b013e31820c8587",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Flexiones declinadas con pies elevados sobre banco de 30 cm y 60 cm"
      }
    ]
  },
  "dominadas": {
    "patron": "traccion-vertical",
    "musculos": [
      {
        "id": "dorsal-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "redondo",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "romboides",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "trap-med",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "biceps-corta",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "braquiorradial",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "hombro-post",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Surface electromyographic activation patterns and elbow joint motion during a pull-up, chin-up, or perfect-pullup™ rotational exercise",
        "autores": [
          "James W. Youdas",
          "Collier L. Amundson",
          "Kyle S. Cicero",
          "Justin J. Hahn",
          "David T. Harezlak",
          "John H. Hollman"
        ],
        "año": 2010,
        "doi": "10.1519/JSC.0b013e3181f1598c",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Dominadas con agarre pronado estándar (pull-up) y supino (chin-up)"
      }
    ]
  },
  "dominadas-lastradas": {
    "patron": "traccion-vertical",
    "musculos": [
      {
        "id": "dorsal-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "redondo",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "romboides",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "trap-med",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "biceps-corta",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "braquiorradial",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "hombro-post",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "dominadas-supinas": {
    "patron": "traccion-vertical",
    "musculos": [
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "dorsal-sup",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "redondo",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "biceps-corta",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "biceps-larga",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "romboides",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "trap-med",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "pecho-inf",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Surface electromyographic activation patterns and elbow joint motion during a pull-up, chin-up, or perfect-pullup™ rotational exercise",
        "autores": [
          "James W. Youdas",
          "Collier L. Amundson",
          "Kyle S. Cicero",
          "Justin J. Hahn",
          "David T. Harezlak",
          "John H. Hollman"
        ],
        "año": 2010,
        "doi": "10.1519/JSC.0b013e3181f1598c",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Dominadas con agarre pronado estándar (pull-up) y supino (chin-up)"
      }
    ]
  },
  "dominadas-asistidas": {
    "patron": "traccion-vertical",
    "musculos": [
      {
        "id": "dorsal-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "redondo",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "romboides",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "trap-med",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "biceps-corta",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "braquiorradial",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "hombro-post",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "jalon-pecho": {
    "patron": "traccion-vertical",
    "musculos": [
      {
        "id": "dorsal-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "redondo",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "romboides",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "trap-med",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "biceps-corta",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "hombro-post",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Effects of grip width on muscle strength and activation in the lat pull-down",
        "autores": [
          "Vidar Andersen",
          "Marius S. Fimland",
          "Espen Wiik",
          "Anders Skoglund",
          "Atle H. Saeterbakken"
        ],
        "año": 2014,
        "doi": "10.1097/JSC.0000000000000232",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Jalón en polea alta con agarre ancho, medio y cerrado (narrow grip)"
      },
      {
        "titulo": "Variations in muscle activation levels during traditional latissimus dorsi weight training exercises: An experimental study",
        "autores": [
          "Gregory J. Lehman",
          "Day Deans Buchan",
          "Angela Lundy",
          "Nicole Myers",
          "Andrea Nalborczyk"
        ],
        "año": 2004,
        "doi": "10.1186/1476-5918-3-4",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Jalón al pecho pronado y supino, y remo sentado en polea baja con agarre neutro"
      }
    ]
  },
  "jalon-cerrado": {
    "patron": "traccion-vertical",
    "musculos": [
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "dorsal-sup",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "redondo",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "biceps-corta",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "romboides",
        "rol": "secundario",
        "intensidad": 45
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Effects of grip width on muscle strength and activation in the lat pull-down",
        "autores": [
          "Vidar Andersen",
          "Marius S. Fimland",
          "Espen Wiik",
          "Anders Skoglund",
          "Atle H. Saeterbakken"
        ],
        "año": 2014,
        "doi": "10.1097/JSC.0000000000000232",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Jalón en polea alta con agarre ancho, medio y cerrado (narrow grip)"
      },
      {
        "titulo": "Variations in muscle activation levels during traditional latissimus dorsi weight training exercises: An experimental study",
        "autores": [
          "Gregory J. Lehman",
          "Day Deans Buchan",
          "Angela Lundy",
          "Nicole Myers",
          "Andrea Nalborczyk"
        ],
        "año": 2004,
        "doi": "10.1186/1476-5918-3-4",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Jalón al pecho pronado y supino, y remo sentado en polea baja con agarre neutro"
      }
    ]
  },
  "jalon-brazos-rectos": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "dorsal-sup",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "redondo",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "triceps-larga",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "pecho-inf",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "remo-barra": {
    "patron": "traccion-horizontal",
    "musculos": [
      {
        "id": "romboides",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trap-med",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "dorsal-sup",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "redondo",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "hombro-post",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "biceps-corta",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "lumbar",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "isquios",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Comparison of different rowing exercises: trunk muscle activation and lumbar spine motion, load, and stiffness",
        "autores": [
          "Chad M. J. Fenwick",
          "Stephen H. M. Brown",
          "Stuart M. McGill"
        ],
        "año": 2009,
        "doi": "10.1519/JSC.0b013e3181b07334",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Remo inclinado con barra libre, remo invertido y remo unilateral en polea"
      }
    ]
  },
  "remo-supino": {
    "patron": "traccion-horizontal",
    "musculos": [
      {
        "id": "romboides",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "trap-med",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "dorsal-sup",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "biceps-corta",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "hombro-post",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "lumbar",
        "rol": "secundario",
        "intensidad": 50
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "remo-mancuerna": {
    "patron": "traccion-horizontal",
    "musculos": [
      {
        "id": "romboides",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "dorsal-sup",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "trap-med",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "redondo",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "hombro-post",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "oblicuos",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Comparison of different rowing exercises: trunk muscle activation and lumbar spine motion, load, and stiffness",
        "autores": [
          "Chad M. J. Fenwick",
          "Stephen H. M. Brown",
          "Stuart M. McGill"
        ],
        "año": 2009,
        "doi": "10.1519/JSC.0b013e3181b07334",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Remo inclinado con barra libre, remo invertido y remo unilateral en polea"
      }
    ]
  },
  "remo-sentado": {
    "patron": "traccion-horizontal",
    "musculos": [
      {
        "id": "romboides",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trap-med",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "dorsal-sup",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "redondo",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-post",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "lumbar",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Variations in muscle activation levels during traditional latissimus dorsi weight training exercises: An experimental study",
        "autores": [
          "Gregory J. Lehman",
          "Day Deans Buchan",
          "Angela Lundy",
          "Nicole Myers",
          "Andrea Nalborczyk"
        ],
        "año": 2004,
        "doi": "10.1186/1476-5918-3-4",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Jalón al pecho pronado y supino, y remo sentado en polea baja con agarre neutro"
      }
    ]
  },
  "remo-t": {
    "patron": "traccion-horizontal",
    "musculos": [
      {
        "id": "romboides",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trap-med",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "dorsal-sup",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "hombro-post",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "lumbar",
        "rol": "secundario",
        "intensidad": 45
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "remo-invertido": {
    "patron": "traccion-horizontal",
    "musculos": [
      {
        "id": "romboides",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trap-med",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "dorsal-sup",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "dorsal-inf",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "hombro-post",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "biceps-corta",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "gluteo-mayor",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Comparison of different rowing exercises: trunk muscle activation and lumbar spine motion, load, and stiffness",
        "autores": [
          "Chad M. J. Fenwick",
          "Stephen H. M. Brown",
          "Stuart M. McGill"
        ],
        "año": 2009,
        "doi": "10.1519/JSC.0b013e3181b07334",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Remo inclinado con barra libre, remo invertido y remo unilateral en polea"
      }
    ]
  },
  "pullover": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-med",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "pecho-inf",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "redondo",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "triceps-larga",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "pecho-sup",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Effects of the pullover exercise on the pectoralis major and latissimus dorsi muscles as evaluated by EMG",
        "autores": [
          "Paulo H. Marchetti",
          "Marco C. Uchida"
        ],
        "año": 2011,
        "doi": "10.1123/jab.27.4.380",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Pullover con barra libre y mancuerna sobre banco horizontal"
      }
    ]
  },
  "peso-muerto": {
    "patron": "bisagra",
    "musculos": [
      {
        "id": "lumbar",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "isquios",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "trapecio",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "vasto-lateral",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "vasto-medial",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "recto-femoral",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "trap-med",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "dorsal-inf",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "flexores",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "oblicuos",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "abd-inf",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Electromyographic Comparison of Barbell Deadlift, Hex Bar Deadlift, and Hip Thrust Exercises: A Cross-Over Study",
        "autores": [
          "Vidar Andersen",
          "Marius S. Fimland",
          "Dag-André Mo",
          "Vegard M. Iversen",
          "Torbjørn Vederhus",
          "Lars R. Rockland Hellebø",
          "Kristine I. Nordaune",
          "Atle H. Saeterbakken"
        ],
        "año": 2018,
        "doi": "10.1519/JSC.0000000000001826",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Peso muerto con barra convencional, peso muerto con barra hexagonal (hex bar) e hip thrust"
      },
      {
        "titulo": "An electromyographic analysis of sumo and conventional style deadlifts",
        "autores": [
          "Rafael F. Escamilla",
          "Anthony C. Francisco",
          "Andrew V. Kayes",
          "Kevin P. Speer",
          "Claude T. Moorman"
        ],
        "año": 2002,
        "doi": "10.1097/00005768-200204000-00019",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Peso muerto convencional vs peso muerto sumo con barra"
      }
    ]
  },
  "peso-muerto-sumo": {
    "patron": "bisagra",
    "musculos": [
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "aductores",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "vasto-lateral",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "isquios",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "lumbar",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "trapecio",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "gluteo-medio",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "flexores",
        "rol": "secundario",
        "intensidad": 55
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "An electromyographic analysis of sumo and conventional style deadlifts",
        "autores": [
          "Rafael F. Escamilla",
          "Anthony C. Francisco",
          "Andrew V. Kayes",
          "Kevin P. Speer",
          "Claude T. Moorman"
        ],
        "año": 2002,
        "doi": "10.1097/00005768-200204000-00019",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Peso muerto convencional vs peso muerto sumo con barra"
      }
    ]
  },
  "peso-muerto-hexagonal": {
    "patron": "bisagra",
    "musculos": [
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "lumbar",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "trapecio",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "flexores",
        "rol": "secundario",
        "intensidad": 60
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Electromyographic Comparison of Barbell Deadlift, Hex Bar Deadlift, and Hip Thrust Exercises: A Cross-Over Study",
        "autores": [
          "Vidar Andersen",
          "Marius S. Fimland",
          "Dag-André Mo",
          "Vegard M. Iversen",
          "Torbjørn Vederhus",
          "Lars R. Rockland Hellebø",
          "Kristine I. Nordaune",
          "Atle H. Saeterbakken"
        ],
        "año": 2018,
        "doi": "10.1519/JSC.0000000000001826",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Peso muerto con barra convencional, peso muerto con barra hexagonal (hex bar) e hip thrust"
      }
    ]
  },
  "hiperextensiones": {
    "patron": "bisagra",
    "musculos": [
      {
        "id": "lumbar",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 65
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Biomechanical Comparison of the Reverse Hyperextension Machine and the Hyperextension Exercise",
        "autores": [
          "Michael A. Lawrence",
          "Ashley Chin",
          "Brian T. Swanson"
        ],
        "año": 2019,
        "doi": "10.1519/JSC.0000000000003146",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Hiperextensión de tronco en banco inclinado a 45°"
      }
    ]
  },
  "buenos-dias": {
    "patron": "bisagra",
    "musculos": [
      {
        "id": "isquios",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "lumbar",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Effects of load on good morning kinematics and EMG activity",
        "autores": [
          "Andrew David Vigotsky",
          "Erin Nicole Harper",
          "David Russell Ryan",
          "Bret Contreras"
        ],
        "año": 2015,
        "doi": "10.7717/peerj.708",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Buenos días (good morning) con barra a diferentes porcentajes de carga"
      }
    ]
  },
  "encogimientos": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "trapecio",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trap-med",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "flexores",
        "rol": "secundario",
        "intensidad": 45
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Modifying a shrug exercise can facilitate the upward rotator muscles of the scapula",
        "autores": [
          "Tania Pizzari",
          "Joy Wickham",
          "Simon Balster",
          "Charlotte Ganderton",
          "Lyn Watson"
        ],
        "año": 2014,
        "doi": "10.1016/j.clinbiomech.2013.11.011",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Encogimientos de hombros con barra y mancuernas en bipedestación estándar y modificada"
      }
    ]
  },
  "encogimientos-mancuernas": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "trapecio",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trap-med",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "flexores",
        "rol": "secundario",
        "intensidad": 50
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Modifying a shrug exercise can facilitate the upward rotator muscles of the scapula",
        "autores": [
          "Tania Pizzari",
          "Joy Wickham",
          "Simon Balster",
          "Charlotte Ganderton",
          "Lyn Watson"
        ],
        "año": 2014,
        "doi": "10.1016/j.clinbiomech.2013.11.011",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Encogimientos de hombros con barra y mancuernas en bipedestación estándar y modificada"
      }
    ]
  },
  "press-militar": {
    "patron": "empuje-vertical",
    "musculos": [
      {
        "id": "hombro-ant",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "hombro-lat",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "pecho-sup",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "triceps-medial",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "triceps-larga",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "trapecio",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "oblicuos",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "lumbar",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Effects of body position and loading modality on muscle activity and strength in shoulder presses",
        "autores": [
          "Atle Hole Saeterbakken",
          "Marius Steiro Fimland"
        ],
        "año": 2013,
        "doi": "10.1519/JSC.0b013e318276b873",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Press de hombros de pie y sentado, con barra libre y con mancuernas"
      }
    ]
  },
  "press-militar-sentado": {
    "patron": "empuje-vertical",
    "musculos": [
      {
        "id": "hombro-ant",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "hombro-lat",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "pecho-sup",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "triceps-medial",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "trapecio",
        "rol": "secundario",
        "intensidad": 40
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Effects of body position and loading modality on muscle activity and strength in shoulder presses",
        "autores": [
          "Atle Hole Saeterbakken",
          "Marius Steiro Fimland"
        ],
        "año": 2013,
        "doi": "10.1519/JSC.0b013e318276b873",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Press de hombros de pie y sentado, con barra libre y con mancuernas"
      }
    ]
  },
  "press-hombro-mancuernas": {
    "patron": "empuje-vertical",
    "musculos": [
      {
        "id": "hombro-ant",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "hombro-lat",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "pecho-sup",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "triceps-medial",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "trapecio",
        "rol": "secundario",
        "intensidad": 40
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Effects of body position and loading modality on muscle activity and strength in shoulder presses",
        "autores": [
          "Atle Hole Saeterbakken",
          "Marius Steiro Fimland"
        ],
        "año": 2013,
        "doi": "10.1519/JSC.0b013e318276b873",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Press de hombros de pie y sentado, con barra libre y con mancuernas"
      }
    ]
  },
  "press-arnold": {
    "patron": "empuje-vertical",
    "musculos": [
      {
        "id": "hombro-ant",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "hombro-lat",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "pecho-sup",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "triceps-medial",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "trapecio",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "press-hombro-maquina": {
    "patron": "empuje-vertical",
    "musculos": [
      {
        "id": "hombro-ant",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "hombro-lat",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "pecho-sup",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "triceps-medial",
        "rol": "secundario",
        "intensidad": 45
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "elevaciones-laterales": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "hombro-lat",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trapecio",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "hombro-post",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "An Electromyographic Analysis of Lateral Raise Variations and Frontal Raise in Competitive Bodybuilders",
        "autores": [
          "Giuseppe Coratella",
          "Gianpaolo Tornatore",
          "Stefano Longo",
          "Fabio Esposito",
          "Emiliano Cè"
        ],
        "año": 2020,
        "doi": "10.3390/ijerph17176015",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Elevaciones laterales y frontales con mancuernas a diferentes rotaciones del hombro"
      }
    ]
  },
  "elevaciones-laterales-polea": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "hombro-lat",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trapecio",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "hombro-ant",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "hombro-post",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "elevaciones-frontales": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "hombro-ant",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-sup",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "hombro-lat",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "trapecio",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "An Electromyographic Analysis of Lateral Raise Variations and Frontal Raise in Competitive Bodybuilders",
        "autores": [
          "Giuseppe Coratella",
          "Gianpaolo Tornatore",
          "Stefano Longo",
          "Fabio Esposito",
          "Emiliano Cè"
        ],
        "año": 2020,
        "doi": "10.3390/ijerph17176015",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Elevaciones laterales y frontales con mancuernas a diferentes rotaciones del hombro"
      }
    ]
  },
  "pajaros": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "hombro-post",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trap-med",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "romboides",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "hombro-lat",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "redondo",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Effect of Hand Position on EMG Activity of the Posterior Shoulder Musculature During a Horizontal Abduction Exercise",
        "autores": [
          "Brad J. Schoenfeld",
          "Raziye Gul Tiryaki-Sonmez",
          "Morey J. Kolber",
          "Bret Contreras",
          "Robert Harris",
          "Serife Ozen"
        ],
        "año": 2013,
        "doi": "10.1519/JSC.0b013e318281e1e9",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Pájaros con mancuernas y máquina de deltoides posterior (reverse fly)"
      }
    ]
  },
  "pajaros-maquina": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "hombro-post",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trap-med",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "romboides",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "hombro-lat",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "redondo",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Effect of Hand Position on EMG Activity of the Posterior Shoulder Musculature During a Horizontal Abduction Exercise",
        "autores": [
          "Brad J. Schoenfeld",
          "Raziye Gul Tiryaki-Sonmez",
          "Morey J. Kolber",
          "Bret Contreras",
          "Robert Harris",
          "Serife Ozen"
        ],
        "año": 2013,
        "doi": "10.1519/JSC.0b013e318281e1e9",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Pájaros con mancuernas y máquina de deltoides posterior (reverse fly)"
      }
    ]
  },
  "face-pull": {
    "patron": "traccion-horizontal",
    "musculos": [
      {
        "id": "hombro-post",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trap-med",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "romboides",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "trapecio",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "hombro-lat",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "redondo",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "biceps-larga",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "remo-al-menton": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "hombro-lat",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trapecio",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "biceps-larga",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "braquial",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "braquiorradial",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Effect of Grip Width on Electromyographic Activity During the Upright Row",
        "autores": [
          "Matthew J. McAllister",
          "Brian K. Schilling",
          "Kelley G. Hammond",
          "Lawrence W. Weiss",
          "Tyler M. Farney"
        ],
        "año": 2013,
        "doi": "10.1519/JSC.0b013e31824f23ad",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Remo al mentón con barra a diversas anchuras de agarre"
      }
    ]
  },
  "curl-barra": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "biceps-corta",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "biceps-larga",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "braquiorradial",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "flexores",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "hombro-ant",
        "rol": "estabilizador",
        "intensidad": 20
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Differences in electromyographic activity of biceps brachii and brachioradialis while performing three variants of curl",
        "autores": [
          "Giuseppe Marcolin",
          "Paolo Petrone",
          "Nicola Malta",
          "Dario Albarello",
          "Antonio Paoli"
        ],
        "año": 2018,
        "doi": "10.7717/peerj.5165",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Curl de bíceps con barra recta, con barra EZ y con mancuernas"
      }
    ]
  },
  "curl-z": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "biceps-corta",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "biceps-larga",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "braquial",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "braquiorradial",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "flexores",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Differences in electromyographic activity of biceps brachii and brachioradialis while performing three variants of curl",
        "autores": [
          "Giuseppe Marcolin",
          "Paolo Petrone",
          "Nicola Malta",
          "Dario Albarello",
          "Antonio Paoli"
        ],
        "año": 2018,
        "doi": "10.7717/peerj.5165",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Curl de bíceps con barra recta, con barra EZ y con mancuernas"
      }
    ]
  },
  "curl-mancuernas": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "biceps-corta",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "biceps-larga",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "braquiorradial",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "flexores",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Differences in electromyographic activity of biceps brachii and brachioradialis while performing three variants of curl",
        "autores": [
          "Giuseppe Marcolin",
          "Paolo Petrone",
          "Nicola Malta",
          "Dario Albarello",
          "Antonio Paoli"
        ],
        "año": 2018,
        "doi": "10.7717/peerj.5165",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Curl de bíceps con barra recta, con barra EZ y con mancuernas"
      },
      {
        "titulo": "Effect of the shoulder position on the biceps brachii EMG in different dumbbell curls",
        "autores": [
          "Liliam F. Oliveira",
          "Thiago T. Matta",
          "Daniel S. Alves",
          "Marco A. C. Garcia",
          "Taian M. M. Vieira"
        ],
        "año": 2009,
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3737788/",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Curl de bíceps con mancuernas en banco inclinado (IDC) y banco predicador (DPC)"
      }
    ]
  },
  "curl-inclinado": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "biceps-larga",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "biceps-corta",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "braquiorradial",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Effect of the shoulder position on the biceps brachii EMG in different dumbbell curls",
        "autores": [
          "Liliam F. Oliveira",
          "Thiago T. Matta",
          "Daniel S. Alves",
          "Marco A. C. Garcia",
          "Taian M. M. Vieira"
        ],
        "año": 2009,
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3737788/",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Curl de bíceps con mancuernas en banco inclinado (IDC) y banco predicador (DPC)"
      }
    ]
  },
  "curl-martillo": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "braquial",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "braquiorradial",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "biceps-larga",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "biceps-corta",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "extensores",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "flexores",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "curl-martillo-polea": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "braquial",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "braquiorradial",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "biceps-larga",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "biceps-corta",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "extensores",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "flexores",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "curl-predicador": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "biceps-corta",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "braquial",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "braquiorradial",
        "rol": "secundario",
        "intensidad": 40
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Effect of the shoulder position on the biceps brachii EMG in different dumbbell curls",
        "autores": [
          "Liliam F. Oliveira",
          "Thiago T. Matta",
          "Daniel S. Alves",
          "Marco A. C. Garcia",
          "Taian M. M. Vieira"
        ],
        "año": 2009,
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3737788/",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Curl de bíceps con mancuernas en banco inclinado (IDC) y banco predicador (DPC)"
      }
    ]
  },
  "curl-concentrado": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "biceps-corta",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "biceps-larga",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "braquiorradial",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "curl-spider": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "biceps-corta",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "biceps-larga",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 65
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "curl-polea": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "biceps-corta",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "biceps-larga",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "braquiorradial",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "extension-triceps-polea": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "triceps-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "triceps-medial",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "triceps-larga",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "extensores",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "hipertrofia",
    "fuentes": [
      {
        "titulo": "Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position",
        "autores": [
          "Sumiaki Maeo",
          "Yuhang Wu",
          "Meng Huang",
          "Hikaru Sakurai",
          "Yuki Kusagawa",
          "Takashi Sugiyama",
          "Hiroaki Kanehisa",
          "Tadao Isaka"
        ],
        "año": 2023,
        "doi": "10.1080/17461391.2022.2100279",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Extensión de tríceps en polea (pushdown neutral) vs extensión sobre la cabeza (overhead extension), resonancia magnética"
      }
    ]
  },
  "extension-triceps-cuerda": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "triceps-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "triceps-medial",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "triceps-larga",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "extensores",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "extension-triceps-cuerda-cabeza": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "triceps-larga",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "triceps-medial",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 20
      }
    ],
    "evidencia": "hipertrofia",
    "fuentes": [
      {
        "titulo": "Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position",
        "autores": [
          "Sumiaki Maeo",
          "Yuhang Wu",
          "Meng Huang",
          "Hikaru Sakurai",
          "Yuki Kusagawa",
          "Takashi Sugiyama",
          "Hiroaki Kanehisa",
          "Tadao Isaka"
        ],
        "año": 2023,
        "doi": "10.1080/17461391.2022.2100279",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Extensión de tríceps en polea (pushdown neutral) vs extensión sobre la cabeza (overhead extension), resonancia magnética"
      }
    ]
  },
  "press-frances": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "triceps-larga",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "triceps-medial",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "triceps-lateral",
        "rol": "principal",
        "intensidad": 75
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "extension-triceps-cabeza": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "triceps-larga",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "triceps-medial",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 60
      }
    ],
    "evidencia": "hipertrofia",
    "fuentes": [
      {
        "titulo": "Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position",
        "autores": [
          "Sumiaki Maeo",
          "Yuhang Wu",
          "Meng Huang",
          "Hikaru Sakurai",
          "Yuki Kusagawa",
          "Takashi Sugiyama",
          "Hiroaki Kanehisa",
          "Tadao Isaka"
        ],
        "año": 2023,
        "doi": "10.1080/17461391.2022.2100279",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Extensión de tríceps en polea (pushdown neutral) vs extensión sobre la cabeza (overhead extension), resonancia magnética"
      }
    ]
  },
  "press-cerrado": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "triceps-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "triceps-medial",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "triceps-larga",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "pecho-med",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "pecho-inf",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "pecho-sup",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 50
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "The influence of grip width and forearm pronation/supination on upper-body myoelectric activity during the flat bench press",
        "autores": [
          "Gregory J. Lehman"
        ],
        "año": 2005,
        "doi": "10.1519/R-15024.1",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Press de banca con agarre estrecho (close-grip bench press) vs ancho"
      }
    ]
  },
  "fondos-triceps": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "triceps-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "triceps-medial",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "triceps-larga",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "pecho-inf",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "pecho-med",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Bench, Bar, and Ring Dips: Do Kinematics and Muscle Activity Differ?",
        "autores": [
          "Alec McKenzie",
          "Zachary Crowley-McHattan",
          "Rudi Meir",
          "John Whitting",
          "Wynand Volschenk"
        ],
        "año": 2022,
        "doi": "10.3390/ijerph192013211",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Fondos en paralelas (bar dip) y fondos en banco (bench dip)"
      }
    ]
  },
  "fondos-banco": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "triceps-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "triceps-medial",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "triceps-larga",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "pecho-inf",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "curl-muneca": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "flexores",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "braquiorradial",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "curl-inverso": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "braquiorradial",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "extensores",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "braquial",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "biceps-corta",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "paseo-granjero": {
    "patron": "acarreo",
    "musculos": [
      {
        "id": "flexores",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trapecio",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "extensores",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "oblicuos",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "lumbar",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "abd-sup",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "abd-inf",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "gluteo-medio",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "gastrocnemio",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "soleo",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "vasto-lateral",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "A Biomechanical Analysis of the Farmers Walk, and Comparison with the Deadlift and Unloaded Walk",
        "autores": [
          "Paul W. Winwood",
          "John B. Cronin",
          "Scott R. Brown",
          "Justin W. L. Keogh"
        ],
        "año": 2014,
        "doi": "10.1260/1747-9541.9.5.1127",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Paseo del granjero (farmers walk) con carga máxima y submáxima"
      }
    ]
  },
  "sentadilla": {
    "patron": "sentadilla",
    "musculos": [
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "recto-femoral",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "aductores",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "lumbar",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "abd-inf",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "gastrocnemio",
        "rol": "estabilizador",
        "intensidad": 25
      },
      {
        "id": "soleo",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "hipertrofia",
    "fuentes": [
      {
        "titulo": "Effects of squat training with different depths on lower limb muscle volumes",
        "autores": [
          "Keitaro Kubo",
          "Toshihiro Ikebukuro",
          "Hideaki Yata"
        ],
        "año": 2019,
        "doi": "10.1007/s00421-019-04181-y",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Sentadilla trasera con barra completa (full squat) vs media sentadilla, resonancia magnética"
      },
      {
        "titulo": "A Comparison of Gluteus Maximus, Biceps Femoris, and Vastus Lateralis Electromyographic Activity in the Back Squat and Barbell Hip Thrust Exercises",
        "autores": [
          "Bret Contreras",
          "Andrew D. Vigotsky",
          "Brad J. Schoenfeld",
          "Chris Beardsley",
          "John Cronin"
        ],
        "año": 2015,
        "doi": "10.1123/jab.2014-0301",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Hip thrust con barra libre en banco y sentadilla trasera con barra a 10RM"
      }
    ]
  },
  "sentadilla-frontal": {
    "patron": "sentadilla",
    "musculos": [
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "recto-femoral",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "gluteo-mayor",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "aductores",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "abd-sup",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "abd-inf",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "lumbar",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "trap-med",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "isquios",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "A Biomechanical Comparison of Back and Front Squats in Healthy Trained Individuals",
        "autores": [
          "Jonathan C. Gullett",
          "Mark D. Tillman",
          "Gregory M. Gutierrez",
          "John W. Chow"
        ],
        "año": 2009,
        "doi": "10.1519/JSC.0b013e31818546bb",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Sentadilla frontal vs sentadilla trasera con barra"
      }
    ]
  },
  "sentadilla-goblet": {
    "patron": "sentadilla",
    "musculos": [
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "recto-femoral",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "aductores",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "abd-sup",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "abd-inf",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "flexores",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "sentadilla-smith": {
    "patron": "sentadilla",
    "musculos": [
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "aductores",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "isquios",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "sentadilla-hack": {
    "patron": "sentadilla",
    "musculos": [
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "gluteo-mayor",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "aductores",
        "rol": "secundario",
        "intensidad": 45
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "sentadilla-peso-corporal": {
    "patron": "sentadilla",
    "musculos": [
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "aductores",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "prensa": {
    "patron": "sentadilla",
    "musculos": [
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "aductores",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "isquios",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "gastrocnemio",
        "rol": "estabilizador",
        "intensidad": 20
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Effects of technique variations on knee biomechanics during the squat and leg press",
        "autores": [
          "Rafael F. Escamilla",
          "Glenn S. Fleisig",
          "Naiquan Zheng",
          "Jeffrey E. Lander",
          "Steven W. Barrentine",
          "James R. Andrews",
          "Brian W. Bergemann",
          "Claude S. Kitchens"
        ],
        "año": 2001,
        "doi": "10.1097/00005768-200109000-00020",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Prensa de piernas inclinada a 45° con variaciones de pies y sentadilla"
      }
    ]
  },
  "extension-cuadriceps": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "recto-femoral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 90
      }
    ],
    "evidencia": "hipertrofia",
    "fuentes": [
      {
        "titulo": "Inhomogeneous architectural changes of the quadriceps femoris induced by resistance training",
        "autores": [
          "Ryoichi Ema",
          "Taku Wakahara",
          "Naokazu Miyamoto",
          "Hiroaki Kanehisa",
          "Yasuo Kawakami"
        ],
        "año": 2013,
        "doi": "10.1007/s00421-013-2700-1",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Extensión de cuádriceps en máquina (leg extension) con medición ecográfica/MRI de hipertrofia por porciones"
      }
    ]
  },
  "zancadas": {
    "patron": "zancada",
    "musculos": [
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "gluteo-medio",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "aductores",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "gastrocnemio",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Gluteus Maximus Activation during Common Strength and Hypertrophy Exercises: A Systematic Review",
        "autores": [
          "Walter Krause Neto",
          "Enrico Gori Soares",
          "Thais Lima Vieira",
          "Rodolfo Aguiar",
          "Thiago Andrade Chola",
          "Vinicius de Lima Sampaio",
          "Eliane Florencio Gama"
        ],
        "año": 2020,
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7039033/",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Zancadas (lunges), step-ups y variaciones de zancada en electromiografía normalizada"
      }
    ]
  },
  "zancadas-caminando": {
    "patron": "zancada",
    "musculos": [
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "gluteo-medio",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "aductores",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "gastrocnemio",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "bulgara": {
    "patron": "zancada",
    "musculos": [
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "gluteo-medio",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "aductores",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "isquios",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "gastrocnemio",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Comparison of lower extremity EMG between the 2-leg squat and modified single-leg squat in female athletes",
        "autores": [
          "Kevin McCurdy",
          "George A. O'Kelley",
          "Mike Kutz",
          "Glen Langford",
          "Ernest J. Ernest",
          "Marcos Torres"
        ],
        "año": 2010,
        "doi": "10.1123/jsr.19.1.57",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Sentadilla búlgara (modified single-leg squat con pie trasero elevado) con mancuernas"
      }
    ]
  },
  "peso-muerto-rumano": {
    "patron": "bisagra",
    "musculos": [
      {
        "id": "isquios",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "lumbar",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "flexores",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "aductores",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "trapecio",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "dorsal-inf",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Muscle activation during various hamstring exercises",
        "autores": [
          "Matthew J. McAllister",
          "Kelley G. Hammond",
          "Brian K. Schilling",
          "Arny A. Ferrando",
          "Dan G. Flint"
        ],
        "año": 2014,
        "doi": "10.1519/JSC.0000000000000302",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Peso muerto rumano con barra (RDL) vs curl femoral"
      }
    ]
  },
  "peso-muerto-piernas-rigidas": {
    "patron": "bisagra",
    "musculos": [
      {
        "id": "isquios",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "lumbar",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "flexores",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "aductores",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "gastrocnemio",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "curl-femoral": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "isquios",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gastrocnemio",
        "rol": "secundario",
        "intensidad": 50
      }
    ],
    "evidencia": "hipertrofia",
    "fuentes": [
      {
        "titulo": "Greater Hamstrings Muscle Hypertrophy but Similar Damage Protection after Training at Long versus Short Muscle Lengths",
        "autores": [
          "Sumiaki Maeo",
          "Hao Meng",
          "Yuhang Wu",
          "Hikaru Sakurai",
          "Yuki Kusagawa",
          "Takashi Sugiyama",
          "Hiroaki Kanehisa",
          "Tadao Isaka"
        ],
        "año": 2021,
        "doi": "10.1249/MSS.0000000000002523",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Curl femoral sentado vs curl femoral tumbado en máquina, hipertrofia por resonancia magnética"
      }
    ]
  },
  "curl-femoral-sentado": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "isquios",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gastrocnemio",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "hipertrofia",
    "fuentes": [
      {
        "titulo": "Greater Hamstrings Muscle Hypertrophy but Similar Damage Protection after Training at Long versus Short Muscle Lengths",
        "autores": [
          "Sumiaki Maeo",
          "Hao Meng",
          "Yuhang Wu",
          "Hikaru Sakurai",
          "Yuki Kusagawa",
          "Takashi Sugiyama",
          "Hiroaki Kanehisa",
          "Tadao Isaka"
        ],
        "año": 2021,
        "doi": "10.1249/MSS.0000000000002523",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Curl femoral sentado vs curl femoral tumbado en máquina, hipertrofia por resonancia magnética"
      }
    ]
  },
  "hip-thrust": {
    "patron": "bisagra",
    "musculos": [
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gluteo-medio",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "vasto-lateral",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "vasto-medial",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "aductores",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "lumbar",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "A Comparison of Gluteus Maximus, Biceps Femoris, and Vastus Lateralis Electromyographic Activity in the Back Squat and Barbell Hip Thrust Exercises",
        "autores": [
          "Bret Contreras",
          "Andrew D. Vigotsky",
          "Brad J. Schoenfeld",
          "Chris Beardsley",
          "John Cronin"
        ],
        "año": 2015,
        "doi": "10.1123/jab.2014-0301",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Hip thrust con barra libre en banco y sentadilla trasera con barra a 10RM"
      },
      {
        "titulo": "Electromyographic Comparison of Barbell Deadlift, Hex Bar Deadlift, and Hip Thrust Exercises: A Cross-Over Study",
        "autores": [
          "Vidar Andersen",
          "Marius S. Fimland",
          "Dag-André Mo",
          "Vegard M. Iversen",
          "Torbjørn Vederhus",
          "Lars R. Rockland Hellebø",
          "Kristine I. Nordaune",
          "Atle H. Saeterbakken"
        ],
        "año": 2018,
        "doi": "10.1519/JSC.0000000000001826",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Peso muerto con barra convencional, peso muerto con barra hexagonal (hex bar) e hip thrust"
      }
    ]
  },
  "puente-gluteo": {
    "patron": "bisagra",
    "musculos": [
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "gluteo-medio",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "lumbar",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Electromyographic analysis of core trunk, hip, and thigh muscles during 9 rehabilitation exercises",
        "autores": [
          "Reid A. Ekstrom",
          "Robert A. Donatelli",
          "Kenji C. Carp"
        ],
        "año": 2007,
        "doi": "10.2519/jospt.2007.2471",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Puente de glúteos (glute bridge), plancha prona (prone bridge) y plancha lateral (side bridge)"
      }
    ]
  },
  "patada-gluteo": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gluteo-medio",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "lumbar",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "abductores": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "abductores",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gluteo-medio",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "gluteo-mayor",
        "rol": "secundario",
        "intensidad": 50
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Electromyographic analysis of gluteus medius and gluteus maximus during rehabilitation exercises",
        "autores": [
          "Kristen Boren",
          "Cara Conrey",
          "Jennifer Le Coguic",
          "Lindsey Paprocki",
          "Michael Voight",
          "T. Kevin Robinson"
        ],
        "año": 2011,
        "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC3201064/",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Abducción de cadera en máquina y decúbito lateral para glúteo medio y tensor de fascia lata"
      }
    ]
  },
  "aductores": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "aductores",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-medial",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "EMG evaluation of hip adduction exercises for soccer players: implications for exercise selection in prevention and treatment of groin injuries",
        "autores": [
          "Andreas Serner",
          "Markus Due Jakobsen",
          "Lars Louis Andersen",
          "Per Hölmich",
          "Emil Sundstrup",
          "Kristian Thorborg"
        ],
        "año": 2014,
        "doi": "10.1136/bjsports-2012-091746",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Aducción de cadera en máquina (hip adduction machine) y decúbito"
      }
    ]
  },
  "gemelos-pie": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "gastrocnemio",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "soleo",
        "rol": "principal",
        "intensidad": 70
      }
    ],
    "evidencia": "hipertrofia",
    "fuentes": [
      {
        "titulo": "Triceps surae muscle hypertrophy is greater after standing versus seated calf-raise training",
        "autores": [
          "Momoka Kinoshita",
          "Sumiaki Maeo",
          "Yosuke Kobayashi",
          "Takashi Sugiyama",
          "Hiroaki Kanehisa",
          "Tadao Isaka"
        ],
        "año": 2023,
        "doi": "10.3389/fphys.2023.1272106",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Elevación de talones de pie vs sentado en máquina, hipertrofia por resonancia magnética"
      }
    ]
  },
  "gemelos-sentado": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "soleo",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gastrocnemio",
        "rol": "secundario",
        "intensidad": 45
      }
    ],
    "evidencia": "hipertrofia",
    "fuentes": [
      {
        "titulo": "Triceps surae muscle hypertrophy is greater after standing versus seated calf-raise training",
        "autores": [
          "Momoka Kinoshita",
          "Sumiaki Maeo",
          "Yosuke Kobayashi",
          "Takashi Sugiyama",
          "Hiroaki Kanehisa",
          "Tadao Isaka"
        ],
        "año": 2023,
        "doi": "10.3389/fphys.2023.1272106",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Elevación de talones de pie vs sentado en máquina, hipertrofia por resonancia magnética"
      }
    ]
  },
  "gemelos-prensa": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "gastrocnemio",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "soleo",
        "rol": "secundario",
        "intensidad": 65
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "plancha": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "abd-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "abd-inf",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "oblicuos",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "gluteo-mayor",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "recto-femoral",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "pecho-med",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Electromyographic analysis of core trunk, hip, and thigh muscles during 9 rehabilitation exercises",
        "autores": [
          "Reid A. Ekstrom",
          "Robert A. Donatelli",
          "Kenji C. Carp"
        ],
        "año": 2007,
        "doi": "10.2519/jospt.2007.2471",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Puente de glúteos (glute bridge), plancha prona (prone bridge) y plancha lateral (side bridge)"
      }
    ]
  },
  "plancha-lateral": {
    "patron": "antirrotacion",
    "musculos": [
      {
        "id": "oblicuos",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gluteo-medio",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "abd-sup",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "abd-inf",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "lumbar",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "hombro-lat",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "abductores",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "aductores",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Electromyographic analysis of core trunk, hip, and thigh muscles during 9 rehabilitation exercises",
        "autores": [
          "Reid A. Ekstrom",
          "Robert A. Donatelli",
          "Kenji C. Carp"
        ],
        "año": 2007,
        "doi": "10.2519/jospt.2007.2471",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Puente de glúteos (glute bridge), plancha prona (prone bridge) y plancha lateral (side bridge)"
      }
    ]
  },
  "crunch": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "abd-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "abd-inf",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "oblicuos",
        "rol": "secundario",
        "intensidad": 50
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Electromyographic analysis of traditional and nontraditional abdominal exercises: implications for rehabilitation and training",
        "autores": [
          "Rafael F. Escamilla",
          "Eric Babb",
          "Ryan DeWitt",
          "Patrick Ferrara",
          "Michael R. Torry",
          "Claude T. Moorman"
        ],
        "año": 2006,
        "doi": "10.1093/ptj/86.5.656",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Crunch abdominal tradicional en suelo y elevación de piernas colgado (hanging leg raise)"
      }
    ]
  },
  "elevacion-piernas": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "abd-inf",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "abd-sup",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "recto-femoral",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "oblicuos",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "flexores",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "dorsal-sup",
        "rol": "secundario",
        "intensidad": 40
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Electromyographic analysis of traditional and nontraditional abdominal exercises: implications for rehabilitation and training",
        "autores": [
          "Rafael F. Escamilla",
          "Eric Babb",
          "Ryan DeWitt",
          "Patrick Ferrara",
          "Michael R. Torry",
          "Claude T. Moorman"
        ],
        "año": 2006,
        "doi": "10.1093/ptj/86.5.656",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Crunch abdominal tradicional en suelo y elevación de piernas colgado (hanging leg raise)"
      }
    ]
  },
  "rueda-abdominal": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "abd-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "abd-inf",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "oblicuos",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "dorsal-inf",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "triceps-larga",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "lumbar",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Core muscle activation during Swiss ball and traditional abdominal exercises",
        "autores": [
          "Rafael F. Escamilla",
          "Craig Lewis",
          "Dana Bell",
          "Gretchen Bramblet",
          "Jason Daffron",
          "Steve Lambert",
          "Amanda Pecson",
          "Rodney Imamura",
          "Lonnie Paulos",
          "James R. Andrews"
        ],
        "año": 2010,
        "doi": "10.2519/jospt.2010.3073",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Rueda abdominal / despliegue en balón suizo (roll-out) vs crunch tradicional"
      }
    ]
  },
  "crunch-polea": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "abd-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "abd-inf",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "oblicuos",
        "rol": "secundario",
        "intensidad": 55
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "crunch-maquina": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "abd-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "abd-inf",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "oblicuos",
        "rol": "secundario",
        "intensidad": 50
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "giros-rusos": {
    "patron": "rotacion",
    "musculos": [
      {
        "id": "oblicuos",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "abd-sup",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "abd-inf",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "recto-femoral",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "dead-bug": {
    "patron": "antirrotacion",
    "musculos": [
      {
        "id": "abd-inf",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "abd-sup",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "oblicuos",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "recto-femoral",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Electromyographic activity of selected trunk muscles during dynamic spine stabilization exercises",
        "autores": [
          "Lori K. Davidson",
          "Cheryl L. Hubley-Kozey"
        ],
        "año": 2001,
        "doi": "10.1053/apmr.2001.26082",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Dead bug (dying bug) dinámico en suelo para flexores y estabilizadores profundos del tronco"
      }
    ]
  },
  "escaladores": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "abd-inf",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "abd-sup",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "oblicuos",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "cardio",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "pecho-med",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "correr": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "cardio",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gastrocnemio",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "soleo",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "isquios",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "recto-femoral",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "vasto-lateral",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "vasto-medial",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "abd-inf",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "caminar-cinta": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "cardio",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gastrocnemio",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "soleo",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "gluteo-mayor",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "vasto-lateral",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "bici": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "cardio",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "recto-femoral",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "gluteo-mayor",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "gastrocnemio",
        "rol": "secundario",
        "intensidad": 40
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "eliptica": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "cardio",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-lateral",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "vasto-medial",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "gluteo-mayor",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "dorsal-inf",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "escaladora": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "cardio",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "gastrocnemio",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "soleo",
        "rol": "secundario",
        "intensidad": 45
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "remo-ergometro": {
    "patron": "traccion-horizontal",
    "musculos": [
      {
        "id": "cardio",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "gluteo-mayor",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "dorsal-inf",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "romboides",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "dorsal-sup",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "trap-med",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-post",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "lumbar",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "biceps-larga",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "braquial",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "air-bike": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "cardio",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "vasto-medial",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "gluteo-mayor",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "pecho-med",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "dorsal-inf",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "triceps-lateral",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "biceps-larga",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "comba": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "cardio",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gastrocnemio",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "soleo",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "hombro-lat",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "flexores",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "recto-femoral",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "hombro-ant",
        "rol": "estabilizador",
        "intensidad": 25
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "burpees": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "cuerpo_completo",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-med",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "vasto-lateral",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "vasto-medial",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "gluteo-mayor",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "abd-sup",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "abd-inf",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "gastrocnemio",
        "rol": "secundario",
        "intensidad": 40
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "kettlebell-swing": {
    "patron": "bisagra",
    "musculos": [
      {
        "id": "cuerpo_completo",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "isquios",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "lumbar",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "flexores",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "abd-sup",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "abd-inf",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "oblicuos",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "hombro-ant",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "trapecio",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "vasto-lateral",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "Kettlebell swing, snatch, and bottoms-up carry: back and hip muscle activation, motion, and low back loads",
        "autores": [
          "Stuart M. McGill",
          "Leigh W. Marshall"
        ],
        "año": 2012,
        "doi": "10.1519/JSC.0b013e31823a4063",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Kettlebell swing a dos manos con peso libre"
      }
    ]
  },
  "clean": {
    "patron": "bisagra",
    "musculos": [
      {
        "id": "cuerpo_completo",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trapecio",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "isquios",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "lumbar",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "gastrocnemio",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-lat",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "flexores",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 45
      }
    ],
    "evidencia": "emg",
    "fuentes": [
      {
        "titulo": "An electromyographical comparison of trunk muscle activity during isometric trunk and dynamic strengthening exercises",
        "autores": [
          "Paul Comfort",
          "Stephen J. Pearson",
          "David Mather"
        ],
        "año": 2011,
        "doi": "10.1519/JSC.0b013e3181fb412f",
        "fechaConsulta": "2026-10-31",
        "ejercicioEstudiado": "Cargada de potencia (power clean) con barra y sentadilla dinámica"
      }
    ]
  },
  "salto-cajon": {
    "patron": "sentadilla",
    "musculos": [
      {
        "id": "vasto-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "vasto-medial",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "gastrocnemio",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "recto-femoral",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "soleo",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 45
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "press-declinado-maquina": {
    "patron": "empuje-horizontal",
    "musculos": [
      {
        "id": "pecho-inf",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-med",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "pecho-sup",
        "rol": "estabilizador",
        "intensidad": 25
      },
      {
        "id": "hombro-ant",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "triceps-medial",
        "rol": "secundario",
        "intensidad": 45
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "press-inclinado-maquina": {
    "patron": "empuje-horizontal",
    "musculos": [
      {
        "id": "pecho-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-med",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "triceps-lateral",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "triceps-medial",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "remo-maquina": {
    "patron": "traccion-horizontal",
    "musculos": [
      {
        "id": "romboides",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trap-med",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "dorsal-sup",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "redondo",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-post",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "lumbar",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "remo-iso-maquina": {
    "patron": "traccion-horizontal",
    "musculos": [
      {
        "id": "romboides",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "trap-med",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "dorsal-sup",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "redondo",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-post",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "braquial",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "elevaciones-laterales-maquina": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "hombro-lat",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "trapecio",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "hombro-ant",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "hombro-post",
        "rol": "estabilizador",
        "intensidad": 25
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "elevaciones-frontales-polea": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "hombro-ant",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "pecho-sup",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "hombro-lat",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "trapecio",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "curl-predicador-maquina": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "biceps-corta",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "braquial",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "braquiorradial",
        "rol": "secundario",
        "intensidad": 40
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "curl-polea-espalda": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "biceps-larga",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "biceps-corta",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "braquiorradial",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "extension-triceps-polea-una": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "triceps-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "triceps-medial",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "triceps-larga",
        "rol": "secundario",
        "intensidad": 55
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "fondos-lastrados": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "triceps-lateral",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "triceps-medial",
        "rol": "principal",
        "intensidad": 95
      },
      {
        "id": "triceps-larga",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "pecho-inf",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "pecho-med",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "hip-thrust-maquina": {
    "patron": "bisagra",
    "musculos": [
      {
        "id": "gluteo-mayor",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "gluteo-medio",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "isquios",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "vasto-lateral",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "vasto-medial",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "aductores",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "lumbar",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "elevacion-piernas-paralelas": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "abd-inf",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "recto-femoral",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "abd-sup",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "oblicuos",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "triceps-medial",
        "rol": "estabilizador",
        "intensidad": 30
      },
      {
        "id": "hombro-ant",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "crunch-bicicleta": {
    "patron": "rotacion",
    "musculos": [
      {
        "id": "oblicuos",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "abd-sup",
        "rol": "principal",
        "intensidad": 85
      },
      {
        "id": "abd-inf",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "recto-femoral",
        "rol": "secundario",
        "intensidad": 45
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "codo-rodilla": {
    "patron": "rotacion",
    "musculos": [
      {
        "id": "oblicuos",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "abd-sup",
        "rol": "principal",
        "intensidad": 80
      },
      {
        "id": "abd-inf",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "recto-femoral",
        "rol": "estabilizador",
        "intensidad": 35
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "flexion-lateral": {
    "patron": "aislamiento",
    "musculos": [
      {
        "id": "oblicuos",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "lumbar",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "flexores",
        "rol": "estabilizador",
        "intensidad": 35
      },
      {
        "id": "abd-sup",
        "rol": "estabilizador",
        "intensidad": 30
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  },
  "muscle-up": {
    "patron": "traccion-vertical",
    "musculos": [
      {
        "id": "dorsal-sup",
        "rol": "principal",
        "intensidad": 100
      },
      {
        "id": "dorsal-inf",
        "rol": "principal",
        "intensidad": 90
      },
      {
        "id": "triceps-lateral",
        "rol": "principal",
        "intensidad": 75
      },
      {
        "id": "triceps-medial",
        "rol": "principal",
        "intensidad": 70
      },
      {
        "id": "pecho-inf",
        "rol": "secundario",
        "intensidad": 65
      },
      {
        "id": "redondo",
        "rol": "secundario",
        "intensidad": 60
      },
      {
        "id": "biceps-corta",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "biceps-larga",
        "rol": "secundario",
        "intensidad": 55
      },
      {
        "id": "braquial",
        "rol": "secundario",
        "intensidad": 50
      },
      {
        "id": "hombro-ant",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "flexores",
        "rol": "secundario",
        "intensidad": 45
      },
      {
        "id": "abd-sup",
        "rol": "secundario",
        "intensidad": 40
      },
      {
        "id": "abd-inf",
        "rol": "secundario",
        "intensidad": 40
      }
    ],
    "evidencia": "estimada",
    "fuentes": []
  }
};

export function getExerciseEvidence(id: string): ExerciseEvidenceItem | undefined {
  return EXERCISE_EVIDENCE_MATRIX[id];
}

export interface LibraryEvidenceStats {
  total: number;
  directEvidenceCount: number;
  directHypertrophyCount: number;
  directEmgCount: number;
  estimatedCount: number;
  byPattern: Record<MovementPattern, { total: number; emg: number; hipertrofia: number; estimada: number }>;
}

export function getLibraryEvidenceStats(): LibraryEvidenceStats {
  let directEmgCount = 0;
  let directHypertrophyCount = 0;
  let estimatedCount = 0;

  const byPattern = Object.fromEntries(
    MOVEMENT_PATTERNS.map((p) => [p, { total: 0, emg: 0, hipertrofia: 0, estimada: 0 }])
  ) as Record<MovementPattern, { total: number; emg: number; hipertrofia: number; estimada: number }>;

  for (const item of Object.values(EXERCISE_EVIDENCE_MATRIX)) {
    byPattern[item.patron].total++;
    if (item.evidencia === 'emg') {
      directEmgCount++;
      byPattern[item.patron].emg++;
    } else if (item.evidencia === 'hipertrofia') {
      directHypertrophyCount++;
      byPattern[item.patron].hipertrofia++;
    } else {
      estimatedCount++;
      byPattern[item.patron].estimada++;
    }
  }

  return {
    total: Object.keys(EXERCISE_EVIDENCE_MATRIX).length,
    directEvidenceCount: directEmgCount + directHypertrophyCount,
    directHypertrophyCount,
    directEmgCount,
    estimatedCount,
    byPattern,
  };
}

// Para ejercicios del catálogo externo (876+) y personalizados: no atribuye evidencia heredada indebidamente.
// La evidencia medida solo se asigna a variantes empíricamente contrastadas; los demás casos devuelven evidencia estimada sin citas.
export function resolveCatalogExerciseScience(exercise: Exercise): ExerciseScience {
  if (exercise.science) return exercise.science;
  const base = EXERCISE_EVIDENCE_MATRIX[exercise.id];
  if (base && !exercise.custom) return base;
  return {
    patron: base?.patron ?? 'aislamiento',
    musculos: [
      { id: exercise.muscle, rol: 'principal', intensidad: 100 },
      ...[...new Set(exercise.secondary ?? [])].filter((id) => id !== exercise.muscle).map((id) => ({ id, rol: 'secundario' as const, intensidad: 50 })),
    ],
    evidencia: 'estimada',
    fuentes: [],
  };
}
