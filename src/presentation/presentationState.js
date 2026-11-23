/**
 * Módulo del Modelo de Datos y Máquina de Estados de la Presentación ("Modo Keynote 3D").
 * Orquesta las 7 estaciones pedagógicas para la exposición de Física 2 de Samuel Gallego Osorio,
 * controlando la cinemática angular de θ (bucle didáctico en fases vs continuo),
 * los objetivos de cámara Three.js, las fórmulas del proceso y los aspectos importantes.
 */

import { DEFAULT_PARAMS } from '../model/geometry.js';

export const MAX_TIMER_SECONDS = 600; // 10 minutos de referencia interna

function deepFreeze(obj) {
  Object.keys(obj).forEach((prop) => {
    if (typeof obj[prop] === 'object' && obj[prop] !== null && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop]);
    }
  });
  return Object.freeze(obj);
}

/**
 * Definición inmutable de las 7 estaciones de la presentación pedagógica.
 * Cada estación cuenta con:
 * - Parámetros dimensionales y termodinámicos explicados en lenguaje humano.
 * - Narrativa didáctica extensa (2-3 párrafos) que explica la física del fenómeno.
 * - Ecuaciones matemáticas en LaTeX auténtico para renderizado con KaTeX.
 * - Tarjetas individuales de "Aspectos Importantes" con relieve visual y categorización.
 */
