/**
 * Módulo termodinámico puro del ciclo Otto ideal de 4 tiempos (aire estándar).
 * Fuente de verdad: Secciones 2, 3, 4, 6, 7, 8, 9 y 10 de la Ficha Técnica del Modelo Físico.
 * Unidades internas: Sistema Internacional (SI) — Pa, K, m³, mol, J, W.
 * Sin dependencias de Three.js ni del DOM.
 */

import {
  DEFAULT_PARAMS,
  computeGeometry,
  getCyclePhase
} from './geometry.js';

/**
 * Normaliza el ángulo theta al intervalo [0°, 720°] preservando explícitamente
 * theta = 720° como el instante de cierre del ciclo (Sección 10, criterio 2).
 */
export function normalizeCycleTheta(theta) {
  if (theta === 720) return 720;
  return ((theta % 720) + 720) % 720;
}

/**
 * Calcula las constantes del gas, los 4 estados principales del ciclo (1, 2, 3, 4)
 * y las magnitudes energéticas por ciclo en función de los parámetros (Sección 6).
 */
export function computeCycleMetrics(params = DEFAULT_PARAMS) {
  const merged = { ...DEFAULT_PARAMS, ...params };
  const { B, a, lb, hp, rc, p1, T1, gamma, R, Qin, N, kappa } = merged;
  const L = merged.L ?? 2 * a;

  // Geometría base en PMS (0°)
  const geo0 = computeGeometry(0, merged);
  const { A, Vd, Vc, V1, hc } = geo0;

  // Propiedades del gas ideal en el ciclo cerrado (Sección 3 y Sección 6)
  const cv = R / (gamma - 1);
  const n = (p1 * V1) / (R * T1);
  const n_cv = n * cv; // Equivale a p1 * V1 / (T1 * (gamma - 1))

  // Estado 1 (θ = 180°, final de admisión / inicio de compresión en PMI)
  const V2 = Vc;
  const V3 = Vc;
  const V4 = V1;

  // Estado 2 (θ = 360°⁻, final de compresión adiabática 1 -> 2 en PMS antes de la chispa)
  const p2 = p1 * Math.pow(rc, gamma);
  const T2 = T1 * Math.pow(rc, gamma - 1);

  // Estado 3 (θ = 360°, final de combustión isocórica instantánea 2 -> 3 en PMS)
  const T3 = T2 + Qin / n_cv;
  const p3 = (n * R * T3) / Vc; // Equivale a p2 * (T3 / T2)

  // Estado 4 (θ = 540°⁻, final de expansión adiabática 3 -> 4 en PMI antes de abrir escape)
  const p4 = p3 * Math.pow(rc, -gamma);
  const T4 = T3 * Math.pow(rc, 1 - gamma);

  // Energía y trabajo por ciclo (Sección 6)
  const Qout = n_cv * (T4 - T1);
  const W12 = -n_cv * (T2 - T1); // Negativo (trabajo sobre el gas en compresión)
  const W34 = n_cv * (T3 - T4);  // Positivo (trabajo por el gas en expansión)
  const Wneto = W12 + W34;       // Igual a Qin - Qout
  const eta = 1 - Math.pow(rc, 1 - gamma); // Igual a Wneto / Qin
  const P = (Wneto * N) / 120;   // Potencia en W (un ciclo cada 2 vueltas = 120 s/min * 2)

  return {
    // Parámetros
    B,
    a,
    L,
    lb,
    hp,
    rc,
    p1,
    T1,
    gamma,
    R,
    Qin,
    N,
    kappa,
    // Geometría
    A,
    Vd,
    Vc,
    V1,
    hc,
    // Gas
    cv,
    n,
    n_cv,
    // Estados planos (Sección 6 y 8.2)
    V2,
    p2,
    T2,
    V3,
    p3,
    T3,
    V4,
    p4,
    T4,
    // Diccionario de estados 1–4
    states: {
      1: { state: 1, theta: 180, V: V1, p: p1, T: T1 },
      2: { state: 2, theta: 360, beforeJump: true, V: V2, p: p2, T: T2 },
      3: { state: 3, theta: 360, beforeJump: false, V: V3, p: p3, T: T3 },
      4: { state: 4, theta: 540, beforeJump: true, V: V4, p: p4, T: T4 }
    },
    // Energías, rendimiento y potencia (Sección 6 y 8.3)
    Qout,
    W12,
    W34,
    Wneto,
    W: Wneto,
    eta,
    P
  };
}

/**
 * Calcula el estado instantáneo del gas (p, T, V, n, Wacum) y de la geometría en función de θ.
 *
 * Física del sistema abierto vs. cerrado:
 * - Con válvulas abiertas (Admisión 0°–180° y Escape 540°–720°): entra o sale gas a (p1, T1),
 *   por lo que la cantidad de sustancia dentro del cilindro es n(θ) = p1 * V(θ) / (R * T1).
 * - Con válvulas cerradas (Compresión 180°–360°⁻ y Combustión/Expansión 360°–540°⁻): la masa
 *   atrapada es constante e igual a n = p1 * V1 / (R * T1).
 *
 * Convención en los saltos (Sección 6):
 * - Por defecto (`options.beforeJump = false`), en θ = 360° y θ = 540° se evalúan los valores
 *   posteriores al salto (estados 3 y 1).
 * - Si se pasa `{ beforeJump: true }` en θ = 360° o θ = 540°, se evalúan los valores
 *   inmediatamente anteriores al salto: θ = 360°⁻ (estado 2) y θ = 540°⁻ (estado 4).
 */
