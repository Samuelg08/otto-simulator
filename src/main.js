import { DEFAULT_PARAMS } from './model/geometry.js';
import {
  computeCycleMetrics,
  computeStateAtTheta
} from './model/thermodynamics.js';
import { createEngineScene } from './scene/engineScene.js';
import { createPVDiagram } from './ui/pvDiagram.js';
import { createKinematicsDiagram } from './ui/kinematicsDiagram.js';
import { createCycleDial } from './ui/cycleDial.js';
import { createPanel } from './ui/panel.js';
import {
  createPresentationState,
  getPresentationParams,
  resolvePresentationKeyAction
} from './presentation/presentationState.js';
import { createCameraAnimator } from './scene/cameraAnimator.js';
import { createPresentationHUD } from './presentation/presentationHUD.js';
import { createBlueprintOverlay } from './presentation/blueprintOverlay.js';
import 'katex/dist/katex.min.css';

/**
 * Punto de entrada y bucle principal de la aplicación (Hito 5 — Versión Final).
 * El ángulo theta es el único reloj del simulador y avanza a 6 * N * kappa grados por segundo.
 * Incluye:
 * - Pausa, paso a paso (±1°, ±15°), salto exacto a estados 1, 2 (360°⁻), 3 (360°), 4 (540°⁻) y 1' (540°).
 * - Presets pedagógicos con comparación automática mediante lazo fantasma.
 * - Atajos de teclado completos para defensa en vivo (Espacio, Flechas, 1–5, L, G, F, R).
 * - Modo pantalla completa y monitor de FPS en tiempo real (meta: 60 FPS).
 */
const PRESETS = {
  default: { rc: 9, Qin: 700, N: 3000, kappa: 0.01 },
  'low-rc': { rc: 4, Qin: 700, N: 3000, kappa: 0.01 },
  'max-load': { rc: 14, Qin: 800, N: 3000, kappa: 0.01 },
  'slow-mo': { rc: 9, Qin: 700, N: 3000, kappa: 0.005 }
};

const SCALE_MODES = ['auto', 'fixed', 'log'];

const state = {
  theta: 0,
  beforeJump: false,
  paused: false,
  params: { ...DEFAULT_PARAMS },
  ghostCycle: null,
  scaleModeIndex: 0
};

const viewportContainer = document.getElementById('viewport-container');
const controlsContainer = document.getElementById('controls-container');
const readoutContainer = document.getElementById('kinematics-readout');
const energyContainer = document.getElementById('cycle-energy-readout');
const statesTableContainer = document.getElementById('states-table-container');
const dialCanvas = document.getElementById('cycle-dial-canvas');
const kinematicsCanvas = document.getElementById('kinematics-canvas');
const pvCanvas = document.getElementById('pv-canvas');
const phaseDotEl = document.getElementById('phase-indicator-dot');
const phaseTextEl = document.getElementById('phase-indicator-text');
const thetaReadoutEl = document.getElementById('theta-readout');
const camSpeedBadgeEl = document.getElementById('cam-speed-badge');
const thermalBadgeEl = document.getElementById('thermal-live-badge');
const thermalMarkerEl = document.getElementById('thermal-marker');
const fpsBadgeEl = document.getElementById('fps-badge');
const fullscreenBtn = document.getElementById('btn-fullscreen');
const resetCamBtn = document.getElementById('btn-reset-camera');

// Controles de transporte, presets y escala
const playPauseBtn = document.getElementById('btn-play-pause');
const stepBack15Btn = document.getElementById('btn-step-back-15');
const stepBack1Btn = document.getElementById('btn-step-back-1');
const stepFwd1Btn = document.getElementById('btn-step-fwd-1');
const stepFwd15Btn = document.getElementById('btn-step-fwd-15');
const stateJumpBtns = document.querySelectorAll('.btn-state-jump');
const crankScrubber = document.getElementById('crank-scrubber');
const clearGhostBtn = document.getElementById('btn-clear-ghost');
const scaleBtns = document.querySelectorAll('.btn-scale');
const presetBtns = document.querySelectorAll('.btn-preset');

const engineScene = createEngineScene(viewportContainer);
const kinematicsDiagram = createKinematicsDiagram(kinematicsCanvas);
const pvDiagram = createPVDiagram(pvCanvas);