export const STATIONS = deepFreeze([
  {
    id: 1,
    title: 'Introducción y Mecanismo: Arquitectura del Motor 4T',
    subtitle: 'Arquitectura del Motor Monocilíndrico 4T: Fundamentos mecánicos y volumétricos',
    badgeColor: '#3b82f6',
    camera: {
      position: { x: 0.18, y: 0.22, z: 0.70 },
      target: { x: 0.04, y: 0.10, z: 0.0 }
    },
    motion: {
      type: 'continuous'
    },
    parameters: [
      {
        label: 'Calibre del Cilindro',
        symbol: 'B',
        value: '80 mm (0.08 m)',
        note: 'Diámetro interior de la camisa donde desliza herméticamente el pistón.'
      },
      {
        label: 'Carrera del Pistón',
        symbol: 'L',
        value: '80 mm (0.08 m)',
        note: 'Desplazamiento lineal entre el Punto Muerto Superior (PMS) y el Inferior (PMI). Configuración cuadrada 1:1.'
      },
      {
        label: 'Longitud de Biela',
        symbol: 'l_b',
        value: '130 mm (0.13 m)',
        note: 'Brazo articulado que transmite el empuje vertical del pistón al cigüeñal.'
      },
      {
        label: 'Cilindrada Unitaria',
        symbol: 'V_d',
        value: '402.12 cm³',
        note: 'Volumen útil barrido por la cabeza del pistón en una carrera completa.'
      },
      {
        label: 'Ciclo Mecánico Completo',
        symbol: 'θ',
        value: '720° (2 vueltas)',
        note: 'Se requieren cuatro carreras completas del pistón para ejecutar un ciclo térmico.'
      }
    ],
    paragraphs: [
      'En esta primera estación presentamos la base dimensional y mecánica de nuestro modelo tridimensional. Se trata de un motor monocilíndrico de cuatro tiempos con una arquitectura geométrica de tipo "cuadrada", en la cual el diámetro interno del cilindro (calibre B = 80 mm) es exactamente igual a la carrera máxima del pistón (L = 80 mm). Esta proporción 1:1 representa una de las soluciones más equilibradas en ingeniería mecánica automotriz, ya que optimiza el área disponible para las válvulas de culata sin someter al pistón a velocidades lineales excesivas.',
      'El mecanismo biela-manivela se encarga de convertir el movimiento rectilíneo alternativo del pistón en par motor rotativo sobre el eje cigüeñal. Dado que el motor opera bajo el ciclo termodinámico Otto de cuatro tiempos, la masa de fluido gaseoso contenida en la cámara experimenta cuatro etapas secuenciales (admisión, compresión, expansión y escape). Cada una de estas etapas se desarrolla a lo largo de una carrera del pistón de 180°, por lo que el ciclo térmico completo exige dos revoluciones continuas del cigüeñal (720°) antes de repetirse.',
      'El pistón nunca llega a tocar la culata en su carrera ascendente: el volumen mínimo que queda confinado entre la cabeza del pistón en el PMS y la culata constituye la cámara de combustión o volumen muerto (Vc = 50.27 cm³), un espacio fundamental sobre el cual se basa toda la termodinámica del ciclo.'
    ],
    equations: [
      'A_p = \\frac{\\pi}{4} B^2 = 50.265\\,\\text{cm}^2',
      'V_d = A_p \\cdot L = \\frac{\\pi}{4} B^2 L = 402.12\\,\\text{cm}^3',
      'r_c = \\frac{V_1}{V_c} = \\frac{V_c + V_d}{V_c} = 9',
      'V_c = \\frac{V_d}{r_c - 1} = 50.27\\,\\text{cm}^3, \\quad V_1 = V_c + V_d = 452.39\\,\\text{cm}^3'
    ],
    importantPoints: [
      {
        category: 'ARQUITECTURA',
        title: 'Geometría Cuadrada (B = L = 80 mm)',
        explanation:
          'La igualdad entre diámetro y carrera equilibra el llenado de mezcla fresca y las fuerzas de inercia alternadas sobre el bulón y los casquillos.'
      },
      {
        category: 'CINEMÁTICA',
        title: 'Ciclo de Dos Revoluciones (720°)',
        explanation:
          'A diferencia de un motor de dos tiempos, el ciclo Otto de 4 tiempos distribuye sus cuatro procesos térmicos a lo largo de exactamente 2 vueltas del cigüeñal (720°).'
      },
      {
        category: 'VOLUMETRÍA',
        title: 'Volumen Útil Barrido vs. Volumen Muerto',
        explanation:
          'La cilindrada total desplazada (Vd = 402.12 cm³) sumada al volumen de la cámara de combustión (Vc = 50.27 cm³) define el volumen máximo de admisión (V1 = 452.4 cm³).'
      }
    ],
    hookQuestion:
      '¿Cómo transforma un cilindro de 80×80 mm cuatro carreras lineales en rotación continua?',
    cues: [
      {
        step: 1,
        label: 'Geometría cuadrada y cilindrada (→ Ec. 1 y 2)',
        text: 'El calibre B = 80 mm y la carrera L = 80 mm definen un área de pistón de 50.27 cm² que barre 402.12 cm³ en cada desplazamiento.'
      },
      {
        step: 2,
        label: 'Cámara muerta y relación 9:1 (→ Ec. 3 y 4)',
        text: 'En el PMS siempre quedan 50.27 cm³ de cámara mínima; al bajar al PMI el volumen total alcanza 452.39 cm³ (r_c = 9).'
      },
      {
        step: 3,
        label: 'Ciclo mecánico de dos vueltas (720°)',
        text: 'La biela-manivela necesita cuatro carreras del pistón —dos giros completos del cigüeñal (720°)— para cerrar un ciclo térmico.'
      }
    ],
    blueprint: {
      type: 'architecture',
      caption: 'Ciclo completo: 720° (2 vueltas)'
    },
    formulaCards: [
      {
        eqNumber: 'Ec. (2)',
        title: 'Volumen desplazado (cilindrada)',
        latex: 'V_d = \\frac{\\pi}{4} B^2 L = 402.12\\,\\text{cm}^3',
        explanation:
          'Multiplica el área circular del pistón (A_p = 50.27 cm², Ec. 1) por su recorrido L = 8 cm.',
        terms: [
          { symbol: 'B', meaning: 'calibre (80 mm)' },
          { symbol: 'L', meaning: 'carrera (80 mm)' }
        ]
      },
      {
        eqNumber: 'Ec. (3) y (4)',
        title: 'Razón de compresión y volumen PMI',
        latex: 'r_c = \\frac{V_1}{V_c} = 9 \\;\\; (V_1 = 452.39\\,\\text{cm}^3)',
        explanation:
          'El volumen máximo en PMI (V₁ = V_c + V_d) es 9 veces el volumen mínimo de la cámara (V_c = 50.27 cm³).',
        terms: [
          { symbol: 'V_c', meaning: '50.27 cm³ (PMS)' },
          { symbol: 'V_1', meaning: 'V_c + V_d (PMI)' }
        ]
      }
    ],
    liveMetrics: [
      { key: 'theta', label: 'Ángulo θ' },
      { key: 'phase', label: 'Carrera activa' }
    ],
    description:
      'Motor Monocilíndrico 4T: Diámetro B = 80 mm, carrera L = 80 mm, biela lb = 130 mm, cilindrada Vd = 402.12 cm³. El ciclo termodinámico completo requiere 2 vueltas de cigüeñal (720°).'
  },
  {
    id: 2,
    title: 'Dinámica y Cinemática Real vs. M.A.S.',
    subtitle: 'Causa dinámica: violación de la condición de fuerza armónica por el pulso de combustión',
    badgeColor: '#8b5cf6',
    camera: {
      position: { x: 0.062, y: 0.098, z: 0.85 },
      target: { x: 0.062, y: 0.098, z: 0.0 }
    },
    motion: {
      type: 'continuous'
    },
    physicsNote:
      'Causa dinámica: la Segunda Ley de Newton exige una fuerza elástica lineal simétrica F = -kx para un M.A.S. Fuerza externa periódica no armónica concentrada en el pulso de combustión en 360° (7737.8 kPa, 38.9 kN) que rompe la condición armónica.',
    parameters: [
      {
        label: 'Fuerza Pico sobre el Pistón',
        symbol: 'F_max',
        value: '38.89 kN (≈ 3.96 toneladas)',
        note: 'Empuje instantáneo sobre la corona del pistón generado en el encendido de 360°.'
      },
      {
        label: 'Presión Pico de Combustión',
        symbol: 'p_max',
        value: '7737.8 kPa (7.74 MPa)',
        note: 'Salto térmico súbito de presión dentro de la cámara en el PMS.'
      },
      {
        label: 'Condición de M.A.S.',
        symbol: 'F = -kx',
        value: 'Violada rigurosamente',
        note: 'La fuerza de los gases es unidireccional, no lineal y discontinua en el tiempo.'
      },
      {
        label: 'Régimen Mecánico',
        symbol: 'N',
        value: '3000 rpm (50 Hz)',
        note: '50 oscilaciones completas del pistón por segundo bajo carga impulsiva periódica.'
      }
    ],
    paragraphs: [
      'En la física introductoria es habitual simplificar el movimiento alternativo de un pistón asociándolo a un Movimiento Armónico Simple (M.A.S.). Sin embargo, al analizar la dinámica newtoniana del motor real, esta hipótesis se derrumba por una causa fundamental: la naturaleza física de las fuerzas que actúan sobre el pistón según la Segunda Ley de Newton.',
      'Para que una masa describa un M.A.S. puro, la Segunda Ley de Newton exige sin excepción una fuerza neta restauradora de tipo elástico, lineal y simétrica respecto a la posición de equilibrio: F_neta = -k·x = m·(d²x/dt²). En un motor de combustión interna jamás existe tal fuerza restauradora. La fuerza predominante que actúa sobre la cabeza del pistón proviene de la presión instantánea del gas: F_gas(t) = p(t) · A_pistón.',
      'En el punto muerto superior (θ = 360°), la chispa de la bujía desencadena la combustión súbita de la mezcla, disparando la presión instantáneamente hasta 7737.8 kPa (7.74 MPa). Esto genera un violento impacto unidireccional de 38.89 kN (casi 4 toneladas de empuje vertical) sobre la cabeza del pistón en una fracción de milisegundo. Esta fuerza ocurre solo una vez en todo el ciclo de cuatro tiempos (es decir, una vez cada 720°), siendo completamente nula o pasiva durante las otras tres carreras. Por lo tanto, el pistón no ejecuta un oscilador armónico simple, sino una oscilación forzada y fuertemente no lineal gobernada por pulsos periódicos de presión de gases.'
    ],
    equations: [
      'p_i = \\frac{n R T_i}{V_i} \\quad (\\text{para cada estado } i = 1, 2, 3, 4)',
      'A_p = \\frac{\\pi}{4} B^2 = 50.265\\,\\text{cm}^2'
    ],
    importantPoints: [
      {
        category: 'SEGUNDA LEY',
        title: 'Inexistencia de Fuerza Restauradora Lineal',
        explanation:
          'El M.A.S. requiere por definición una fuerza restauradora continua y proporcional F = -kx. En el motor, los gases solo ejercen empuje expansivo unidireccional y su magnitud depende del calor de combustión.'
      },
      {
        category: 'DINÁMICA',
        title: 'Pulso Impulsivo Periódico en 360° (38.89 kN)',
        explanation:
          'La corona del pistón recibe un choque de casi 4 toneladas de fuerza concentrado en el encendido en PMS, mientras que en las otras tres carreras la fuerza de gas es despreciable o resistente.'
      },
      {
        category: 'ACELERACIÓN',
        title: 'Asimetría del Perfil Oscilográfico',
        explanation:
          'El trazo oscilográfico proyectado en la pantalla demuestra que la aceleración real del pistón distorsiona la senoidal armónica debido a la solicitación discontinua de la Segunda Ley.'
      }
    ],
    hookQuestion:
      '¿Por qué el pistón de un motor real NO oscila como un resorte armónico simple?',
    cues: [
      {
        step: 1,
        label: 'Asimetría cinemática por biela finita',
        text: 'Al girar, la biela corta (l_b = 130 mm) se inclina y desvía la posición real del pistón (Δs) frente a una curva senoidal pura.'
      },
      {
        step: 2,
        label: 'Causa dinámica: golpe explosivo (→ Ec. 7 y 1)',
        text: 'Un M.A.S. exige una fuerza restauradora continua F = -kx; aquí una fuerza externa periódica no armónica F_gas = p(t)·A rompe F = -kx.'
      },
      {
        step: 3,
        label: 'Impacto concentrado en 360° (38.89 kN)',
        text: 'Solo en el encendido la presión salta a 7737.8 kPa sobre los 50.27 cm² del pistón, descargando casi 4 toneladas en una sola carrera.'
      }
    ],
    blueprint: {
      type: 'dynamics',
      caption: 'Desviación del M.A.S. por biela finita y pulso en 360°'
    },
    formulaCards: [
      {
        eqNumber: 'Ec. (7)',
        title: 'Salto de presión por gas ideal en 360°',
        latex: 'p_i = \\frac{n R T_i}{V_i} \\implies p_3 = 7737.8\\,\\text{kPa}',
        explanation:
          'La presión del gas no es simétrica: salta súbitamente a 7737.8 kPa en el PMS cuando estalla la chispa.',
        terms: [
          { symbol: 'T_3', meaning: '2579.3 K en PMS' },
          { symbol: 'p_3', meaning: '7737.8 kPa' }
        ]
      },
      {
        eqNumber: 'Ec. (1)',
        title: 'Área transversal del pistón',
        latex: 'A_p = \\frac{\\pi}{4} B^2 = 50.27\\,\\text{cm}^2',
        explanation:
          'Esa presión pico actuando sobre los 50.27 cm² de la corona genera el empuje impulsivo de 38.89 kN.',
        terms: [
          { symbol: 'A_p', meaning: 'corona del pistón' },
          { symbol: 'F_{\\text{pico}}', meaning: '38.89 kN (no armónica)' }
        ]
      }
    ],
    liveMetrics: [
      { key: 'F_gas', label: 'Fuerza F_gas(θ)' },
      { key: 'delta_mas', label: 'Desvío Δs(θ)' }
    ],
    description:
      'Causa dinámica de la desviación del M.A.S.: La Segunda Ley de Newton exige una fuerza restauradora simétrica F = -kx. En el motor, la combustión concentra un pulso no armónico F_gas = p(t)·A de 7737.8 kPa (38.89 kN) en 360°, rompiendo la condición de oscilador armónico.'
  },
  {
    id: 3,
    title: 'Fase 1 · Admisión',
    subtitle: 'Aspiración isobárica de mezcla fresca a presión atmosférica',
    badgeColor: '#38bdf8',
    camera: {
      position: { x: -0.02, y: 0.21, z: 0.45 },
      target: { x: -0.02, y: 0.20, z: 0.0 }
    },
    motion: {
      type: 'loop',
      thetaStart: 0,
      thetaEnd: 180
    },
    parameters: [
      {
        label: 'Rango Angular',
        symbol: 'θ',
        value: '0° → 180°',
        note: 'Descenso del pistón desde el PMS hasta el PMI.'
      },
      {
        label: 'Presión de Admisión',
        symbol: 'p_1',
        value: '100.0 kPa',
        note: 'Presión isobárica de llenado tomada como nivel atmosférico estándar.'
      },
      {
        label: 'Temperatura de Entrada',
        symbol: 'T_1',
        value: '300.0 K (26.85 °C)',
        note: 'Temperatura ambiente de la mezcla aire-gasolina fresca.'
      },
      {
        label: 'Volumen Inicial en PMI',
        symbol: 'V_1',
        value: '452.4 cm³',
        note: 'Capacidad volumétrica máxima del cilindro (Vd + Vc).'
      },
      {
        label: 'Masa Molar de Mezcla',
        symbol: 'n',
        value: '0.01814 mol',
        note: 'Cantidad de sustancia gaseosa atrapada en el cilindro (Gas ideal R = 8.314 J/mol·K).'
      },
      {
        label: 'Alzada de Válvula',
        symbol: 'h_v',
        value: '5.5 mm',
        note: 'Apertura controlada de la válvula de admisión accionada por el árbol de levas.'
      }
    ],
    paragraphs: [
      'El ciclo térmico comienza en el Punto Muerto Superior (θ = 0°). En este instante, el perfil de la leva de admisión vence la precarga del resorte y abre la válvula de admisión con una alzada vertical de 5.5 mm. Al mismo tiempo, el pistón desciende hacia el Punto Muerto Inferior (θ = 180°), generando un incremento progresivo del volumen interno del cilindro.',
      'Este aumento volumétrico crea una ligera depresión que aspira la mezcla fresca de aire y gasolina atomizada. En el ciclo Otto ideal, esta aspiración se modela como un proceso isobárico a presión atmosférica constante (p1 = 100 kPa) y temperatura ambiente (T1 = 300 K). Al culminar la carrera en el PMI (180°), el cilindro alberga un volumen total de 452.4 cm³, lo que según la ecuación de los gases ideales equivale exactamente a n = 0.01814 moles de mezcla carburada.',
      'Desde el punto de vista del balance de trabajo, el gas realiza un trabajo positivo de aspiración (W_admisión = +p1 · Vd = +40.21 J). No obstante, como comprobaremos en la última fase del ciclo, este trabajo positivo se anulará exactamente con el trabajo de bombeo negativo de la carrera de escape, de modo que el proceso de admisión no añade ni resta energía neta al ciclo útil.'
    ],
    equations: [
      'pV = nRT \\implies n = \\frac{p_1 V_1}{R T_1} = 0.01814\\,\\text{mol}',
      'V_1 = V_c + V_d = 452.39\\,\\text{cm}^3'
    ],
    importantPoints: [
      {
        category: 'ASPIRACIÓN',
        title: 'Llenado Isobárico a Presión Atmosférica',
        explanation:
          'El descenso del pistón del PMS al PMI aumenta el volumen de la cámara manteniendo p1 = 100 kPa y T1 = 300 K, aspirando 0.01814 mol de mezcla aire-combustible fresca.'
      },
      {
        category: 'DISTRIBUCIÓN',
        title: 'Apertura de Admisión con Alzada de 5.5 mm',
        explanation:
          'La leva de admisión mantiene la válvula abierta durante los 180° de descenso mientras la válvula de escape permanece completamente sellada.'
      },
      {
        category: 'BOMBEO',
        title: 'Trabajo Isobárico de Llenado (+40.21 J)',
        explanation:
          'El gas realiza un trabajo positivo de llenado que en el ciclo global se cancela exactamente con el bombeo resistente de la carrera de escape.'
      }
    ],
    hookQuestion:
      '¿Cuánta mezcla fresca de aire y combustible logra aspirar el cilindro en media vuelta?',
    cues: [
      {
        step: 1,
        label: 'Apertura sincronizada y descenso (0°→180°)',
        text: 'La leva izquierda abre la válvula 5.5 mm mientras el pistón desciende del PMS al PMI ampliando la cámara.'
      },
      {
        step: 2,
        label: 'Llenado isobárico atmosférico (→ Ec. 4)',
        text: 'La presión exterior (p₁ = 100 kPa a T₁ = 300 K) empuja aire y gasolina fresca hasta llenar los 452.39 cm³ en el PMI.'
      },
      {
        step: 3,
        label: 'Cantidad química atrapada (→ Ec. 5)',
        text: 'Al cerrarse la válvula en 180°, la ecuación de gas ideal fija exactamente n = 0.01814 mol de mezcla para todo el ciclo.'
      }
    ],
    blueprint: {
      type: 'intake',
      caption: 'Aspiración isobárica a p₁ = 100 kPa'
    },
    formulaCards: [
      {
        eqNumber: 'Ec. (5)',
        title: 'Ley de gas ideal (moles atrapados)',
        latex: 'n = \\frac{p_1 V_1}{R T_1} = 0.01814\\,\\text{mol}',
        explanation:
          'Despeja de pV = nRT la cantidad exacta de moles encerrados a 100 kPa y 300 K.',
        terms: [
          { symbol: 'p_1', meaning: '100 kPa' },
          { symbol: 'T_1', meaning: '300 K' }
        ]
      },
      {
        eqNumber: 'Ec. (4)',
        title: 'Volumen máximo en el PMI',
        latex: 'V_1 = V_c + V_d = 452.39\\,\\text{cm}^3',
        explanation:
          'Suma la cámara muerta (50.27 cm³) más la cilindrada barrida (402.12 cm³) al llegar al PMI.',
        terms: [
          { symbol: 'V_c', meaning: '50.27 cm³' },
          { symbol: 'V_d', meaning: '402.12 cm³' }
        ]
      }
    ],
    liveMetrics: [
      { key: 'V_inst', label: 'Volumen V(θ)' },
      { key: 'hv_intake', label: 'Alzada h_v(θ)' }
    ],
    description:
      'Válvula de admisión abierta (alzada 5.5 mm). El pistón desciende hasta el PMI (0° → 180°). Aspiración isobárica de mezcla aire-combustible a p₁ = 100 kPa, T₁ = 300 K, V₁ = 452.4 cm³. Cantidad molar n = 0.0181 mol.'
  },
  {
    id: 4,
    title: 'Fase 2 · Compresión Adiabática',
    subtitle: 'Compresión isoentrópica y la cota de seguridad del volumen muerto contra el knocking',
    badgeColor: '#f59e0b',
    camera: {
      position: { x: 0.0, y: 0.16, z: 0.55 },
      target: { x: 0.0, y: 0.16, z: 0.0 }
    },
    motion: {
      type: 'loop',
      thetaStart: 180,
      thetaEnd: 360
    },
    physicsNote:
      'Límite de Detonación prematura (Knocking): El volumen muerto Vc = 50.27 cm³ (rc = 9) garantiza que T₂ = 722.5 K no alcance la temperatura de autoignición de la mezcla. Si Vc fuese menor (rc > 12), ocurriría autodetonación espontánea destructiva.',
    parameters: [
      {
        label: 'Rango Angular',
        symbol: 'θ',
        value: '180° → 360°',
        note: 'Ascenso del pistón del PMI al PMS con ambas válvulas cerradas herméticamente.'
      },
      {
        label: 'Relación de Compresión',
        symbol: 'r_c',
        value: '9.0 : 1',
        note: 'Razón geométrica entre el volumen máximo y el volumen muerto (V1 / Vc).'
      },
      {
        label: 'Presión al Final de Compresión',
        symbol: 'p_2',
        value: '2167.4 kPa (2.17 MPa)',
        note: 'Incremento de casi 22 veces respecto a la presión atmosférica inicial.'
      },
      {
        label: 'Temperatura al Final de Compresión',
        symbol: 'T_2',
        value: '722.5 K (449.35 °C)',
        note: 'Elevación térmica debida al trabajo mecánico de compresión absorbido por el gas.'
      },
      {
        label: 'Trabajo Mecánico Absorbido',
        symbol: 'W_12',
        value: '-159.3 J',
        note: 'Energía resistente que el cigüeñal debe entregar para comprimir la carga (Q = 0).'
      },
      {
        label: 'Volumen Muerto Crítico',
        symbol: 'V_c',
        value: '50.27 cm³',
        note: 'Espacio de seguridad en la culata que previene el autoencendido destructivo.'
      }
    ],
    paragraphs: [
      'Al llegar al PMI (θ = 180°), la válvula de admisión se cierra por completo. Con ambas válvulas herméticamente selladas, el pistón invierte su sentido de avance e inicia su ascenso hacia el PMS (θ = 360°). Dado que el motor gira a 3000 rpm (50 revoluciones por segundo), la carrera de compresión dura apenas 10 milisegundos. En este lapso tan breve, la transferencia de calor a través de las paredes del cilindro es prácticamente insignificante, lo que permite modelar la compresión como un proceso adiabático reversible (Q = 0) con coeficiente adiabático γ = 1.4.',
      'A medida que el pistón reduce el volumen del gas en una relación de compresión rc = 9.0, el cigüeñal debe entregar un trabajo mecánico resistente de W12 = -159.3 J. Por la Primera Ley de la Termodinámica (ΔU = -W), toda esta energía absorbida se confina en el fluido, elevando su energía interna: la presión se dispara hasta p2 = 2167.4 kPa (2.17 MPa) y la temperatura alcanza T2 = 722.5 K (449.35 °C).',
      'Aquí se encuentra uno de los principios de diseño más estrictos de la termodinámica aplicada: el volumen muerto Vc = 50.27 cm³ constituye una cota física crítica de seguridad. Si el diseñador redujese excesivamente este volumen buscando mayor rendimiento térmico (por ejemplo, con rc > 12), la temperatura del gas T2 superaría la temperatura de autoignición espontánea de la gasolina comercial (alrededor de 500-550 °C). La mezcla detonaría de forma prematura antes de que salte la chispa, generando violentas ondas de choque supersónicas que destruyen los aros y perforan el pistón. Este fenómeno destructivo se conoce universalmente como cascabeleo o knocking.'
    ],
    equations: [
      '\\Delta U_{12} = -W_{12} \\implies W_{12} = -n c_v (T_2 - T_1) = -159.3\\,\\text{J}',
      'V_c = \\frac{V_d}{r_c - 1} = 50.27\\,\\text{cm}^3',
      'p_2 = \\frac{n R T_2}{V_2} = 2167.4\\,\\text{kPa}'
    ],
    importantPoints: [
      {
        category: 'TERMODINÁMICA',
        title: 'Compresión Isoentrópica Hermética (Q = 0)',
        explanation:
          'La alta velocidad de régimen (3000 rpm) impide la pérdida de calor; todo el trabajo mecánico absorbido (-159.3 J) se traduce en incremento de presión y temperatura del gas.'
      },
      {
        category: 'SEGURIDAD TÉRMICA',
        title: 'Volumen Muerto Vc: Barrera contra el Knocking',
        explanation:
          'El volumen de cámara Vc = 50.27 cm³ (rc = 9) asegura que T2 no rebase el umbral de autoignición de la gasolina; relaciones rc > 12 provocarían autodetonación prematura destructiva.'
      },
      {
        category: 'TRABAJO RESISTENTE',
        title: 'Consumo de Inercia del Cigüeñal',
        explanation:
          'Durante la compresión el motor consume energía; los 159.3 J necesarios para comprimir la mezcla provienen del momento de inercia acumulado en el volante de inercia.'
      }
    ],
    hookQuestion:
      '¿Cómo se calienta el gas y por qué el volumen muerto evita que detone?',
    cues: [
      {
        step: 1,
        label: 'Compresión adiabática (180°→360°)',
        text: 'Con válvulas selladas a 3000 rpm, sube en 10 ms: el calor no alcanza a escapar por las paredes (Q₁₂ = 0).'
      },
      {
        step: 2,
        label: 'Trabajo convertido en calor interno (→ Ec. 9)',
        text: 'Por ΔU₁₂ = -W₁₂, los 159.3 J del cigüeñal elevan la temperatura a 722.5 K y la presión a 2167.4 kPa.'
      },
      {
        step: 3,
        label: 'Barrera contra el knocking (→ Ec. 4)',
        text: 'V_c = 50.27 cm³ (r_c = 9) evita detonación prematura (knocking); si r_c > 12 encendería antes de la chispa.'
      }
    ],
    blueprint: {
      type: 'compression',
      caption: 'Cámara límite contra autoignición (knocking)'
    },
    formulaCards: [
      {
        eqNumber: 'Ec. (9)',
        title: 'Compresión sin calor (Q₁₂ = 0)',
        latex: 'W_{12} = -n c_v (T_2 - T_1) = -159.3\\,\\text{J}',
        explanation:
          'Como Q₁₂ = 0, todo el trabajo mecánico del cigüeñal (-159.3 J) pasa a calentar el gas de 300 K a 722.5 K.',
        terms: [
          { symbol: 'T_2', meaning: '722.5 K en PMS' },
          { symbol: 'p_2', meaning: '2167.4 kPa' }
        ]
      },
      {
        eqNumber: 'Ec. (4)',
        title: 'Volumen mínimo en PMS (anti-knocking)',
        latex: 'V_c = \\frac{V_d}{r_c - 1} = 50.27\\,\\text{cm}^3',
        explanation:
          'Garantiza 10 mm de altura mínima en PMS para mantener T₂ por debajo de la autoignición.',
        terms: [
          { symbol: 'r_c', meaning: 'relación 9:1' },
          { symbol: 'V_c', meaning: 'cámara de seguridad' }
        ]
      }
    ],
    liveMetrics: [
      { key: 'T_inst', label: 'Temp. T(θ)' },
      { key: 'p_inst', label: 'Presión p(θ)' }
    ],
    description:
      'Ambas válvulas cerradas. Proceso adiabático reversible (Q = 0) de 180° a 360°. rc = 9, p₂ = 2167.4 kPa, T₂ = 722.5 K, trabajo absorbido W₁₂ = -159.3 J. Límite de Detonación prematura: Si Vc fuera menor (rc > 12), T₂ superaría la temperatura de autoignición del combustible causando cascabeleo (knocking).'
  },
  {
    id: 5,
    title: 'Chispa e Ignición + Expansión',
    subtitle: 'Aporte térmico isocórico en PMS y la única carrera de potencia útil del ciclo',
    badgeColor: '#ef4444',
    hasSpark: true,
    camera: {
      position: { x: 0.0, y: 0.19, z: 0.42 },
      target: { x: 0.0, y: 0.19, z: 0.0 }
    },
    motion: {
      type: 'loop',
      thetaStart: 360,
      thetaEnd: 540,
      hasSpark: true
    },
    parameters: [
      {
        label: 'Aporte de Calor de la Chispa',
        symbol: 'Q_in',
        value: '700.0 J',
        note: 'Energía química liberada instantáneamente por la combustión en θ = 360°.'
      },
      {
        label: 'Presión Pico de Combustión',
        symbol: 'p_3',
        value: '7737.8 kPa (7.74 MPa)',
        note: 'Punto de máxima presión en todo el ciclo, multiplicando por 3.57 la presión de compresión.'
      },
      {
        label: 'Temperatura Máxima de Flama',
        symbol: 'T_3',
        value: '2579.3 K (2306.15 °C)',
        note: 'Temperatura pico instantánea alcanzada en la cámara de combustión.'
      },
      {
        label: 'Rango de Expansión Motriz',
        symbol: 'θ',
        value: '360° → 540°',
        note: 'Descenso del pistón impulsado por la expansión de los gases calientes.'
      },
      {
        label: 'Trabajo Útil Producido',
        symbol: 'W_34',
        value: '+568.6 J',
        note: 'Único trabajo mecánico positivo que impulsa el cigüeñal y el vehículo.'
      },
      {
        label: 'Presión al Abrir Escape',
        symbol: 'p_4',
        value: '357.0 kPa',
        note: 'Presión remanente del gas al finalizar la carrera de expansión útil.'
      }
    ],
    paragraphs: [
      'En el instante de máxima compresión (θ = 360°), cuando el pistón alcanza el PMS y su velocidad lineal instantánea es estrictamente cero, salta la chispa en la bujía. En el ciclo Otto ideal, la reacción de combustión es tan veloz comparada con el desplazamiento del pistón que se modela como un aporte instantáneo de calor a volumen constante (isocórico), con Qin = 700.0 J confinados estrictamente en el volumen muerto Vc = 50.27 cm³ (W_combustión = 0).',
      'Esta enorme liberación de energía química hace que la temperatura se dispare hasta T3 = 2579.3 K (2306.15 °C) y la presión se eleve súbitamente hasta p3 = 7737.8 kPa (7.74 MPa). Este instante constituye el pico absoluto de esfuerzo mecánico y térmico que deben soportar la culata, los aros y la falda del pistón.',
      'A continuación, los gases incandescentes salen disparados en todas direcciones: parte golpea lateralmente las paredes del cilindro y la culata, y el empuje hacia abajo sobre la corona del pistón (360° → 540°) ejecuta la única carrera motriz de las cuatro que componen el ciclo. El fluido entrega +568.6 J de trabajo mecánico positivo sobre el cigüeñal, impulsando el vehículo y reponiendo con creces la inercia gastada durante la compresión.'
    ],
    equations: [
      '\\Delta U_{23} = Q_{\\text{in}} = n c_v (T_3 - T_2) = 700.0\\,\\text{J} \\implies T_3 = T_2 + \\frac{Q_{\\text{in}}}{n c_v} = 2579.3\\,\\text{K}',
      '\\Delta U_{34} = -W_{34} \\implies W_{34} = +n c_v (T_3 - T_4) = +568.6\\,\\text{J}',
      'p_3 = \\frac{n R T_3}{V_3} = 7737.8\\,\\text{kPa}'
    ],
    importantPoints: [
      {
        category: 'COMBUSTIÓN',
        title: 'Aporte Térmico Isocórico en PMS (700 J)',
        explanation:
          'Se modela la combustión como un aporte instantáneo a volumen congelado Vc, transformando la energía química en presión térmica sin trabajo mecánico durante el encendido.'
      },
      {
        category: 'SOLICITACIÓN',
        title: 'Pico Máximo de Presión y Temperatura',
        explanation:
          'Con 7737.8 kPa y 2579 K, la cámara de combustión soporta las solicitaciones más severas del ciclo térmico, multiplicando casi por cuatro la presión de compresión.'
      },
      {
        category: 'POTENCIA',
        title: 'Única Carrera Motriz del Ciclo (+568.6 J)',
        explanation:
          'Esta carrera de expansión genera todo el trabajo positivo del motor, impulsando el cigüeñal y almacenando inercia para los otros tres tiempos pasivos.'
      }
    ],
    hookQuestion:
      '¿Cómo convierte la chispa el ciclo en una única carrera de empuje útil?',
    cues: [
      {
        step: 1,
        label: 'Chispa a volumen fijo en PMS (→ Ec. 10)',
        text: 'En 360° (W₂₃ = 0) se liberan Q_in = 700 J que disparan la mezcla a T₃ = 2579.3 K y 7737.8 kPa.'
      },
      {
        step: 2,
        label: 'Expansión adiabática motriz (→ Ec. 11)',
        text: 'Las partículas salen en toda dirección y empujan el pistón hacia abajo (360°→540°) con Q₃₄ = 0.'
      },
      {
        step: 3,
        label: 'Única carrera productiva (+568.6 J)',
        text: 'El gas entrega +568.6 J útiles que mueven el auto y sostienen las otras tres carreras.'
      }
    ],
    blueprint: {
      type: 'expansion',
      caption: 'Única carrera motriz del ciclo (360°→540°)'
    },
    formulaCards: [
      {
        eqNumber: 'Ec. (10)',
        title: 'Chispa a volumen fijo V_c (W₂₃ = 0)',
        latex: 'Q_{\\text{in}} = n c_v (T_3 - T_2) = 700.0\\,\\text{J}',
        explanation:
          'Sin cambio de volumen en el instante del chispazo, los 700 J se traducen íntegros en salto térmico y de presión.',
        terms: [
          { symbol: 'T_3', meaning: '2579.3 K' },
          { symbol: 'p_3', meaning: '7737.8 kPa (7.74 MPa)' }
        ]
      },
      {
        eqNumber: 'Ec. (11)',
        title: 'Expansión motriz sin calor (Q₃₄ = 0)',
        latex: 'W_{34} = +n c_v (T_3 - T_4) = +568.6\\,\\text{J}',
        explanation:
          'La caída de energía interna entre T₃ (2579 K) y T₄ (1071 K) se convierte directamente en +568.6 J de empuje.',
        terms: [
          { symbol: 'T_4', meaning: '1071.0 K en PMI' },
          { symbol: 'W_{34}', meaning: 'única carrera motriz' }
        ]
      }
    ],
    liveMetrics: [
      { key: 'p_inst', label: 'Presión p(θ)' },
      { key: 'T_inst', label: 'Temp. T(θ)' },
      { key: 'W34_theta', label: 'Trabajo W₃₄(θ)' }
    ],
    description:
      'Chispa en PMS (360°): Aporte instantáneo Qin = 700 J a volumen constante. Salto térmico a p₃ = 7737.8 kPa (7.74 MPa) y T₃ = 2579.3 K. Carrera de potencia útil (360° → 540°): Expansión adiabática donde el gas realiza trabajo positivo W₃₄ = +568.6 J.'
  },
  {
    id: 6,
    title: 'Fase 4 · Escape',
    subtitle: 'Expulsión de gases residuales y cinemática de la distribución a media velocidad',
    badgeColor: '#94a3b8',
    camera: {
      position: { x: 0.05, y: 0.22, z: 0.48 },
      target: { x: 0.03, y: 0.20, z: 0.0 }
    },
    motion: {
      type: 'loop',
      thetaStart: 540,
      thetaEnd: 720
    },
    parameters: [
      {
        label: 'Rango Angular',
        symbol: 'θ',
        value: '540° → 720°',
        note: 'Ascenso final del pistón desde el PMI hasta el PMS para desalojar los gases quemados.'
      },
      {
        label: 'Calor Evacuado al Foco Frío',
        symbol: 'Q_out',
        value: '290.7 J',
        note: 'Cesión térmica residual hacia la atmósfera a volumen constante V1.'
      },
      {
        label: 'Alzada de Válvula de Escape',
        symbol: 'h_v',
        value: '5.5 mm',
        note: 'Apertura mecánica accionada por la leva de escape que despresuriza el cilindro.'
      },
      {
        label: 'Relación del Árbol de Levas',
        symbol: 'ω_leva',
        value: '1 : 2 (Media velocidad)',
        note: 'El árbol de levas gira exactamente a la mitad de revoluciones que el cigüeñal (θ_leva = θ / 2).'
      },
      {
        label: 'Presión de Salida',
        symbol: 'p_4 → p_1',
        value: '357.0 kPa → 100.0 kPa',
        note: 'Caída de presión al abrir el escape e igualación con la presión atmosférica.'
      },
      {
        label: 'Temperatura Final de Salida',
        symbol: 'T_4 → T_1',
        value: '1071.0 K → 300.0 K',
        note: 'Disipación del calor sensible de los gases hacia el medio ambiente.'
      }
    ],
    paragraphs: [
      'Al alcanzar el PMI en θ = 540°, el gas todavía retiene una presión residual de p4 = 357.0 kPa y una temperatura de T4 = 1071.0 K (797.85 °C). En este instante preciso, la leva de escape abre la válvula con una alzada de 5.5 mm. En el modelo termodinámico ideal de Otto, la despresurización inmediata que se produce al comunicar la cámara con el exterior se modela como una cesión isocórica de calor hacia el foco frío a volumen constante V1 (Q_out = 290.7 J).',
      'Posteriormente, el pistón asciende por última vez desde el PMI hasta el PMS (540° → 720°), barriendo mecánicamente los gases quemados hacia el colector de escape a una presión isobárica de 100 kPa. Al culminar en 720° (equivalente a 0°), la cámara queda desalojada, la válvula de escape se cierra y se restaura el estado inicial del motor para repetir el ciclo sin interrupción.',
      'Un pilar de ingeniería crucial en este punto es la cinemática de la distribución: dado que un ciclo térmico de 4 tiempos abarca dos giros completos del cigüeñal (720°), cada válvula debe abrirse exactamente una vez cada dos revoluciones del motor. Por este motivo, el árbol de levas está sincronizado mecánicamente a través de una relación de transmisión 2:1, girando exactamente a la mitad de velocidad angular que el cigüeñal (ω_leva = ω / 2). Así, cuando el motor gira a 3000 rpm, el árbol de levas gira a 1500 rpm.'
    ],
    equations: [
      '\\Delta U_{41} = -Q_{\\text{out}} \\implies Q_{\\text{out}} = n c_v (T_4 - T_1) = 290.7\\,\\text{J}',
      'n c_v = 0.3770\\,\\text{J/K}, \\quad \\Delta U = n c_v \\Delta T'
    ],
    importantPoints: [
      {
        category: 'CALOR RESIDUAL',
        title: 'Energía Térmica No Aprovechada (Qout = 290.7 J)',
        explanation:
          'Durante la explosión las partículas se dispersan hacia todos lados sin dirección única y muchas chocan contra las paredes laterales del cilindro; la energía que no logra empujar al pistón (290.7 J) se evacúa en el escape.'
      },
      {
        category: 'MECANISMO',
        title: 'Árbol de Levas a Media Velocidad (1:2)',
        explanation:
          'El engranaje de distribución reduce la velocidad angular a la mitad (1500 rpm a 3000 rpm de motor), abriendo cada válvula una sola vez cada 720°.'
      },
      {
        category: 'BARRIDO',
        title: 'Expulsión Mecánica de Gases Quemados',
        explanation:
          'El ascenso final del pistón desaloja físicamente los gases residuales restaurando el volumen Vc y permitiendo iniciar de inmediato un nuevo ciclo limpio.'
      }
    ],
    hookQuestion:
      '¿Cómo evacúa el cilindro el calor remanente y sincroniza sus válvulas cada dos vueltas?',
    cues: [
      {
        step: 1,
        label: 'Despresurización y calor residual (→ Ec. 12)',
        text: 'Al abrirse la válvula derecha en 540° (PMI), escapan 290.7 J de energía térmica que las partículas no lograron convertir en empuje.'
      },
      {
        step: 2,
        label: 'Barrido y cierre termodinámico (→ Ec. 6)',
        text: 'El pistón sube de 540° a 720° expulsando los gases quemados para restaurar T₁ = 300 K y cerrar el ciclo (ΔU_ciclo = 0).'
      },
      {
        step: 3,
        label: 'Sincronización mecánica 2:1 (θ_leva = θ/2)',
        text: 'Como cada válvula solo debe abrirse una vez cada 720°, el árbol de levas gira exactamente a la mitad de velocidad que el cigüeñal.'
      }
    ],
    blueprint: {
      type: 'exhaust',
      caption: 'Transmisión 2:1 y expulsión de Q_out'
    },
    formulaCards: [
      {
        eqNumber: 'Ec. (12)',
        title: 'Enfriamiento a volumen fijo V₁ (W₄₁ = 0)',
        latex: 'Q_{\\text{out}} = n c_v (T_4 - T_1) = 290.7\\,\\text{J}',
        explanation:
          'Calcula el calor que sale al ambiente cuando el gas baja de 1071.0 K a 300.0 K a volumen constante V₁.',
        terms: [
          { symbol: 'T_4\\to T_1', meaning: '1071 K → 300 K' },
          { symbol: 'Q_{\\text{out}}', meaning: 'calor evacuado' }
        ]
      },
      {
        eqNumber: 'Ec. (6)',
        title: 'Energía interna del gas encerrado',
        latex: '\\Delta U = n c_v \\Delta T \\;\\; (n c_v = 0.377\\,\\text{J/K})',
        explanation:
          'La energía interna depende solo de T; al volver a 300 K, el gas recupera exactamente su estado inicial.',
        terms: [
          { symbol: 'c_v', meaning: '20.785 J/(mol·K)' },
          { symbol: '\\Delta U_{\\text{ciclo}}', meaning: '0 J al cerrar' }
        ]
      }
    ],
    liveMetrics: [
      { key: 'theta', label: 'Cigüeñal θ' },
      { key: 'theta_leva', label: 'Leva θ/2' },
      { key: 'hv_exhaust', label: 'Alzada h_v(θ)' }
    ],
    description:
      'Válvula de escape abierta. Expulsión isobárica de gases residuales y evacuación de Qout = 290.7 J que no empujaron el pistón por dispersión en todas direcciones. El árbol de levas gira a media velocidad (θ_leva = θ / 2), completando 720°.'
  },
  {
    id: 7,
    title: 'El Veredicto Termodinámico: Balance y Rendimiento',
    subtitle: 'Evaluación del trabajo neto útil, eficiencia térmica y contraste con el motor real',
    badgeColor: '#10b981',
    camera: {
      position: { x: 0.20, y: 0.18, z: 0.72 },
      target: { x: 0.02, y: 0.12, z: 0.0 }
    },
    motion: {
      type: 'continuous'
    },
    physicsNote:
      'Causa física de la baja eficiencia: En la explosión las partículas van a todo lado sin dirección, por lo que no todo aporta trabajo útil al pistón; muchas otras chocan contra los lados del cilindro y la culata (Q_out = 290.7 J, η = 58.48% ideal y 25–35% real).',
    parameters: [
      {
        label: 'Trabajo Neto por Ciclo',
        symbol: 'W_neto',
        value: '+409.3 J / ciclo',
        note: 'Integral cíclica ∮ p dV equivalente exactamente al área encerrada por el lazo p–V.'
      },
      {
        label: 'Eficiencia Térmica Ideal',
        symbol: 'η_Otto',
        value: '58.48 % (rc = 9, γ = 1.4)',
        note: 'Rendimiento termodinámico máximo teórico deducido de la relación de compresión.'
      },
      {
        label: 'Potencia Mecánica Continua',
        symbol: 'P',
        value: '10.23 kW (13.91 HP)',
        note: 'Potencia media desarrollada al régimen nominal de 3000 rpm.'
      },
      {
        label: 'Frecuencia de Ciclos Térmicos',
        symbol: 'f_ciclos',
        value: '25 ciclos/segundo',
        note: 'Cada ciclo térmico requiere 2 vueltas; a 50 Hz mecánicos se ejecutan 25 ciclos completos.'
      },
      {
        label: 'Rendimiento en Motor Real',
        symbol: 'η_real',
        value: '25 % – 35 %',
        note: 'Rendimiento efectivo considerando pérdidas irreversibles por rozamiento y calor.'
      }
    ],
    paragraphs: [
      'Llegamos a la conclusión termodinámica de nuestra defensa: el balance global de energía del motor. El trabajo neto útil desarrollado en cada ciclo es la suma algebraica del trabajo absorbido durante la compresión y el trabajo entregado en la expansión: W_neto = W12 + W34 = -159.3 J + 568.6 J = +409.3 J. Este valor coincide exactamente con la diferencia neta de calores: Q_in - Q_out = 700.0 J - 290.7 J = 409.3 J, que equivale geométricamente al área encerrada dentro del diagrama p–V.',
      '¿Por qué no se aprovecha el 100% de los 700.0 J liberados? En la explosión las partículas del gas salen disparadas hacia todos lados sin una dirección única: no toda la energía aporta empuje axial para bajar el pistón, pues gran parte de las partículas chocan lateralmente contra las paredes de la camisa y hacia arriba contra la culata sin producir desplazamiento mecánico. Por ello, incluso en el modelo ideal solo +409.3 J se convierten en trabajo útil (η = 58.48% y P = 10.23 kW a 3000 rpm).',
      'En el motor real el aprovechamiento baja todavía más hasta situarse entre el 25% y el 35%: esos impactos desordenados contra los lados ceden calor directo a las paredes refrigeradas del cilindro, a lo que se suman la duración finita de la combustión, las pérdidas durante la renovación de gases y la fricción mecánica en los segmentos y cojinetes.'
    ],
    equations: [
      'W_{\\text{neto}} = W_{12} + W_{34} = -159.3\\,\\text{J} + 568.6\\,\\text{J} = +409.3\\,\\text{J}',
      'W_{\\text{neto}} = Q_{\\text{in}} - Q_{\\text{out}} = 700.0\\,\\text{J} - 290.7\\,\\text{J} = +409.3\\,\\text{J}',
      '\\eta = \\frac{W_{\\text{neto}}}{Q_{\\text{in}}} = 1 - \\frac{Q_{\\text{out}}}{Q_{\\text{in}}} = \\frac{409.3\\,\\text{J}}{700.0\\,\\text{J}} = 0.5848 \\implies 58.48\\%',
      'P = W_{\\text{neto}}\\left(\\frac{N}{120}\\right) = 409.33\\,\\text{J} \\times 25\\,\\text{s}^{-1} = 10.23\\,\\text{kW}',
      'W = \\int p\\,dV, \\quad W_{\\text{num}} = \\sum_i \\frac{p_i + p_{i+1}}{2}(V_{i+1} - V_i)'
    ],
    importantPoints: [
      {
        category: 'LAZO P-V',
        title: 'Área Encerrada = Trabajo Neto (+409.3 J)',
        explanation:
          'La integral cíclica cerrada ∮ p dV coincide rigurosamente con la diferencia Qin - Qout = 409.3 J, demostrando la conservación de energía del ciclo.'
      },
      {
        category: 'DISPERSIÓN EN EXPLOSIÓN',
        title: 'Partículas sin Dirección: Choques Laterales (η = 58.48%)',
        explanation:
          'Al producirse la explosión, las partículas van hacia todos lados sin una dirección única; muchas chocan a los lados del cilindro sin empujar el pistón, por lo que no todo se vuelve trabajo útil.'
      },
      {
        category: 'MOTOR REAL',
        title: 'Calor a Paredes y Fricción en Motores Reales (25-35%)',
        explanation:
          'Los impactos laterales transfieren calor a las paredes refrigeradas y, junto con la fricción mecánica y la combustión no instantánea, reducen el rendimiento práctico al 25–35%.'
      }
    ],
    hookQuestion:
      '¿Por qué ni el motor ideal convierte el 100% de la explosión en empuje?',
    cues: [
      {
        step: 1,
        label: 'Balance neto en el lazo p–V (→ Ec. 13 y 14)',
        text: 'De los 700 J de la chispa, descontando compresión y escape, quedan +409.3 J útiles en el lazo p–V.'
      },
      {
        step: 2,
        label: 'Causa: partículas sin dirección',
        text: 'En la explosión las partículas salen sin dirección única y muchas chocan a los lados del cilindro sin empujar el pistón.'
      },
      {
        step: 3,
        label: 'Ideal vs. real (→ Ec. 15 y 16)',
        text: 'No todo aporta al pistón: el techo ideal es η = 58.48% (10.23 kW); en un motor real baja a 25–35%.'
      }
    ],
    blueprint: {
      type: 'verdict',
      caption: 'Choques laterales de partículas y balance a 3000 rpm'
    },
    formulaCards: [
      {
        eqNumber: 'Ec. (13) y (14)',
        title: 'Trabajo neto por carreras y por calor',
        latex: 'W_{\\text{neto}} = Q_{\\text{in}} - Q_{\\text{out}} = +409.3\\,\\text{J}',
        explanation:
          'Área encerrada en el lazo p–V: equivale a W₁₂ + W₃₄ y a Q_in - Q_out.',
        terms: [
          { symbol: 'W_{12}+W_{34}', meaning: '-159.3 + 568.6 J' },
          { symbol: 'Q_{\\text{in}}-Q_{\\text{out}}', meaning: '700.0 - 290.7 J' }
        ]
      },
      {
        eqNumber: 'Ec. (15) y (16)',
        title: 'Rendimiento térmico y Potencia (3000 rpm)',
        latex: '\\eta = 1 - \\frac{Q_{\\text{out}}}{Q_{\\text{in}}} = 58.48\\%',
        explanation:
          'Solo el 58.48% del calor empuja al pistón (a 25 ciclos/s entrega 10.23 kW).',
        terms: [
          { symbol: '\\eta', meaning: 'W_neto / Q_in' },
          { symbol: 'P', meaning: 'W_neto(N/120) = 10.23 kW' }
        ]
      }
    ],
    liveMetrics: [
      { key: 'Wneto', label: 'Trabajo neto' },
      { key: 'eta', label: 'Eficiencia' },
      { key: 'power', label: 'Potencia P' }
    ],
    description:
      'Balance global del ciclo Otto: W_neto = +409.3 J, η = 58.48% ideal, P = 10.23 kW (25–35% real). La baja eficiencia se explica porque en la explosión las partículas van a todo lado sin dirección: muchas chocan a los lados del cilindro y no todo aporta empuje al pistón.'
  }
]);

