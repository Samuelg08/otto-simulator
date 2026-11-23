import { DEFAULT_PARAMS } from '../model/geometry.js';

/**
 * Construye los controles activos, sincroniza presets, actualiza las lecturas instantáneas
 * (θ, fase, V, p, T, Wacum), las lecturas por ciclo (Qin, Qout, Wneto, η, P) y la tabla 1–4.
 * Fuente de verdad: Secciones 4, 6, 7, 8 y 9 de la Ficha Técnica.
 */
export function createPanel({
  controlsContainer,
  readoutContainer,
  energyContainer,
  statesTableContainer,
  phaseDotEl,
  phaseTextEl,
  thetaReadoutEl,
  camSpeedBadgeEl,
  thermalBadgeEl,
  thermalMarkerEl,
  onParamChange,
  onSelectState
}) {
  const kappaOptions = [0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1];

  const jumpBandEl = document.getElementById('thermal-jump-band');
  const tickT2El = document.getElementById('thermal-state-t2');
  const tickT3El = document.getElementById('thermal-state-t3');
  const tickT4El = document.getElementById('thermal-state-t4');
  const peaksNoteEl = document.getElementById('thermal-peaks-note');

  controlsContainer.innerHTML = `
    <div class="control-row">
      <div class="control-label-line">
        <span class="control-name">Razón de compresión (rc) — Mueve culata</span>
        <span id="val-rc" class="control-value">${DEFAULT_PARAMS.rc.toFixed(1)}</span>
      </div>
      <input id="ctrl-rc" type="range" min="4" max="14" step="0.5" value="${DEFAULT_PARAMS.rc}" />
    </div>

    <div class="control-row">
      <div class="control-label-line">
        <span class="control-name">Calor aportado por ciclo (Qin)</span>
        <span id="val-qin" class="control-value">${DEFAULT_PARAMS.Qin} J</span>
      </div>
      <input id="ctrl-qin" type="range" min="200" max="800" step="50" value="${DEFAULT_PARAMS.Qin}" />
    </div>

    <div class="control-row">
      <div class="control-label-line">
        <span class="control-name">Velocidad de giro (N)</span>
        <span id="val-n" class="control-value">${DEFAULT_PARAMS.N} rpm</span>
      </div>
      <input id="ctrl-n" type="range" min="500" max="6000" step="100" value="${DEFAULT_PARAMS.N}" />
    </div>

    <div class="control-row">
      <div class="control-label-line">
        <span class="control-name">Factor de cámara lenta (kappa)</span>
        <span id="val-kappa" class="control-value">x${DEFAULT_PARAMS.kappa} (180 °/s)</span>
      </div>
      <select id="ctrl-kappa" class="control-select">
        ${kappaOptions
          .map(
            (k) =>
              `<option value="${k}" ${k === DEFAULT_PARAMS.kappa ? 'selected' : ''}>x${k}</option>`
          )
          .join('')}
      </select>
    </div>

    <div class="fixed-params-note">
      <strong>Fijos (SI):</strong>
      B = ${DEFAULT_PARAMS.B.toFixed(3)} m · L = ${DEFAULT_PARAMS.L.toFixed(3)} m ·
      a = ${DEFAULT_PARAMS.a.toFixed(3)} m · lb = ${DEFAULT_PARAMS.lb.toFixed(3)} m ·
      hp = ${DEFAULT_PARAMS.hp.toFixed(3)} m · p1 = 100 kPa · T1 = 300 K · γ = 1.4
    </div>
  `;

  const rcInput = controlsContainer.querySelector('#ctrl-rc');
  const rcVal = controlsContainer.querySelector('#val-rc');
  const qinInput = controlsContainer.querySelector('#ctrl-qin');
  const qinVal = controlsContainer.querySelector('#val-qin');
  const nInput = controlsContainer.querySelector('#ctrl-n');
  const nVal = controlsContainer.querySelector('#val-n');
  const kappaSelect = controlsContainer.querySelector('#ctrl-kappa');
  const kappaVal = controlsContainer.querySelector('#val-kappa');

  function refreshControlLabels(params) {
    const omegaDegPerSec = 6 * params.N * params.kappa;
    rcVal.textContent = `${params.rc.toFixed(1)}`;
    qinVal.textContent = `${params.Qin} J`;
    nVal.textContent = `${params.N} rpm`;
    kappaVal.textContent = `x${params.kappa} (${omegaDegPerSec.toFixed(0)} °/s)`;
  }

  function setControlValues(params) {
    rcInput.value = String(params.rc);
    qinInput.value = String(params.Qin);
    nInput.value = String(params.N);
    kappaSelect.value = String(params.kappa);
    refreshControlLabels(params);
  }

  function emitChange(changedKey) {
    const nextParams = {
      rc: Number(rcInput.value),
      Qin: Number(qinInput.value),
      N: Number(nInput.value),
      kappa: Number(kappaSelect.value)
    };
    refreshControlLabels(nextParams);

    if (onParamChange) {
      onParamChange(nextParams, changedKey);
    }
  }

  rcInput.addEventListener('input', () => emitChange('rc'));
  qinInput.addEventListener('input', () => emitChange('Qin'));
  nInput.addEventListener('input', () => emitChange('N'));
  kappaSelect.addEventListener('change', () => emitChange('kappa'));

  // 1. Lecturas instantáneas obligatorias (Sección 9)
  readoutContainer.innerHTML = `
    <div class="readout-item">
      <span class="readout-label">Volumen V(θ)</span>
      <span id="rd-v" class="readout-val">50.27 cm³</span>
    </div>
    <div class="readout-item">
      <span class="readout-label">Presión p(θ)</span>
      <span id="rd-p" class="readout-val">100.0 kPa</span>
    </div>
    <div class="readout-item">
      <span class="readout-label">Temperatura T(θ)</span>
      <span id="rd-t" class="readout-val">300.0 K</span>
    </div>
    <div class="readout-item">
      <span class="readout-label">Trabajo acum. Wacum(θ)</span>
      <span id="rd-wacum" class="readout-val">+0.00 J</span>
    </div>
    <div class="readout-item">
      <span class="readout-label">Cámara hc / Culata</span>
      <span id="rd-hc" class="readout-val">0.010 / 0.210 m</span>
    </div>
    <div class="readout-item">
      <span class="readout-label">Proceso activo</span>
      <span id="rd-proc" class="readout-val">Isobárico a p1</span>
    </div>
  `;

  const rdV = readoutContainer.querySelector('#rd-v');
  const rdP = readoutContainer.querySelector('#rd-p');
  const rdT = readoutContainer.querySelector('#rd-t');
  const rdWacum = readoutContainer.querySelector('#rd-wacum');
  const rdHc = readoutContainer.querySelector('#rd-hc');
  const rdProc = readoutContainer.querySelector('#rd-proc');

  // 2. Cinta de lecturas por ciclo (Sección 9)
  energyContainer.innerHTML = `
    <div class="energy-chip">
      <span class="lbl">Qin</span>
      <span id="ec-qin" class="val">700.0 J</span>
    </div>
    <div class="energy-chip">
      <span class="lbl">Qout</span>
      <span id="ec-qout" class="val">290.7 J</span>
    </div>
    <div class="energy-chip">
      <span class="lbl">Wneto</span>
      <span id="ec-wneto" class="val">409.3 J</span>
    </div>
    <div class="energy-chip">
      <span class="lbl">Rend. η</span>
      <span id="ec-eta" class="val">58.48%</span>
    </div>
    <div class="energy-chip">
      <span class="lbl">Potencia P</span>
      <span id="ec-p" class="val">10.23 kW</span>
    </div>
  `;

  const ecQin = energyContainer.querySelector('#ec-qin');
  const ecQout = energyContainer.querySelector('#ec-qout');
  const ecWneto = energyContainer.querySelector('#ec-wneto');
  const ecEta = energyContainer.querySelector('#ec-eta');
  const ecP = energyContainer.querySelector('#ec-p');

  // 3. Tabla de Estados 1–4 (Sección 8.2 y 9)
  statesTableContainer.innerHTML = `
    <table class="states-table">
      <thead>
        <tr>
          <th>Estado</th>
          <th>Ángulo θ</th>
          <th>V (cm³)</th>
          <th>p (kPa / MPa)</th>
          <th>T (K)</th>
        </tr>
      </thead>
      <tbody>
        <tr data-state="1" data-theta="180" data-pre="false">
          <td><strong>1</strong> (Fin adm.)</td>
          <td>180°</td>
          <td id="st1-v">452.39</td>
          <td id="st1-p">100.0 kPa</td>
          <td id="st1-t">300.0</td>
        </tr>
        <tr data-state="2" data-theta="360" data-pre="true">
          <td><strong>2</strong> (Pre-chispa)</td>
          <td>360°⁻</td>
          <td id="st2-v">50.27</td>
          <td id="st2-p">2167.4 kPa</td>
          <td id="st2-t">722.5</td>
        </tr>
        <tr data-state="3" data-theta="360" data-pre="false">
          <td><strong>3</strong> (Post-chispa)</td>
          <td>360°</td>
          <td id="st3-v">50.27</td>
          <td id="st3-p">7737.8 kPa</td>
          <td id="st3-t">2579.3</td>
        </tr>
        <tr data-state="4" data-theta="540" data-pre="true">
          <td><strong>4</strong> (Pre-escape)</td>
          <td>540°⁻</td>
          <td id="st4-v">452.39</td>
          <td id="st4-p">357.0 kPa</td>
          <td id="st4-t">1071.0</td>
        </tr>
      </tbody>
    </table>
  `;

  const stCells = {
    1: {
      v: statesTableContainer.querySelector('#st1-v'),
      p: statesTableContainer.querySelector('#st1-p'),
      t: statesTableContainer.querySelector('#st1-t')
    },
    2: {
      v: statesTableContainer.querySelector('#st2-v'),
      p: statesTableContainer.querySelector('#st2-p'),
      t: statesTableContainer.querySelector('#st2-t')
    },
    3: {
      v: statesTableContainer.querySelector('#st3-v'),
      p: statesTableContainer.querySelector('#st3-p'),
      t: statesTableContainer.querySelector('#st3-t')
    },
    4: {
      v: statesTableContainer.querySelector('#st4-v'),
      p: statesTableContainer.querySelector('#st4-p'),
      t: statesTableContainer.querySelector('#st4-t')
    }
  };

  const stateRows = statesTableContainer.querySelectorAll('tbody tr');
  stateRows.forEach((row) => {
    row.addEventListener('click', () => {
      if (!onSelectState) return;
      const theta = Number(row.dataset.theta);
      const beforeJump = row.dataset.pre === 'true';
      onSelectState(theta, beforeJump);
    });
  });

  function formatPressure(pPa) {
    if (pPa >= 1e6) {
      return `${(pPa / 1e3).toFixed(1)} kPa (${(pPa / 1e6).toFixed(2)} MPa)`;
    }
    return `${(pPa / 1e3).toFixed(1)} kPa`;
  }

  function toScalePercent(tempK) {
    return Math.min(100, Math.max(0, ((tempK - 300) / (3200 - 300)) * 100));
  }

  function updateReadouts(thermoState, beforeJump = false) {
    const { phase, geometry, cycle, T, p, V, Wacum, cycleAngle } = thermoState;

    const angleSuffix =
      beforeJump && (cycleAngle === 360 || cycleAngle === 540) ? '⁻' : '';
    phaseDotEl.style.backgroundColor = phase.color;
    phaseDotEl.style.boxShadow = `0 0 8px ${phase.color}`;
    phaseTextEl.textContent = phase.name;
    thetaReadoutEl.textContent = `θ = ${cycleAngle.toFixed(1)}°${angleSuffix}`;

    if (camSpeedBadgeEl) {
      camSpeedBadgeEl.textContent = `Levas: ${geometry.valves.camAngleDeg.toFixed(1)}° (0.5x)`;
    }

    const pctT = toScalePercent(T);
    const pctT2 = toScalePercent(cycle.T2);
    const pctT3 = toScalePercent(cycle.T3);
    const pctT4 = toScalePercent(cycle.T4);

    if (thermalBadgeEl) thermalBadgeEl.textContent = `${T.toFixed(1)} K`;
    if (thermalMarkerEl) thermalMarkerEl.style.left = `${pctT.toFixed(2)}%`;
    if (tickT2El) tickT2El.style.left = `${pctT2.toFixed(2)}%`;
    if (tickT3El) tickT3El.style.left = `${pctT3.toFixed(2)}%`;
    if (tickT4El) tickT4El.style.left = `${pctT4.toFixed(2)}%`;
    if (jumpBandEl) {
      jumpBandEl.style.left = `${pctT2.toFixed(2)}%`;
      jumpBandEl.style.width = `${Math.max(0, pctT3 - pctT2).toFixed(2)}%`;
    }
    if (peaksNoteEl) {
      peaksNoteEl.textContent = `Salto ideal en 360°: T2 (${cycle.T2.toFixed(0)} K) ⇢ T3 (${cycle.T3.toFixed(0)} K) · En 540°: T4 (${cycle.T4.toFixed(0)} K) ⇢ T1 (300 K)`;
    }

    rdV.textContent = `${(V * 1e6).toFixed(2)} cm³`;
    rdP.textContent =
      p >= 1e6 ? `${(p / 1e6).toFixed(3)} MPa` : `${(p / 1e3).toFixed(1)} kPa`;
    rdT.textContent = `${T.toFixed(1)} K`;
    const signW = Wacum >= 0 ? '+' : '';
    rdWacum.textContent = `${signW}${Wacum.toFixed(2)} J`;
    rdHc.textContent = `${geometry.hc.toFixed(4)} / ${geometry.y_culata.toFixed(3)} m`;
    rdProc.textContent = phase.process;

    ecQin.textContent = `${cycle.Qin.toFixed(1)} J`;
    ecQout.textContent = `${cycle.Qout.toFixed(1)} J`;
    ecWneto.textContent = `${cycle.Wneto.toFixed(1)} J`;
    ecEta.textContent = `${(cycle.eta * 100).toFixed(2)}%`;
    ecP.textContent = `${(cycle.P / 1e3).toFixed(2)} kW`;

    for (const sIdx of [1, 2, 3, 4]) {
      const st = cycle.states[sIdx];
      stCells[sIdx].v.textContent = (st.V * 1e6).toFixed(2);
      stCells[sIdx].p.textContent = formatPressure(st.p);
      stCells[sIdx].t.textContent = st.T.toFixed(1);
    }

    stateRows.forEach((row) => {
      const rTheta = Number(row.dataset.theta);
      const rPre = row.dataset.pre === 'true';
      const isMatch =
        Math.abs(cycleAngle - rTheta) < 0.3 && Boolean(beforeJump) === rPre;
      row.classList.toggle('active-state-row', isMatch);
    });
  }

  return {
    updateReadouts,
    setControlValues
  };
}