// Modo Keynote 3D (Presentación interactiva 10 min)
const btnTogglePresentation = document.getElementById('btn-toggle-presentation');
const presentationState = createPresentationState(false);
const cameraAnimator = createCameraAnimator(engineScene.camera, engineScene.controls);
const blueprintOverlay = createBlueprintOverlay({
  container: viewportContainer,
  document
});
const presentationHUD = createPresentationHUD({
  appContainer: document.getElementById('app'),
  sidebarElement: document.getElementById('sidebar'),
  viewportElement: viewportContainer,
  pvCanvas: pvCanvas,
  onStationSelect(idx) {
    navigateToStation(idx);
  },
  onTogglePause() {
    presentationState.togglePause();
    updateHUDStation();
  },
  onExit() {
    setPresentationActive(false);
  }
});

function updateHUDStation() {
  presentationHUD.renderStation(
    presentationState.getCurrentStationIndex(),
    presentationState.getCurrentStation(),
    presentationState.getTimerSeconds(),
    presentationState.isPaused()
  );
}

function navigateToStation(index) {
  presentationState.goToStation(index);
  const station = presentationState.getCurrentStation();
  cameraAnimator.transitionTo(station.camera.position, station.camera.target, 1.0);
  if (station.motion?.hasSpark || station.hasSpark) {
    state.theta = 360;
  }
  updateHUDStation();
  const effectiveParams = getPresentationParams(state.params);
  const instantThermo = computeStateAtTheta(state.theta, effectiveParams, { beforeJump: false });
  presentationHUD.updateLiveTelemetry(presentationState.getCurrentStationIndex(), instantThermo);
}

function setPresentationActive(active) {
  if (active) {
    presentationState.setActive(true);
    pvDiagram.setScaleMode('auto');
    presentationHUD.show();
    engineScene.resize?.();
    blueprintOverlay.show();
    navigateToStation(1);
  } else {
    presentationState.setActive(false);
    cameraAnimator.cancel();
    blueprintOverlay.hide();
    presentationHUD.hide();
    engineScene.resize?.();
    pvDiagram.setScaleMode(SCALE_MODES[state.scaleModeIndex]);
    engineScene.resetCamera();
  }
}

if (btnTogglePresentation) {
  btnTogglePresentation.addEventListener('click', () => {
    setPresentationActive(!presentationState.isActive());
  });
}

function setPaused(paused) {
  state.paused = paused;
  if (playPauseBtn) {
    playPauseBtn.textContent = paused ? '▶ Reanudar [Esp]' : '⏸ Pausar [Esp]';
    playPauseBtn.classList.toggle('paused', paused);
  }
}

function setManualTheta(newTheta, beforeJump = false) {
  setPaused(true);
  state.theta = ((newTheta % 720) + 720) % 720;
  state.beforeJump = beforeJump;
  if (crankScrubber) {
    crankScrubber.value = String(state.theta);
  }
}

function setScaleModeByName(modeName) {
  const idx = SCALE_MODES.indexOf(modeName);
  state.scaleModeIndex = idx >= 0 ? idx : 0;
  const activeMode = SCALE_MODES[state.scaleModeIndex];
  pvDiagram.setScaleMode(activeMode);
  scaleBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.scale === activeMode);
  });
}

function highlightMatchingPreset(params) {
  presetBtns.forEach((btn) => {
    const p = PRESETS[btn.dataset.preset];
    const match =
      p &&
      p.rc === params.rc &&
      p.Qin === params.Qin &&
      p.N === params.N &&
      p.kappa === params.kappa;
    btn.classList.toggle('active', Boolean(match));
  });
}

const cycleDial = createCycleDial(dialCanvas, {
  onScrubTheta(deg) {
    setManualTheta(deg, false);
  }
});

// Instantánea previa para el lazo fantasma al modificar rc o Qin
let snapshotBeforeDrag = computeCycleMetrics(state.params);

const panel = createPanel({
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
  onParamChange(updatedParams, changedKey) {
    if (changedKey === 'rc' || changedKey === 'Qin') {
      state.ghostCycle = snapshotBeforeDrag;
    }
    state.params = { ...state.params, ...updatedParams };
    highlightMatchingPreset(state.params);
  },
  onSelectState(theta, beforeJump) {
    setManualTheta(theta, beforeJump);
  }
});

// Capturar el ciclo previo justo al iniciar el arrastre de los sliders rc o Qin
const rcInputEl = document.getElementById('ctrl-rc');
const qinInputEl = document.getElementById('ctrl-qin');
for (const sliderEl of [rcInputEl, qinInputEl]) {
  if (sliderEl) {
    sliderEl.addEventListener('pointerdown', () => {
      snapshotBeforeDrag = computeCycleMetrics(state.params);
    });
  }
}

