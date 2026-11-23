/**
 * Módulo de geometría y cinemática del mecanismo biela-manivela y distribución.
 * Fuente de verdad: Secciones 3, 4, 5 y 6 de la Ficha Técnica del Modelo Físico.
 * Unidades internas: Sistema Internacional (SI) — metros (m), m², m³, radianes/grados.
 * Sin dependencias de Three.js ni del DOM.
 */

export const DEFAULT_PARAMS = Object.freeze({
  B: 0.08,       // Diámetro del cilindro: 80 mm = 0.08 m
  a: 0.04,       // Radio de la manivela: 40 mm = 0.04 m
  L: 0.08,       // Carrera: L = 2*a = 80 mm = 0.08 m
  lb: 0.13,      // Longitud de la biela: 130 mm = 0.13 m (lb/a = 3.25)
  hp: 0.03,      // Altura del pistón entre bulón y corona: 30 mm = 0.03 m
  rc: 9,         // Razón de compresión por defecto
  p1: 100000,    // Presión inicial: 100 kPa = 100 000 Pa
  T1: 300,       // Temperatura inicial: 300 K
  gamma: 1.4,    // Cociente de calores específicos (aire)
  R: 8.314,      // Constante universal de los gases: 8.314 J/(mol·K)
  Qin: 700,      // Calor aportado por ciclo: 700 J
  N: 3000,       // Velocidad de giro: 3000 rpm
  kappa: 0.01    // Factor de cámara lenta por defecto
});

/**
 * Alzada máxima visual de las válvulas de admisión y escape (5.5 mm = 0.0055 m).
 */
export const MAX_VALVE_LIFT = 0.0055;

/**
 * Normaliza un ángulo en grados al intervalo [0, 360) y lo convierte a radianes:
 * t = radianes(theta mod 360°)
 */
export function toRadiansMod360(theta) {
  const mod360 = ((theta % 360) + 360) % 360;
  return (mod360 * Math.PI) / 180;
}

/**
 * Normaliza un ángulo en grados al ciclo completo de 4 tiempos [0, 720).
 */
export function normalizeCycleAngle(theta) {
  return ((theta % 720) + 720) % 720;
}

/**
 * Área del pistón: A = pi * B^2 / 4 (en m²)
 */
export function pistonArea(params = DEFAULT_PARAMS) {
  const { B } = { ...DEFAULT_PARAMS, ...params };
  return (Math.PI * B * B) / 4;
}

/**
 * Cilindrada (volumen desplazado): Vd = A * L (en m³)
 */
export function displacedVolume(params = DEFAULT_PARAMS) {
  const merged = { ...DEFAULT_PARAMS, ...params };
  const L = merged.L ?? 2 * merged.a;
  return pistonArea(merged) * L;
}

/**
 * Volumen muerto (cámara de combustión en PMS): Vc = Vd / (rc - 1) (en m³)
 */
export function clearanceVolume(params = DEFAULT_PARAMS) {
  const merged = { ...DEFAULT_PARAMS, ...params };
  return displacedVolume(merged) / (merged.rc - 1);
}

/**
 * Volumen máximo en el PMI: V1 = Vc + Vd = Vd * rc / (rc - 1) (en m³)
 */
export function maxVolume(params = DEFAULT_PARAMS) {
  const merged = { ...DEFAULT_PARAMS, ...params };
  const Vd = displacedVolume(merged);
  const Vc = Vd / (merged.rc - 1);
  return Vc + Vd;
}

/**
 * Altura de la cámara en el PMS: hc = Vc / A = L / (rc - 1) (en m)
 */
export function clearanceHeight(params = DEFAULT_PARAMS) {
  const merged = { ...DEFAULT_PARAMS, ...params };
  const L = merged.L ?? 2 * merged.a;
  return L / (merged.rc - 1);
}

/**
 * Desplazamiento exacto del pistón desde el PMS hacia abajo (en m):
 * s(theta) = lb + a - a*cos(t) - sqrt(lb^2 - a^2*sin(t)^2)
 */
export function s(theta, params = DEFAULT_PARAMS) {
  const { a, lb } = { ...DEFAULT_PARAMS, ...params };
  const t = toRadiansMod360(theta);
  const sinT = Math.sin(t);
  const cosT = Math.cos(t);
  return lb + a - a * cosT - Math.sqrt(lb * lb - a * a * sinT * sinT);
}

/**
 * Desplazamiento ideal en Movimiento Armónico Simple puro (límite lb -> infinito, en m):
 * s_mas(theta) = a * (1 - cos(t))
 */
export function s_mas(theta, params = DEFAULT_PARAMS) {
  const { a } = { ...DEFAULT_PARAMS, ...params };
  const t = toRadiansMod360(theta);
  return a * (1 - Math.cos(t));
}

/**
 * Volumen instantáneo del cilindro (en m³):
 * V(theta) = Vc + A * s(theta)
 */
export function V(theta, params = DEFAULT_PARAMS) {
  const merged = { ...DEFAULT_PARAMS, ...params };
  const A = pistonArea(merged);
  const Vc = clearanceVolume(merged);
  return Vc + A * s(theta, merged);
}