/**
 * Devuelve los parámetros físicos nominales oficiales para el Modo Exposición,
 * preservando únicamente la velocidad de cámara lenta `kappa` elegida en modo libre.
 */
export function getPresentationParams(freeParams = DEFAULT_PARAMS) {
  const rawKappa = freeParams && typeof freeParams === 'object' ? Number(freeParams.kappa) : NaN;
  const kappa = Number.isFinite(rawKappa) && rawKappa > 0 ? rawKappa : DEFAULT_PARAMS.kappa;
  return {
    ...DEFAULT_PARAMS,
    kappa
  };
}

/**
 * Calcula las lecturas numéricas vivas para la estación activa a partir de `thermoState`.
 */
export function computePresentationLiveMetrics(stationIndex, thermoState) {
  if (!thermoState || !thermoState.geometry || !thermoState.cycle) {
    return {};
  }

  const { geometry, cycle, phase, p, T, V } = thermoState;
  const thetaNorm = ((Number(thermoState.cycleAngle ?? thermoState.theta) % 720) + 720) % 720;

  switch (stationIndex) {
    case 1:
      return {
        theta: { text: `${thetaNorm.toFixed(1)}°` },
        phase: { text: phase?.name || 'Admisión' }
      };
    case 2: {
      const fGasKn = (p * geometry.A) / 1000;
      const deltaMm = geometry.delta_mas * 1000;
      const signDelta = deltaMm >= 0 ? '+' : '';
      return {
        F_gas: { text: `${fGasKn.toFixed(2)} kN` },
        delta_mas: { text: `${signDelta}${deltaMm.toFixed(2)} mm` }
      };
    }
    case 3:
      return {
        V_inst: { text: `${(V * 1e6).toFixed(1)} cm³` },
        hv_intake: { text: `${(geometry.valves.intakeLift * 1000).toFixed(1)} mm` }
      };
    case 4:
      return {
        T_inst: {
          text: `${T.toFixed(1)} K`,
          alert: T > 750 ? 'warning' : 'safe'
        },
        p_inst: { text: `${(p / 1000).toFixed(1)} kPa` }
      };
    case 5: {
      const w34Theta =
        thetaNorm >= 360 && thetaNorm <= 540
          ? Math.max(0, cycle.n_cv * (cycle.T3 - T))
          : 0;
      const w34Sign = w34Theta > 0.05 ? '+' : '';
      return {
        p_inst: { text: `${(p / 1000).toFixed(1)} kPa` },
        T_inst: { text: `${T.toFixed(1)} K` },
        W34_theta: { text: `${w34Sign}${w34Theta.toFixed(1)} J` }
      };
    }
    case 6:
      return {
        theta: { text: `${thetaNorm.toFixed(1)}°` },
        theta_leva: { text: `${geometry.valves.camAngleDeg.toFixed(1)}°` },
        hv_exhaust: { text: `${(geometry.valves.exhaustLift * 1000).toFixed(1)} mm` }
      };
    case 7:
      return {
        Wneto: { text: `+${cycle.Wneto.toFixed(1)} J` },
        eta: { text: `${(cycle.eta * 100).toFixed(2)} %` },
        power: { text: `${(cycle.P / 1000).toFixed(2)} kW` }
      };
    default:
      return {};
  }
}