// Presets pedagógicos
function applyPreset(presetKey) {
  const target = PRESETS[presetKey];
  if (!target) return;

  if (target.rc !== state.params.rc || target.Qin !== state.params.Qin) {
    state.ghostCycle = computeCycleMetrics(state.params);
  }
  state.params = { ...state.params, ...target };
  snapshotBeforeDrag = computeCycleMetrics(state.params);
  panel.setControlValues(state.params);
  highlightMatchingPreset(state.params);
}

presetBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    applyPreset(btn.dataset.preset);
  });
});

if (clearGhostBtn) {
  clearGhostBtn.addEventListener('click', () => {
    state.ghostCycle = null;
    snapshotBeforeDrag = computeCycleMetrics(state.params);
  });
}

// Botones de escala del diagrama p–V (Auto, Fija 16 MPa, Log p)
scaleBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    setScaleModeByName(btn.dataset.scale);
  });
});

// Eventos de transporte: Pausa, Paso a paso y Saltos a estados 1, 2, 3, 4
playPauseBtn.addEventListener('click', () => {
  setPaused(!state.paused);
  if (!state.paused) {
    state.beforeJump = false;
  }
});

stepBack15Btn.addEventListener('click', () => setManualTheta(state.theta - 15, false));
stepBack1Btn.addEventListener('click', () => setManualTheta(state.theta - 1, false));
stepFwd1Btn.addEventListener('click', () => setManualTheta(state.theta + 1, false));
stepFwd15Btn.addEventListener('click', () => setManualTheta(state.theta + 15, false));

stateJumpBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetTheta = Number(btn.dataset.theta);
    const beforeJump = btn.dataset.pre === 'true';
    setManualTheta(targetTheta, beforeJump);
  });
});

crankScrubber.addEventListener('input', () => {
  setManualTheta(Number(crankScrubber.value), false);
});

// Pantalla completa y restablecimiento general
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

document.addEventListener('fullscreenchange', () => {
  if (fullscreenBtn) {
    fullscreenBtn.textContent = document.fullscreenElement
      ? '⛶ Salir pantalla completa [F]'
      : '⛶ Pantalla completa [F]';
  }
});

if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', toggleFullscreen);
}

function resetAll() {
  engineScene.resetCamera();
  state.params = { ...DEFAULT_PARAMS };
  state.ghostCycle = null;
  state.beforeJump = false;
  snapshotBeforeDrag = computeCycleMetrics(state.params);
  panel.setControlValues(state.params);
  highlightMatchingPreset(state.params);
  setScaleModeByName('auto');
}

resetCamBtn.addEventListener('click', resetAll);

// Atajos de teclado para la demostración en vivo
window.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
    if (e.code !== 'Space') return;
  }

  // Atajos del Modo Keynote 3D
  if (e.key === 'k' || e.key === 'K') {
    e.preventDefault();
    setPresentationActive(!presentationState.isActive());
    return;
  }

  if (presentationState.isActive()) {
    const action = resolvePresentationKeyAction(e.key);
    if (action) {
      e.preventDefault();
      if (action.type === 'next') {
        presentationState.nextStation();
        navigateToStation(presentationState.getCurrentStationIndex());
      } else if (action.type === 'prev') {
        presentationState.prevStation();
        navigateToStation(presentationState.getCurrentStationIndex());
      } else if (action.type === 'station') {
        navigateToStation(action.station);
      } else if (action.type === 'togglePause') {
        presentationState.togglePause();
        updateHUDStation();
      } else if (action.type === 'exit') {
        setPresentationActive(false);
      }
      return;
    }
    if (e.key !== 'f' && e.key !== 'F') {
      return;
    }
  }

  switch (e.key) {
    case ' ':
      e.preventDefault();
      setPaused(!state.paused);
      if (!state.paused) state.beforeJump = false;
      break;
    case 'ArrowLeft':
      e.preventDefault();
      setManualTheta(state.theta - (e.shiftKey ? 15 : 1), false);
      break;
    case 'ArrowRight':
      e.preventDefault();
      setManualTheta(state.theta + (e.shiftKey ? 15 : 1), false);
      break;
    case '1':
      setManualTheta(180, false);
      break;
    case '2':
      setManualTheta(360, true);
      break;
    case '3':
      setManualTheta(360, false);
      break;
    case '4':
      setManualTheta(540, true);
      break;
    case '5':
      setManualTheta(540, false);
      break;
    case 'l':
    case 'L': {
      const nextIdx = (state.scaleModeIndex + 1) % SCALE_MODES.length;
      setScaleModeByName(SCALE_MODES[nextIdx]);
      break;
    }
    case 'g':
    case 'G':
      state.ghostCycle = null;
      snapshotBeforeDrag = computeCycleMetrics(state.params);
      break;
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
    case 'r':
    case 'R':
      resetAll();
      break;
    default:
      break;
  }
});

