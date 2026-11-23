import { describe, it, expect } from 'vitest';
import {
  createPresentationState,
  STATIONS,
  getPresentationParams,
  computePresentationLiveMetrics,
  resolvePresentationKeyAction
} from '../src/presentation/presentationState.js';
import { DEFAULT_PARAMS } from '../src/model/geometry.js';
import { computeStateAtTheta } from '../src/model/thermodynamics.js';

describe('presentationState · Máquina de estados de los 10 minutos', () => {
  it('contiene exactamente 7 estaciones con todos los campos obligatorios y valores físicos', () => {
    expect(STATIONS).toHaveLength(7);
    for (const st of STATIONS) {
      expect(st.id).toBeDefined();
      expect(st.title).toBeDefined();
      expect(st.badgeColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(st.camera).toHaveProperty('position');
      expect(st.camera).toHaveProperty('target');
      expect(st.motion).toBeDefined();
      expect(Array.isArray(st.equations)).toBe(true);
      expect(st.equations.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(st.importantPoints)).toBe(true);
      expect(st.importantPoints.length).toBeGreaterThanOrEqual(2);
    }
    // Verificar inclusión de puntos de la profesora en estaciones 2, 4 y 7 (y coherencia en 6)
    expect(STATIONS[1].physicsNote).toContain('Fuerza externa periódica no armónica');
    expect(STATIONS[3].physicsNote).toContain('Detonación prematura');
    expect(STATIONS[6].physicsNote).toContain('partículas');
    expect(STATIONS[6].physicsNote).toContain('choca');
    const cues7Text = STATIONS[6].cues.map((c) => c.text).join(' ').toLowerCase();
    expect(cues7Text).toContain('partículas');
    expect(cues7Text).toContain('chocan a los lados');
    expect(cues7Text).not.toContain('2ª ley');
    expect(cues7Text).not.toContain('segunda ley');
    const imp6Text = STATIONS[5].importantPoints.map((p) => p.explanation).join(' ').toLowerCase();
    expect(imp6Text).not.toContain('segunda ley');
  });

  it('inicia inactivo en estación 1 y navega secuencialmente con clamping', () => {
    const p = createPresentationState(false);
    expect(p.isActive()).toBe(false);
    p.toggleActive();
    expect(p.isActive()).toBe(true);
    expect(p.getCurrentStationIndex()).toBe(1);

    p.prevStation(); // Clamping inferior
    expect(p.getCurrentStationIndex()).toBe(1);

    for (let i = 0; i < 10; i++) p.nextStation();
    expect(p.getCurrentStationIndex()).toBe(7); // Clamping superior
  });

  it('permite navegación directa con goToStation con clamping', () => {
    const p = createPresentationState(true);
    p.goToStation(4);
    expect(p.getCurrentStationIndex()).toBe(4);
    expect(p.getCurrentStation().title).toContain('Compresión');

    p.goToStation(99);
    expect(p.getCurrentStationIndex()).toBe(7);

    p.goToStation(-5);
    expect(p.getCurrentStationIndex()).toBe(1);
  });

  it('calcula theta en bucle didáctico cerrado para las estaciones de fase (3, 4, 5, 6)', () => {
    const p = createPresentationState(true);
    p.goToStation(3); // Admisión: [0, 180)
    const st3 = p.getCurrentStation();
    expect(st3.motion.type).toBe('loop');
    expect(st3.motion.thetaStart).toBe(0);
    expect(st3.motion.thetaEnd).toBe(180);

    let theta = 179;
    theta = p.computeTheta(theta, 0.5, 20); // Debe volver a empezar cerca de 0
    expect(theta).toBeGreaterThanOrEqual(0);
    expect(theta).toBeLessThan(180);

    // Estación 4: Compresión [180, 360)
    p.goToStation(4);
    const st4 = p.getCurrentStation();
    expect(st4.motion.type).toBe('loop');
    expect(st4.motion.thetaStart).toBe(180);
    expect(st4.motion.thetaEnd).toBe(360);
    let thetaComp = 358;
    thetaComp = p.computeTheta(thetaComp, 0.5, 20); // 358 + 10 = 368 -> reinicia en 188
    expect(thetaComp).toBeGreaterThanOrEqual(180);
    expect(thetaComp).toBeLessThan(360);

    // Estación 5: Expansión [360, 540) con marca hasSpark
    p.goToStation(5);
    const st5 = p.getCurrentStation();
    expect(st5.motion.type).toBe('loop');
    expect(st5.motion.thetaStart).toBe(360);
    expect(st5.motion.thetaEnd).toBe(540);
    expect(st5.hasSpark).toBe(true);

    // Estación 6: Escape [540, 720)
    p.goToStation(6);
    const st6 = p.getCurrentStation();
    expect(st6.motion.type).toBe('loop');
    expect(st6.motion.thetaStart).toBe(540);
    expect(st6.motion.thetaEnd).toBe(720);
  });

  it('avanza theta en modo continuo para estaciones 1, 2 y 7 respetando el ciclo de 720°', () => {
    const p = createPresentationState(true);
    p.goToStation(1);
    expect(p.getCurrentStation().motion.type).toBe('continuous');
    expect(p.computeTheta(710, 1, 20)).toBe(10); // (710 + 20) % 720 = 10

    p.goToStation(7);
    expect(p.getCurrentStation().motion.type).toBe('continuous');
    expect(p.computeTheta(0, 1, 50)).toBe(50);
  });

  it('gestiona la pausa congelando el avance de theta y el cronómetro', () => {
    const p = createPresentationState(true);
    expect(p.isPaused()).toBe(false);
    p.togglePause();
    expect(p.isPaused()).toBe(true);

    // Theta no debe cambiar al estar pausado
    expect(p.computeTheta(120, 1, 30)).toBe(120);

    // Cronómetro no debe avanzar al estar pausado
    p.tickTimer(5);
    expect(p.getTimerSeconds()).toBe(0);

    p.togglePause();
    expect(p.isPaused()).toBe(false);
    p.tickTimer(5);
    expect(p.getTimerSeconds()).toBe(5);
  });

  it('gestiona el cronómetro de 10 minutos (600 s) con clamping y reset', () => {
    const p = createPresentationState(true);
    expect(p.getTimerSeconds()).toBe(0);

    p.tickTimer(100);
    expect(p.getTimerSeconds()).toBe(100);

    p.tickTimer(600); // 100 + 600 = 700 -> Clamped a 600
    expect(p.getTimerSeconds()).toBe(600);

    p.resetTimer();
    expect(p.getTimerSeconds()).toBe(0);
  });

  it('garantiza inmutabilidad en el array STATIONS', () => {
    expect(Object.isFrozen(STATIONS)).toBe(true);
    expect(Object.isFrozen(STATIONS[0])).toBe(true);
    expect(Object.isFrozen(STATIONS[1].camera)).toBe(true);
  });

  it('incluye campos Layout B (hookQuestion, 3 cues, blueprint, formulaCards, liveMetrics) en las 7 estaciones', () => {
    for (const st of STATIONS) {
      expect(typeof st.hookQuestion).toBe('string');
      expect(st.hookQuestion.length).toBeGreaterThan(10);
      expect(Array.isArray(st.cues)).toBe(true);
      expect(st.cues).toHaveLength(3);
      for (const cue of st.cues) {
        expect(cue.label).toBeTruthy();
        expect(cue.label).not.toBe('Qué ocurre');
        expect(cue.label).not.toBe('Gracias a qué');
        expect(cue.text).toBeTruthy();
      }
      expect(st.blueprint).toBeDefined();
      expect(typeof st.blueprint.type).toBe('string');
      expect(Array.isArray(st.formulaCards)).toBe(true);
      expect(st.formulaCards).toHaveLength(2);
      for (const card of st.formulaCards) {
        expect(card.eqNumber).toMatch(/^Ec\./);
        expect(card.title).toBeTruthy();
        expect(card.latex).toBeTruthy();
        expect(card.explanation).toBeTruthy();
        // Cada fórmula debe ser concisa para proyectarse grande sin scroll horizontal
        expect(card.latex.length).toBeLessThanOrEqual(85);
        expect(Array.isArray(card.terms)).toBe(true);
        expect(card.terms.length).toBeGreaterThanOrEqual(2);
      }
      expect(Array.isArray(st.liveMetrics)).toBe(true);
      expect(st.liveMetrics.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('utiliza exclusivamente las ecuaciones oficiales (1)–(17) del documento Ecuaciones Simulador Otto en formato grande y conciso sin desbordes', () => {
    // Estación 1: Ec. (2) y Ec. (3)-(4)
    expect(STATIONS[0].formulaCards[0].eqNumber).toBe('Ec. (2)');
    expect(STATIONS[0].formulaCards[0].latex).toContain('V_d = \\frac{\\pi}{4} B^2 L = 402.12');
    expect(STATIONS[0].formulaCards[1].eqNumber).toBe('Ec. (3) y (4)');
    expect(STATIONS[0].formulaCards[1].latex).toContain('r_c = \\frac{V_1}{V_c} = 9');

    // Estación 2: Ec. (7) y Ec. (1)
    expect(STATIONS[1].formulaCards[0].eqNumber).toBe('Ec. (7)');
    expect(STATIONS[1].formulaCards[0].latex).toContain('p_i = \\frac{n R T_i}{V_i}');
    expect(STATIONS[1].formulaCards[1].eqNumber).toBe('Ec. (1)');
    expect(STATIONS[1].formulaCards[1].latex).toContain('A_p = \\frac{\\pi}{4} B^2 = 50.27');

    // Estación 3: Ec. (5) y Ec. (4)
    expect(STATIONS[2].formulaCards[0].eqNumber).toBe('Ec. (5)');
    expect(STATIONS[2].formulaCards[0].latex).toContain('n = \\frac{p_1 V_1}{R T_1} = 0.01814');
    expect(STATIONS[2].formulaCards[1].eqNumber).toBe('Ec. (4)');
    expect(STATIONS[2].formulaCards[1].latex).toContain('V_1 = V_c + V_d = 452.39');

    // Estación 4: Ec. (9) y Ec. (4)
    expect(STATIONS[3].formulaCards[0].eqNumber).toBe('Ec. (9)');
    expect(STATIONS[3].formulaCards[0].latex).toContain('W_{12} = -n c_v (T_2 - T_1) = -159.3');
    expect(STATIONS[3].formulaCards[1].eqNumber).toBe('Ec. (4)');
    expect(STATIONS[3].formulaCards[1].latex).toContain('V_c = \\frac{V_d}{r_c - 1} = 50.27');

    // Estación 5: Ec. (10) y Ec. (11)
    expect(STATIONS[4].formulaCards[0].eqNumber).toBe('Ec. (10)');
    expect(STATIONS[4].formulaCards[0].latex).toContain('Q_{\\text{in}} = n c_v (T_3 - T_2) = 700.0');
    expect(STATIONS[4].formulaCards[1].eqNumber).toBe('Ec. (11)');
    expect(STATIONS[4].formulaCards[1].latex).toContain('W_{34} = +n c_v (T_3 - T_4) = +568.6');

    // Estación 6: Ec. (12) y Ec. (6)
    expect(STATIONS[5].formulaCards[0].eqNumber).toBe('Ec. (12)');
    expect(STATIONS[5].formulaCards[0].latex).toContain('Q_{\\text{out}} = n c_v (T_4 - T_1) = 290.7');
    expect(STATIONS[5].formulaCards[1].eqNumber).toBe('Ec. (6)');
    expect(STATIONS[5].formulaCards[1].latex).toContain('\\Delta U = n c_v \\Delta T');

    // Estación 7: Ec. (13)-(14) y Ec. (15)-(16)
    expect(STATIONS[6].formulaCards[0].eqNumber).toBe('Ec. (13) y (14)');
    expect(STATIONS[6].formulaCards[0].latex).toContain('W_{\\text{neto}} = Q_{\\text{in}} - Q_{\\text{out}} = +409.3');
    expect(STATIONS[6].formulaCards[1].eqNumber).toBe('Ec. (15) y (16)');
    expect(STATIONS[6].formulaCards[1].latex).toContain('\\eta = 1 - \\frac{Q_{\\text{out}}}{Q_{\\text{in}}} = 58.48\\%');
  });

  it('aísla los parámetros físicos nominales en getPresentationParams conservando kappa sin mutar entrada', () => {
    const freeParams = { ...DEFAULT_PARAMS, rc: 14, Qin: 800, N: 5500, kappa: 0.005 };
    const pres = getPresentationParams(freeParams);
    expect(pres.rc).toBe(9);
    expect(pres.Qin).toBe(700);
    expect(pres.N).toBe(3000);
    expect(pres.kappa).toBe(0.005);
    expect(freeParams.rc).toBe(14);

    const fallback = getPresentationParams({ kappa: -1 });
    expect(fallback.kappa).toBe(DEFAULT_PARAMS.kappa);
    expect(getPresentationParams(null).rc).toBe(9);
  });

  it('calcula métricas vivas por estación incluyendo W34(θ) continuo en Estación 5', () => {
    const s2Peak = computeStateAtTheta(360, DEFAULT_PARAMS, { beforeJump: false });
    const m2 = computePresentationLiveMetrics(2, s2Peak);
    expect(m2.F_gas.text).toBe('38.89 kN');
    expect(m2.delta_mas.text).toContain('mm');

    const s4End = computeStateAtTheta(360, DEFAULT_PARAMS, { beforeJump: true });
    const m4 = computePresentationLiveMetrics(4, s4End);
    expect(m4.T_inst.text).toBe('722.5 K');
    expect(m4.T_inst.alert).toBe('safe');
    expect(m4.p_inst.text).toBe('2167.4 kPa');

    const s5Start = computeStateAtTheta(360, DEFAULT_PARAMS, { beforeJump: false });
    const s5End = computeStateAtTheta(540, DEFAULT_PARAMS, { beforeJump: true });
    const m5Start = computePresentationLiveMetrics(5, s5Start);
    const m5End = computePresentationLiveMetrics(5, s5End);
    expect(m5Start.W34_theta.text).toBe('0.0 J');
    expect(m5Start.p_inst.text).toBe('7737.8 kPa');
    expect(m5End.W34_theta.text).toBe('+568.6 J');
    expect(m5End.p_inst.text).toBe('357.0 kPa');

    const s6Mid = computeStateAtTheta(630, DEFAULT_PARAMS);
    const m6 = computePresentationLiveMetrics(6, s6Mid);
    expect(m6.theta_leva.text).toBe('315.0°');
    expect(m6.hv_exhaust.text).toBe('5.5 mm');

    const m7 = computePresentationLiveMetrics(7, s5Start);
    expect(m7.Wneto.text).toBe('+409.3 J');
    expect(m7.eta.text).toBe('58.48 %');
    expect(m7.power.text).toBe('10.23 kW');
  });

  it('mapea todas las teclas de presentación sin fugas al modo libre', () => {
    expect(resolvePresentationKeyAction(' ')).toEqual({ type: 'next' });
    expect(resolvePresentationKeyAction('ArrowRight')).toEqual({ type: 'next' });
    expect(resolvePresentationKeyAction('PageDown')).toEqual({ type: 'next' });
    expect(resolvePresentationKeyAction('ArrowLeft')).toEqual({ type: 'prev' });
    expect(resolvePresentationKeyAction('PageUp')).toEqual({ type: 'prev' });
    expect(resolvePresentationKeyAction('1')).toEqual({ type: 'station', station: 1 });
    expect(resolvePresentationKeyAction('5')).toEqual({ type: 'station', station: 5 });
    expect(resolvePresentationKeyAction('7')).toEqual({ type: 'station', station: 7 });
    expect(resolvePresentationKeyAction('p')).toEqual({ type: 'togglePause' });
    expect(resolvePresentationKeyAction('P')).toEqual({ type: 'togglePause' });
    expect(resolvePresentationKeyAction('k')).toEqual({ type: 'exit' });
    expect(resolvePresentationKeyAction('Escape')).toEqual({ type: 'exit' });
    expect(resolvePresentationKeyAction('r')).toBeNull();
  });
});
