import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PARAMS,
  V,
  s,
  s_mas,
  clearanceHeight,
  computeGeometry,
  computeValves
} from '../src/model/geometry.js';

describe('Sección 5, 6, 8.1 y 10.7 — Geometría y distribución del motor', () => {
  it('reproduce las magnitudes geométricas de referencia de la sección 8.1 (error relativo <= 0.1 %)', () => {
    const g = computeGeometry(0, DEFAULT_PARAMS);

    // A = 5026.55 mm² = 5.02655e-3 m²
    expect(Math.abs(g.A - 5026.55e-6) / 5026.55e-6).toBeLessThanOrEqual(1e-3);

    // Vd = 402.124 cm³ = 402.124e-6 m³
    expect(Math.abs(g.Vd - 402.124e-6) / 402.124e-6).toBeLessThanOrEqual(1e-3);

    // Vc = 50.265 cm³ = 50.265e-6 m³
    expect(Math.abs(g.Vc - 50.265e-6) / 50.265e-6).toBeLessThanOrEqual(1e-3);

    // V1 = 452.389 cm³ = 452.389e-6 m³
    expect(Math.abs(g.V1 - 452.389e-6) / 452.389e-6).toBeLessThanOrEqual(1e-3);

    // hc = 10.00 mm = 0.01 m
    expect(Math.abs(g.hc - 0.01)).toBeLessThanOrEqual(1e-9);
  });

  it('cumple V(0°) = Vc y s(0°) = 0 en el PMS', () => {
    const g0 = computeGeometry(0, DEFAULT_PARAMS);
    expect(Math.abs(g0.s - 0)).toBeLessThanOrEqual(1e-12);
    expect(Math.abs(g0.V - g0.Vc)).toBeLessThanOrEqual(1e-12);
  });

  it('cumple V(180°) = V1 y s(180°) = L en el PMI', () => {
    const g180 = computeGeometry(180, DEFAULT_PARAMS);
    expect(Math.abs(g180.s - g180.L)).toBeLessThanOrEqual(1e-12);
    expect(Math.abs(g180.V - g180.V1)).toBeLessThanOrEqual(1e-12);
  });

  it('cumple simetría V(theta) = V(360° - theta) y periodicidad V(theta) = V(theta + 360°)', () => {
    const angles = [0, 15, 37.5, 60, 90, 123.4, 180, 210, 270, 315, 359.9];
    for (const theta of angles) {
      const vTheta = V(theta, DEFAULT_PARAMS);
      const vSym = V(360 - theta, DEFAULT_PARAMS);
      const vPer = V(theta + 360, DEFAULT_PARAMS);
      const vPer2 = V(theta - 720, DEFAULT_PARAMS);

      expect(Math.abs(vTheta - vSym)).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(vTheta - vPer)).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(vTheta - vPer2)).toBeLessThanOrEqual(1e-12);
    }
  });

  it('mantiene la distancia entre muñequilla y bulón igual a lb para todo theta (error <= 1e-9 m)', () => {
    for (let theta = 0; theta <= 720; theta += 5) {
      const g = computeGeometry(theta, DEFAULT_PARAMS);
      const dx = g.bulon.x - g.munequilla.x;
      const dy = g.bulon.y - g.munequilla.y;
      const dist = Math.hypot(dx, dy);

      expect(Math.abs(dist - g.lb)).toBeLessThanOrEqual(1e-9);
    }
  });

  it('verifica hc = L/(rc - 1) = Vc/A y los valores de la sección 5 para rc = 9, 4 y 14', () => {
    for (const rc of [4, 9, 14]) {
      const g = computeGeometry(0, { ...DEFAULT_PARAMS, rc });
      expect(Math.abs(g.hc - g.L / (rc - 1))).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(g.hc - g.Vc / g.A)).toBeLessThanOrEqual(1e-12);
    }

    expect(clearanceHeight({ ...DEFAULT_PARAMS, rc: 9 }) * 1000).toBeCloseTo(10.0, 2);
    expect(clearanceHeight({ ...DEFAULT_PARAMS, rc: 4 }) * 1000).toBeCloseTo(26.67, 2);
    expect(clearanceHeight({ ...DEFAULT_PARAMS, rc: 14 }) * 1000).toBeCloseTo(6.15, 2);
  });

  it('verifica V = A * (s + hc) y la cota de la culata en todo el ciclo', () => {
    for (let theta = 0; theta <= 720; theta += 15) {
      const g = computeGeometry(theta, DEFAULT_PARAMS);
      const vFromGap = g.A * (g.s + g.hc);
      const gap = g.y_culata - g.y_corona;

      expect(Math.abs(g.V - vFromGap)).toBeLessThanOrEqual(1e-12);
      expect(Math.abs(gap - (g.s + g.hc))).toBeLessThanOrEqual(1e-12);
    }
  });

  it('reproduce el punto de control intermedio en theta = 270° y 450° (sección 8.4)', () => {
    const g270 = computeGeometry(270, DEFAULT_PARAMS);
    const g450 = computeGeometry(450, DEFAULT_PARAMS);

    expect(Math.abs(g270.s - 0.046307) / 0.046307).toBeLessThanOrEqual(1e-3);
    expect(Math.abs(g450.s - 0.046307) / 0.046307).toBeLessThanOrEqual(1e-3);

    expect(Math.abs(g270.V - 283.03e-6) / 283.03e-6).toBeLessThanOrEqual(1e-3);
    expect(Math.abs(g450.V - 283.03e-6) / 283.03e-6).toBeLessThanOrEqual(1e-3);
  });

  it('sincroniza la apertura de las válvulas de admisión y escape según la sección 6', () => {
    const v90 = computeValves(90);
    expect(v90.intakeOpen).toBe(true);
    expect(v90.exhaustOpen).toBe(false);
    expect(v90.intakeLift).toBeGreaterThan(0.005);
    expect(v90.exhaustLift).toBe(0);

    const v270 = computeValves(270);
    expect(v270.intakeOpen).toBe(false);
    expect(v270.exhaustOpen).toBe(false);

    const v450 = computeValves(450);
    expect(v450.intakeOpen).toBe(false);
    expect(v450.exhaustOpen).toBe(false);

    const v630 = computeValves(630);
    expect(v630.intakeOpen).toBe(false);
    expect(v630.exhaustOpen).toBe(true);
    expect(v630.exhaustLift).toBeGreaterThan(0.005);
    expect(v630.camAngleDeg).toBeCloseTo(315, 5);
  });

  it('compara correctamente s(theta) con el Movimiento Armónico Simple s_mas(theta) = a*(1 - cos(t))', () => {
    // En PMS (0°) y PMI (180°) ambos coinciden exactamente
    expect(Math.abs(s(0) - s_mas(0))).toBeLessThanOrEqual(1e-12);
    expect(Math.abs(s(180) - s_mas(180))).toBeLessThanOrEqual(1e-12);

    // En 90° y 270°, s_mas = a = 0.04 m, mientras que s(270°) = 0.046307 m (desviación +6.307 mm)
    const g270 = computeGeometry(270, DEFAULT_PARAMS);
    expect(g270.s_mas).toBeCloseTo(0.04, 9);
    expect(g270.delta_mas).toBeCloseTo(0.006307, 5);
  });
});