// Arrastre directo del cigüeñal en el visor 3D manteniendo Shift + clic izquierdo
let isDraggingCrank3D = false;
let lastPointerX = 0;

viewportContainer.addEventListener(
  'pointerdown',
  (e) => {
    if (!e.shiftKey) return;
    isDraggingCrank3D = true;
    lastPointerX = e.clientX;
    setPaused(true);
    viewportContainer.setPointerCapture(e.pointerId);
    e.stopPropagation();
  },
  true
);

viewportContainer.addEventListener(
  'pointermove',
  (e) => {
    if (!isDraggingCrank3D) return;
    const dx = e.clientX - lastPointerX;
    lastPointerX = e.clientX;
    setManualTheta(state.theta + dx * 1.2, false);
    e.stopPropagation();
  },
  true
);

viewportContainer.addEventListener(
  'pointerup',
  (e) => {
    if (!isDraggingCrank3D) return;
    isDraggingCrank3D = false;
    viewportContainer.releasePointerCapture(e.pointerId);
    e.stopPropagation();
  },
  true
);

// Monitor de FPS (promedio cada 0.5 s)
let frameCount = 0;
let fpsAccumTime = 0;
let lastTime = performance.now();

function animate(now) {
  const rawDt = (now - lastTime) / 1000;
  const dtSeconds = Math.min(rawDt, 0.1);
  lastTime = now;

  frameCount += 1;
  fpsAccumTime += rawDt;
  if (fpsAccumTime >= 0.5) {
    const fps = Math.round(frameCount / fpsAccumTime);
    if (fpsBadgeEl) {
      fpsBadgeEl.textContent = `${fps} FPS`;
      fpsBadgeEl.classList.toggle('fps-warn', fps < 45);
    }
    frameCount = 0;
    fpsAccumTime = 0;
  }

  const isPresentation = presentationState.isActive();
  const activeParams = isPresentation ? getPresentationParams(state.params) : state.params;

  if (isPresentation) {
    presentationState.tickTimer(dtSeconds);
    const omegaDegPerSec = 6 * activeParams.N * activeParams.kappa;
    state.theta = presentationState.computeTheta(state.theta, dtSeconds, omegaDegPerSec);
    state.beforeJump = false;
    cameraAnimator.update(dtSeconds);
  } else if (!state.paused) {
    // Velocidad angular mostrada = 6 * N * kappa grados por segundo (Sección 4)
    const omegaDegPerSec = 6 * activeParams.N * activeParams.kappa;
    state.theta = (state.theta + omegaDegPerSec * dtSeconds) % 720;
    state.beforeJump = false;
    if (crankScrubber) {
      crankScrubber.value = String(state.theta.toFixed(1));
    }
  }

  // Estado termodinámico y geométrico puro en función de (theta, activeParams, beforeJump)
  const thermoState = computeStateAtTheta(state.theta, activeParams, {
    beforeJump: state.beforeJump
  });

  // Actualizar escena 3D, dial, lecturas, tabla y diagramas 2D
  engineScene.update({
    ...thermoState.geometry,
    thermo: thermoState
  });

  if (isPresentation) {
    const activeStation = presentationState.getCurrentStationIndex();
    presentationHUD.updateLiveTelemetry(activeStation, thermoState);
    blueprintOverlay.update(
      activeStation,
      thermoState,
      engineScene.projectWorldToScreen,
      {
        width: viewportContainer.clientWidth,
        height: viewportContainer.clientHeight
      }
    );
  }

  cycleDial.draw(thermoState);
  panel.updateReadouts(thermoState, state.beforeJump);
  kinematicsDiagram.draw(thermoState.geometry);
  pvDiagram.draw(thermoState, isPresentation ? null : state.ghostCycle);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);