/**
 * Mapea las teclas permitidas dentro del Modo Exposición evitando fugas hacia el modo libre.
 */
export function resolvePresentationKeyAction(key) {
  if (key === ' ' || key === 'ArrowRight' || key === 'PageDown') {
    return { type: 'next' };
  }
  if (key === 'ArrowLeft' || key === 'PageUp') {
    return { type: 'prev' };
  }
  if (key === 'p' || key === 'P') {
    return { type: 'togglePause' };
  }
  if (key === 'k' || key === 'K' || key === 'Escape') {
    return { type: 'exit' };
  }
  if (typeof key === 'string' && /^[1-7]$/.test(key)) {
    return { type: 'station', station: Number(key) };
  }
  return null;
}

/**
 * Crea una instancia de la máquina de estados reactiva de la presentación.
 */
export function createPresentationState(initialActive = false) {
  let active = Boolean(initialActive);
  let currentStationIndex = 1; // 1-based (1..7)
  let timerSeconds = 0;
  let paused = false;

  function clampStation(index) {
    return Math.max(1, Math.min(STATIONS.length, Math.floor(index)));
  }

  return {
    isActive() {
      return active;
    },
    setActive(val) {
      active = Boolean(val);
    },
    toggleActive() {
      active = !active;
      return active;
    },
    getCurrentStationIndex() {
      return currentStationIndex;
    },
    getCurrentStation() {
      return STATIONS[currentStationIndex - 1];
    },
    nextStation() {
      if (currentStationIndex < STATIONS.length) {
        currentStationIndex += 1;
      }
      return currentStationIndex;
    },
    prevStation() {
      if (currentStationIndex > 1) {
        currentStationIndex -= 1;
      }
      return currentStationIndex;
    },
    goToStation(n) {
      currentStationIndex = clampStation(n);
      return currentStationIndex;
    },
    isPaused() {
      return paused;
    },
    setPaused(val) {
      paused = Boolean(val);
    },
    togglePause() {
      paused = !paused;
      return paused;
    },
    getTimerSeconds() {
      return timerSeconds;
    },
    setTimerSeconds(s) {
      timerSeconds = Math.max(0, Math.min(MAX_TIMER_SECONDS, Number(s) || 0));
    },
    tickTimer(dtSeconds) {
      if (paused || !active) return timerSeconds;
      timerSeconds = Math.min(MAX_TIMER_SECONDS, timerSeconds + Math.max(0, Number(dtSeconds) || 0));
      return timerSeconds;
    },
    resetTimer() {
      timerSeconds = 0;
    },
    computeTheta(currentTheta, dtSeconds, omegaBase) {
      if (paused || !dtSeconds || !omegaBase) {
        return currentTheta;
      }

      const station = this.getCurrentStation();
      const motion = station.motion || { type: 'continuous' };

      if (motion.type === 'loop') {
        const thetaStart = motion.thetaStart ?? 0;
        const thetaEnd = motion.thetaEnd ?? 180;
        const span = thetaEnd - thetaStart;

        const effectiveOmega = omegaBase * (motion.speedMultiplier ?? 0.65);
        const nextTheta = currentTheta + effectiveOmega * dtSeconds;

        if (currentTheta < thetaStart || currentTheta >= thetaEnd) {
          return thetaStart + (effectiveOmega * dtSeconds) % span;
        }

        if (nextTheta >= thetaEnd) {
          return thetaStart + ((nextTheta - thetaEnd) % span);
        }

        return nextTheta;
      }

      const nextTheta = (currentTheta + omegaBase * dtSeconds) % 720;
      return (nextTheta + 720) % 720;
    }
  };
}
