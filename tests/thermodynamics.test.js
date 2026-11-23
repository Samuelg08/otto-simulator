import { describe, it, expect } from 'vitest';
import { DEFAULT_PARAMS } from '../src/model/geometry.js';
import {
  computeCycleMetrics,
  computeStateAtTheta,
  integrateCycleWorkNumerically
} from '../src/model/thermodynamics.js';

/**
 * Helper para calcular el error relativo |calculado - esperado| / |esperado|.
 */
function relError(actual, expected) {
  return Math.abs(actual - expected) / Math.abs(expected);
}

describe('Sección 8 y Sección 10 — Modelo Termodinámico del Ciclo Otto Ideal', () => {
  it('Criterio 1 (Sección 8.1, 8.2 y 8.3): reproduce estados, energías, eta y potencia de referencia (error <= 0.1 %)', () => {
    const c = computeCycleMetrics(DEFAULT_PARAMS);

    // 8.1 Gas: n*cv = 0.37699 J/K, n = 0.018138 mol
    expect(relError(c.n_cv, 0.37699)).toBeLessThanOrEqual(1e-3);
    expect(relError(c.n, 0.018138)).toBeLessThanOrEqual(1e-3);

    // 8.2 Estado 1 (θ = 180°): V = 452.39 cm³, p = 100.0 kPa, T = 300.0 K
    expect(relError(c.states[1].V * 1e6, 452.39)).toBeLessThanOrEqual(1e-3);
    expect(relError(c.states[1].p / 1e3, 100.0)).toBeLessThanOrEqual(1e-3);
    expect(relError(c.states[1].T, 300.0)).toBeLessThanOrEqual(1e-3);

    // 8.2 Estado 2 (θ = 360°⁻): V = 50.27 cm³, p = 2167.4 kPa, T = 722.5 K
    expect(relError(c.states[2].V * 1e6, 50.27)).toBeLessThanOrEqual(1e-3);
    expect(relError(c.states[2].p / 1e3, 2167.4)).toBeLessThanOrEqual(1e-3);
    expect(relError(c.states[2].T, 722.5)).toBeLessThanOrEqual(1e-3);

    // 8.2 Estado 3 (θ = 360°): V = 50.27 cm³, p = 7737.8 kPa, T = 2579.3 K
    expect(relError(c.states[3].V * 1e6, 50.27)).toBeLessThanOrEqual(1e-3);
    expect(relError(c.states[3].p / 1e3, 7737.8)).toBeLessThanOrEqual(1e-3);
    expect(relError(c.states[3].T, 2579.3)).toBeLessThanOrEqual(1e-3);

    // 8.2 Estado 4 (θ = 540°⁻): V = 452.39 cm³, p = 357.0 kPa, T = 1071.0 K
    expect(relError(c.states[4].V * 1e6, 452.39)).toBeLessThanOrEqual(1e-3);
    expect(relError(c.states[4].p / 1e3, 357.0)).toBeLessThanOrEqual(1e-3);
    expect(relError(c.states[4].T, 1071.0)).toBeLessThanOrEqual(1e-3);

    // 8.3 Energía por ciclo: Qin = 700.0 J, Qout = 290.7 J, W12 = -159.3 J, W34 = +568.6 J, Wneto = 409.3 J
    expect(relError(c.Qin, 700.0)).toBeLessThanOrEqual(1e-3);
    expect(relError(c.Qout, 290.7)).toBeLessThanOrEqual(1e-3);
    expect(relError(c.W12, -159.3)).toBeLessThanOrEqual(1e-3);
    expect(relError(c.W34, 568.6)).toBeLessThanOrEqual(1e-3);
    expect(relError(c.Wneto, 409.3)).toBeLessThanOrEqual(1e-3);

    // 8.3 Rendimiento eta = 58.48 % (tolerancia <= 0.05 puntos porcentuales)
    expect(Math.abs(c.eta * 100 - 58.48)).toBeLessThanOrEqual(0.05);

    // 8.3 Potencia a 3000 rpm: P = 10.23 kW
    expect(relError(c.P / 1e3, 10.23)).toBeLessThanOrEqual(1e-3);
  });

  it('Criterio 1 (Sección 8.4, 8.5 y 8.6): reproduce puntos intermedios, trabajo acumulado y tabla eta(rc)', () => {
    // 8.4 Puntos de control intermedios: θ = 270° y θ = 450°
    const s270 = computeStateAtTheta(270, DEFAULT_PARAMS);
    expect(relError(s270.V * 1e6, 283.03)).toBeLessThanOrEqual(1e-3);
    expect(relError(s270.p / 1e3, 192.8)).toBeLessThanOrEqual(1e-3);
    expect(relError(s270.T, 361.9)).toBeLessThanOrEqual(1e-3);

    const s450 = computeStateAtTheta(450, DEFAULT_PARAMS);
    expect(relError(s450.V * 1e6, 283.03)).toBeLessThanOrEqual(1e-3);
    expect(relError(s450.p / 1e3, 688.4)).toBeLessThanOrEqual(1e-3);
    expect(relError(s450.T, 1292.0)).toBeLessThanOrEqual(1e-3);

    // 8.5 Trabajo acumulado Wacum
    const w180 = computeStateAtTheta(180, DEFAULT_PARAMS).Wacum;
    const w360Pre = computeStateAtTheta(360, DEFAULT_PARAMS, { beforeJump: true }).Wacum;
    const w540Pre = computeStateAtTheta(540, DEFAULT_PARAMS, { beforeJump: true }).Wacum;
    const w720 = computeStateAtTheta(720, DEFAULT_PARAMS).Wacum;

    expect(relError(w180, 40.21)).toBeLessThanOrEqual(1e-3);
    expect(relError(w360Pre, -119.06)).toBeLessThanOrEqual(1e-3);
    expect(relError(w540Pre, 449.54)).toBeLessThanOrEqual(1e-3);
    expect(relError(w720, 409.33)).toBeLessThanOrEqual(1e-3);

    // 8.6 Rendimiento según rc (tolerancia <= 0.05 puntos porcentuales)
    const expectedEtaTable = [
      { rc: 4, etaPct: 42.57 },
      { rc: 6, etaPct: 51.16 },
      { rc: 8, etaPct: 56.47 },
      { rc: 9, etaPct: 58.48 },
      { rc: 10, etaPct: 60.19 },
      { rc: 12, etaPct: 62.99 },
      { rc: 14, etaPct: 65.20 }
    ];

    for (const row of expectedEtaTable) {
      const { eta } = computeCycleMetrics({ ...DEFAULT_PARAMS, rc: row.rc });
      expect(Math.abs(eta * 100 - row.etaPct)).toBeLessThanOrEqual(0.05);
    }
  });

  it('Criterio 2: verifica el cierre exacto del ciclo en θ = 720° respecto a θ = 0° y la convención de saltos', () => {
    const st0 = computeStateAtTheta(0, DEFAULT_PARAMS);
    const st720 = computeStateAtTheta(720, DEFAULT_PARAMS);

    expect(Math.abs(st720.V - st0.cycle.Vc)).toBeLessThanOrEqual(1e-12);
    expect(Math.abs(st720.p - st0.cycle.p1)).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(st720.T - st0.cycle.T1)).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(st0.Wacum - 0)).toBeLessThanOrEqual(1e-12);
    expect(relError(st720.Wacum, st720.Wneto)).toBeLessThanOrEqual(1e-9);

    // En θ = 360° y 540° por defecto se evalúan los estados posteriores al salto (estados 3 y 1)
    const st360Post = computeStateAtTheta(360, DEFAULT_PARAMS);
    expect(relError(st360Post.p, st360Post.cycle.p3)).toBeLessThanOrEqual(1e-12);
    expect(relError(st360Post.T, st360Post.cycle.T3)).toBeLessThanOrEqual(1e-12);

    const st540Post = computeStateAtTheta(540, DEFAULT_PARAMS);
    expect(relError(st540Post.p, st540Post.cycle.p1)).toBeLessThanOrEqual(1e-12);
    expect(relError(st540Post.T, st540Post.cycle.T1)).toBeLessThanOrEqual(1e-12);
  });

  it('Criterio 3: cumple la ecuación de estado del gas ideal p*V = n*R*T para todo θ (error relativo <= 1e-9)', () => {
    for (let theta = 0; theta <= 720; theta += 5) {
      const st = computeStateAtTheta(theta, DEFAULT_PARAMS);
      const lhs = st.p * st.V;
      const rhs = st.n * st.R * st.T;
      expect(relError(lhs, rhs)).toBeLessThanOrEqual(1e-9);
    }

    // También en los instantes inmediatamente anteriores al salto (360°⁻ y 540°⁻)
    for (const jumpAngle of [360, 540]) {
      const stPre = computeStateAtTheta(jumpAngle, DEFAULT_PARAMS, { beforeJump: true });
      expect(relError(stPre.p * stPre.V, stPre.n * stPre.R * stPre.T)).toBeLessThanOrEqual(1e-9);
    }
  });

  it('Criterio 4: mantiene constantes los invariantes adiabáticos p*V^gamma y T*V^(gamma-1) en 180°–360°⁻ y 360°–540°⁻ (error <= 1e-9)', () => {
    const gamma = DEFAULT_PARAMS.gamma;

    // Compresión adiabática 1 -> 2 (180° a 360°⁻)
    const refComp = computeStateAtTheta(180, DEFAULT_PARAMS);
    const pVgammaCompRef = refComp.p * Math.pow(refComp.V, gamma);
    const TVgammaCompRef = refComp.T * Math.pow(refComp.V, gamma - 1);

    for (let theta = 185; theta <= 360; theta += 5) {
      const is360 = theta === 360;
      const st = computeStateAtTheta(theta, DEFAULT_PARAMS, { beforeJump: is360 });
      const pVg = st.p * Math.pow(st.V, gamma);
      const TVg = st.T * Math.pow(st.V, gamma - 1);

      expect(relError(pVg, pVgammaCompRef)).toBeLessThanOrEqual(1e-9);
      expect(relError(TVg, TVgammaCompRef)).toBeLessThanOrEqual(1e-9);
    }

    // Expansión adiabática 3 -> 4 (360° a 540°⁻)
    const refExp = computeStateAtTheta(360, DEFAULT_PARAMS, { beforeJump: false });
    const pVgammaExpRef = refExp.p * Math.pow(refExp.V, gamma);
    const TVgammaExpRef = refExp.T * Math.pow(refExp.V, gamma - 1);

    for (let theta = 365; theta <= 540; theta += 5) {
      const is540 = theta === 540;
      const st = computeStateAtTheta(theta, DEFAULT_PARAMS, { beforeJump: is540 });
      const pVg = st.p * Math.pow(st.V, gamma);
      const TVg = st.T * Math.pow(st.V, gamma - 1);

      expect(relError(pVg, pVgammaExpRef)).toBeLessThanOrEqual(1e-9);
      expect(relError(TVg, TVgammaExpRef)).toBeLessThanOrEqual(1e-9);
    }
  });

  it('Criterio 5: cumple la Primera Ley (Qin - Qout - Wneto = 0, error <= 1e-9) y coincide con la integral numérica de p dV (paso <= 0.5°, error <= 0.5 %)', () => {
    const c = computeCycleMetrics(DEFAULT_PARAMS);

    // Balance exacto de primera ley
    expect(Math.abs(c.Qin - c.Qout - c.Wneto) / c.Qin).toBeLessThanOrEqual(1e-9);
    expect(relError(c.eta, c.Wneto / c.Qin)).toBeLessThanOrEqual(1e-9);

    // Integral numérica de p dV sobre el lazo 1 -> 2 -> 3 -> 4 -> 1 con paso = 0.25° (<= 0.5°)
    const numericalWneto = integrateCycleWorkNumerically(DEFAULT_PARAMS, 0.25);
    expect(relError(numericalWneto, c.Wneto)).toBeLessThanOrEqual(5e-3); // <= 0.5 %
  });

  it('Criterio 6: verifica la independencia respecto a N y Qin según la sección 7 y 10.6', () => {
    const base = computeCycleMetrics({ ...DEFAULT_PARAMS, N: 3000, Qin: 700 });
    const doubleN = computeCycleMetrics({ ...DEFAULT_PARAMS, N: 6000, Qin: 700 });
    const halfN = computeCycleMetrics({ ...DEFAULT_PARAMS, N: 1500, Qin: 700 });

    // Variar N no cambia Wneto ni eta, y P es proporcional a N
    expect(relError(doubleN.Wneto, base.Wneto)).toBeLessThanOrEqual(1e-12);
    expect(relError(doubleN.eta, base.eta)).toBeLessThanOrEqual(1e-12);
    expect(relError(doubleN.P, base.P * 2)).toBeLessThanOrEqual(1e-12);
    expect(relError(halfN.P, base.P * 0.5)).toBeLessThanOrEqual(1e-12);

    // Variar N no cambia p(θ), T(θ) ni V(θ)
    for (const theta of [0, 90, 180, 270, 360, 450, 540, 630, 720]) {
      const sBase = computeStateAtTheta(theta, { ...DEFAULT_PARAMS, N: 3000 });
      const sFast = computeStateAtTheta(theta, { ...DEFAULT_PARAMS, N: 6000 });
      expect(Math.abs(sBase.V - sFast.V)).toBeLessThanOrEqual(1e-15);
      expect(Math.abs(sBase.p - sFast.p)).toBeLessThanOrEqual(1e-9);
      expect(Math.abs(sBase.T - sFast.T)).toBeLessThanOrEqual(1e-9);
    }

    // Variar Qin no cambia eta, T2 ni p2
    for (const qin of [200, 350, 500, 650, 800]) {
      const m = computeCycleMetrics({ ...DEFAULT_PARAMS, Qin: qin });
      expect(relError(m.eta, base.eta)).toBeLessThanOrEqual(1e-12);
      expect(relError(m.p2, base.p2)).toBeLessThanOrEqual(1e-12);
      expect(relError(m.T2, base.T2)).toBeLessThanOrEqual(1e-12);
    }
  });

  it('Criterio 8: valida todas las combinaciones de rc (4–14) y Qin (200–800 J) y los máximos en rc = 14, Qin = 800 J', () => {
    let maxP = 0;
    let maxT = 0;

    for (let rc = 4; rc <= 14; rc += 0.5) {
      for (let Qin = 200; Qin <= 800; Qin += 50) {
        const c = computeCycleMetrics({ ...DEFAULT_PARAMS, rc, Qin });

        expect(Number.isFinite(c.p3)).toBe(true);
        expect(Number.isFinite(c.T3)).toBe(true);
        expect(Number.isFinite(c.Wneto)).toBe(true);
        expect(c.p1).toBeGreaterThan(0);
        expect(c.p2).toBeGreaterThan(c.p1);
        expect(c.p3).toBeGreaterThan(c.p2);
        expect(c.p4).toBeGreaterThan(c.p1);
        expect(c.T3).toBeGreaterThan(c.T2);
        expect(c.Wneto).toBeGreaterThan(0);
        expect(c.eta).toBeGreaterThan(0);
        expect(c.eta).toBeLessThan(1);

        if (c.p3 > maxP) maxP = c.p3;
        if (c.T3 > maxT) maxT = c.T3;
      }
    }

    // Caso extremo rc = 14, Qin = 800 J: p_max ≈ 14.37 MPa, T_max ≈ 3079 K (Sección 9 y 10.8)
    expect(relError(maxP / 1e6, 14.37)).toBeLessThanOrEqual(1e-3);
    expect(relError(maxT, 3079)).toBeLessThanOrEqual(1e-3);
  });
});