export function computeStateAtTheta(theta, params = DEFAULT_PARAMS, options = {}) {
  const merged = { ...DEFAULT_PARAMS, ...params };
  const { beforeJump = false } = options;

  const cycle = computeCycleMetrics(merged);
  const geo = computeGeometry(theta, merged);
  const cycleAngle = normalizeCycleTheta(theta);

  const { p1, T1, gamma, R, Vc, Vd, V1, n_cv, p3, T3, W12, Wneto } = cycle;
  const V_theta = geo.V;

  let p;
  let T;
  let n_inst;
  let Wacum;
  let phaseName;
  let phaseId;
  let processDesc;

  if (cycleAngle < 180 || (cycleAngle === 180 && !beforeJump)) {
    // Admisión (0° a 180°): Sistema abierto isobárico a p1 e isotérmico a T1
    phaseId = 'admision';
    phaseName = 'Admisión';
    processDesc = 'Isobárico a p1';
    p = p1;
    T = T1;
    n_inst = (p1 * V_theta) / (R * T1);
    Wacum = p1 * (V_theta - Vc);
  } else if (cycleAngle < 360 || (cycleAngle === 360 && beforeJump)) {
    // Compresión (180° a 360°⁻): Sistema cerrado adiabático 1 -> 2
    phaseId = 'compresion';
    phaseName = 'Compresión';
    processDesc = 'Adiabático 1→2';
    p = p1 * Math.pow(V1 / V_theta, gamma);
    T = T1 * Math.pow(V1 / V_theta, gamma - 1);
    n_inst = cycle.n;
    Wacum = p1 * Vd - n_cv * (T - T1);
  } else if (cycleAngle < 540 || (cycleAngle === 540 && beforeJump)) {
    // Combustión en 360° (estado 3) y Expansión (360° a 540°⁻): Sistema cerrado adiabático 3 -> 4
    phaseId = 'expansion';
    phaseName = cycleAngle === 360 ? 'Combustión' : 'Expansión';
    processDesc = cycleAngle === 360 ? 'Isocórico 2→3' : 'Adiabático 3→4';
    p = p3 * Math.pow(Vc / V_theta, gamma);
    T = T3 * Math.pow(Vc / V_theta, gamma - 1);
    n_inst = cycle.n;
    Wacum = p1 * Vd + W12 + n_cv * (T3 - T);
  } else {
    // Escape (540° a 720°): Salto isocórico 4 -> 1 en 540° y barrido isobárico a p1
    phaseId = 'escape';
    phaseName = 'Escape';
    processDesc = 'Isocórico 4→1 e isobárico a p1';
    p = p1;
    T = T1;
    n_inst = (p1 * V_theta) / (R * T1);
    Wacum = Wneto + p1 * (V_theta - Vc);
  }

  const basePhase = getCyclePhase(cycleAngle === 720 ? 0 : cycleAngle);

  return {
    theta,
    cycleAngle,
    V: V_theta,
    p,
    T,
    Wacum,
    W: Wacum,
    n: n_inst,
    n_ciclo: cycle.n,
    R: cycle.R,
    gamma: cycle.gamma,
    cv: cycle.cv,
    Qin: cycle.Qin,
    Qout: cycle.Qout,
    W12: cycle.W12,
    W34: cycle.W34,
    Wneto: cycle.Wneto,
    eta: cycle.eta,
    P: cycle.P,
    phase: {
      ...basePhase,
      id: phaseId,
      name: phaseName,
      process: processDesc
    },
    geometry: geo,
    cycle
  };
}

/**
 * Integra numéricamente el trabajo ∫ p dV sobre el lazo 1 -> 2 -> 3 -> 4 -> 1
 * usando la regla del trapecio con paso angular configurable (Sección 10, criterio 5).
 */
export function integrateCycleWorkNumerically(params = DEFAULT_PARAMS, stepDeg = 0.25) {
  const merged = { ...DEFAULT_PARAMS, ...params };
  let workSum = 0;

  // Tramo de compresión (180° a 360°⁻)
  let prev = computeStateAtTheta(180, merged);
  for (let angle = 180 + stepDeg; angle <= 360; angle += stepDeg) {
    const isEnd = Math.abs(angle - 360) < 1e-9;
    const curr = computeStateAtTheta(isEnd ? 360 : angle, merged, { beforeJump: isEnd });
    const dV = curr.V - prev.V;
    workSum += 0.5 * (prev.p + curr.p) * dV;
    prev = curr;
  }

  // Tramo de expansión (360° a 540°⁻)
  prev = computeStateAtTheta(360, merged, { beforeJump: false });
  for (let angle = 360 + stepDeg; angle <= 540; angle += stepDeg) {
    const isEnd = Math.abs(angle - 540) < 1e-9;
    const curr = computeStateAtTheta(isEnd ? 540 : angle, merged, { beforeJump: isEnd });
    const dV = curr.V - prev.V;
    workSum += 0.5 * (prev.p + curr.p) * dV;
    prev = curr;
  }

  return workSum;
}