/**
 * Posición del bulón sobre el eje del cilindro medida desde el eje del cigüeñal (en m):
 * y(theta) = a*cos(t) + sqrt(lb^2 - a^2*sin(t)^2)
 */
export function y(theta, params = DEFAULT_PARAMS) {
  const { a, lb } = { ...DEFAULT_PARAMS, ...params };
  const t = toRadiansMod360(theta);
  const sinT = Math.sin(t);
  const cosT = Math.cos(t);
  return a * cosT + Math.sqrt(lb * lb - a * a * sinT * sinT);
}

/**
 * Ángulo de la biela respecto al eje del cilindro (en radianes):
 * phi = asin((a / lb) * sin(t))
 */
export function phi(theta, params = DEFAULT_PARAMS) {
  const { a, lb } = { ...DEFAULT_PARAMS, ...params };
  const t = toRadiansMod360(theta);
  return Math.asin((a / lb) * Math.sin(t));
}

/**
 * Coordenadas (x, y) de la muñequilla del cigüeñal (en m):
 * (a*sin(t), a*cos(t))
 */
export function crankpinPosition(theta, params = DEFAULT_PARAMS) {
  const { a } = { ...DEFAULT_PARAMS, ...params };
  const t = toRadiansMod360(theta);
  return {
    x: a * Math.sin(t),
    y: a * Math.cos(t)
  };
}

/**
 * Estado y alzada de las válvulas de admisión y escape según la Sección 6:
 * - Admisión (0°–180°): Admisión abierta, escape cerrada.
 * - Compresión (180°–360°): Ambas cerradas.
 * - Expansión (360°–540°): Ambas cerradas.
 * - Escape (540°–720°): Escape abierta, admisión cerrada.
 * Incluye el ángulo del árbol de levas a media velocidad (theta / 2).
 */
export function computeValves(theta) {
  const cycleAngle = normalizeCycleAngle(theta);
  const camAngleDeg = cycleAngle * 0.5;
  const camAngleRad = (camAngleDeg * Math.PI) / 180;

  let intakeLiftRatio = 0;
  let exhaustLiftRatio = 0;

  if (cycleAngle > 0 && cycleAngle < 180) {
    intakeLiftRatio = Math.sin((cycleAngle * Math.PI) / 180);
  } else if (cycleAngle > 540 && cycleAngle < 720) {
    exhaustLiftRatio = Math.sin(((cycleAngle - 540) * Math.PI) / 180);
  }

  return {
    intakeOpen: cycleAngle >= 0 && cycleAngle < 180,
    exhaustOpen: cycleAngle >= 540 && cycleAngle < 720,
    intakeLiftRatio,
    exhaustLiftRatio,
    intakeLift: intakeLiftRatio * MAX_VALVE_LIFT,
    exhaustLift: exhaustLiftRatio * MAX_VALVE_LIFT,
    camAngleDeg,
    camAngleRad
  };
}

/**
 * Identifica la fase actual del ciclo para theta en [0, 720) grados.
 */
export function getCyclePhase(theta) {
  const cycleAngle = normalizeCycleAngle(theta);
  if (cycleAngle < 180) {
    return { id: 'admision', name: 'Admisión', color: '#38bdf8', cycleAngle };
  }
  if (cycleAngle < 360) {
    return { id: 'compresion', name: 'Compresión', color: '#f59e0b', cycleAngle };
  }
  if (cycleAngle < 540) {
    return { id: 'expansion', name: 'Expansión', color: '#ef4444', cycleAngle };
  }
  return { id: 'escape', name: 'Escape', color: '#94a3b8', cycleAngle };
}

/**
 * Calcula y devuelve el estado geométrico completo en unidades SI (metros, m², m³).
 */
export function computeGeometry(theta, params = DEFAULT_PARAMS) {
  const merged = { ...DEFAULT_PARAMS, ...params };
  const { B, a, lb, hp, rc } = merged;
  const L = merged.L ?? 2 * a;

  const A = pistonArea(merged);
  const Vd = A * L;
  const Vc = Vd / (rc - 1);
  const V1 = Vc + Vd;
  const hc = L / (rc - 1);

  const sVal = s(theta, merged);
  const sMasVal = s_mas(theta, merged);
  const deltaMasVal = sVal - sMasVal;
  const yVal = y(theta, merged);
  const VVal = Vc + A * sVal;
  const phiVal = phi(theta, merged);
  const munequilla = crankpinPosition(theta, merged);
  const bulon = { x: 0, y: yVal };

  const y_corona = yVal + hp;
  const y_culata = a + lb + hp + hc;
  const valves = computeValves(theta);

  return {
    theta,
    B,
    a,
    L,
    lb,
    hp,
    rc,
    A,
    Vd,
    Vc,
    V1,
    hc,
    s: sVal,
    s_mas: sMasVal,
    delta_mas: deltaMasVal,
    V: VVal,
    y: yVal,
    phi: phiVal,
    munequilla,
    bulon,
    y_corona,
    y_culata,
    valves
  };
}