/**
 * Componente HUD Flotante "Neo Blueprint 3D · Layout B" con KaTeX y Telemetría Viva.
 *
 * Organiza la pantalla del proyector en tres zonas equilibradas:
 * - Izquierda (compacta): Pregunta Real + 3 viñetas cortas de guía hablada sutil.
 * - Centro (despejado): Motor monocilíndrico 3D + capa SVG Blueprint proyectada.
 * - Derecha (compacta): Fundamento Físico (KaTeX + chips cotidianos + lecturas vivas)
 *   y el Diagrama p–V visible en la Estación 7.
 */

import katex from 'katex';
import { computePresentationLiveMetrics } from './presentationState.js';

/**
 * Renderiza una cadena de LaTeX a HTML con KaTeX en modo bloque o en línea.
 *
 * @param {string} latex - Código LaTeX.
 * @param {boolean} [displayMode=true] - Modo bloque de visualización matemática.
 * @returns {string} Marcado HTML compilado por KaTeX.
 */
export function renderLatex(latex, displayMode = true) {
  if (!latex) return '';
  try {
    return katex.renderToString(String(latex).trim(), {
      displayMode,
      throwOnError: false
    });
  } catch (err) {
    return `<code>${latex}</code>`;
  }
}

/**
 * Formatea un conteo de segundos en una insignia visual de temporizador MM:SS / 10:00.
 *
 * @param {number} seconds - Segundos transcurridos de la presentación.
 * @returns {string} Texto formateado con ceros a la izquierda (ej. "01:35 / 10:00").
 */
export function formatTimeBadge(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '00:00 / 10:00';
  }
  const clamped = Math.min(Math.max(0, Math.floor(seconds)), 600);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(mins)}:${pad(secs)} / 10:00`;
}

/**
 * Limpia y estandariza cadenas de ecuaciones para visualización de reserva.
 *
 * @param {string} eq - Ecuación matemática.
 * @returns {string} Texto limpio sin macros TeX crudos.
 */
export function formatEquation(eq) {
  if (!eq) return '';
  let s = String(eq);
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)');
  s = s.replace(/\\cdot/g, '·');
  s = s.replace(/\\approx/g, '≈');
  s = s.replace(/\\quad/g, ' ');
  s = s.replace(/\\implies/g, '⟹');
  s = s.replace(/\\pi/g, 'π');
  s = s.replace(/\\theta/g, 'θ');
  s = s.replace(/\\lambda/g, 'λ');
  s = s.replace(/\\gamma/g, 'γ');
  s = s.replace(/\\omega/g, 'ω');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\%/g, '%');
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');
  s = s.replace(/[{}]/g, '');
  return s.trim();
}

/**
 * Construye el marcado HTML interno de las fórmulas KaTeX con numeración oficial Ec. (1)–(17),
 * título corto, ecuación principal grande sin scroll y leyenda compacta.
 */
function buildFormulasBodyHTML(stationData) {
  if (!stationData) return '';

  const cards =
    Array.isArray(stationData.formulaCards) && stationData.formulaCards.length > 0
      ? stationData.formulaCards
      : Array.isArray(stationData.equations) && stationData.equations.length > 0
        ? stationData.equations.map((eq) => ({ latex: eq, terms: [] }))
        : [];

  if (cards.length === 0) return '';

  return cards
    .map((card) => {
      const headerHTML =
        card.eqNumber || card.title
          ? `<div class="formula-card-header">
              ${card.eqNumber ? `<span class="formula-eq-badge">${card.eqNumber}</span>` : ''}
              ${card.title ? `<span class="formula-card-title">${card.title}</span>` : ''}
            </div>`
          : '';

      const explanationHTML = card.explanation
        ? `<p class="formula-explanation">${card.explanation}</p>`
        : '';

      const termsHTML =
        Array.isArray(card.terms) && card.terms.length > 0
          ? `<div class="formula-terms-row">
              ${card.terms
                .map(
                  (term) => `
                <span class="formula-term-chip">
                  <span class="term-symbol">${renderLatex(term.symbol, false)}</span>
                  <span class="term-meaning">${term.meaning || ''}</span>
                </span>`
                )
                .join('')}
            </div>`
          : '';

      return `
        <div class="station-equation-item katex-equation-box">
          ${headerHTML}
          <div class="formula-main-eq">
            ${renderLatex(card.latex, true)}
          </div>
          ${explanationHTML}
          ${termsHTML}
        </div>`;
    })
    .join('');
}

/**
 * Construye el marcado HTML de la tarjeta de Fundamento Físico con KaTeX real,
 * chips cotidianos y nodos de telemetría viva.
 *
 * @param {Object} stationData - Datos de la estación.
 * @returns {string} Marcado HTML estructurado.
 */
export function buildEquationsCardHTML(stationData) {
  const formulasHTML = buildFormulasBodyHTML(stationData);
  if (!formulasHTML) {
    return '';
  }

  const liveMetrics = Array.isArray(stationData.liveMetrics) ? stationData.liveMetrics : [];
  const liveHTML =
    liveMetrics.length > 0
      ? `<div class="hud-live-metrics">
          ${liveMetrics
            .map(
              (m) => `
            <div class="live-metric-chip">
              <span class="live-metric-label">${m.label || ''}</span>
              <span class="live-metric-value" data-live-metric="${m.key || ''}">--</span>
            </div>`
            )
            .join('')}
        </div>`
      : '';

  return `
    <div class="hud-card-header">
      <h3 class="hud-card-title">Fundamento Físico</h3>
    </div>
    <div class="hud-card-body hud-equations-body">
      ${formulasHTML}
    </div>
    ${liveHTML}
  `;
}

/**
 * Construye el marcado HTML de "Aspectos Importantes" como tarjetas/cuadritos individuales
 * con relieve visual, categoría destacada y justificación física rigurosa.
 *
 * @param {Object} stationData - Datos de la estación.
 * @returns {string} Marcado HTML estructurado.
 */
export function buildImportantCardHTML(stationData) {
  if (
    !stationData ||
    !Array.isArray(stationData.importantPoints) ||
    stationData.importantPoints.length === 0
  ) {
    return '';
  }
  const items = stationData.importantPoints
    .map((item) => {
      const isObj = typeof item === 'object' && item !== null;
      const category = isObj ? item.category || 'ASPECTO CLAVE' : 'ASPECTO CLAVE';
      const title = isObj ? item.title || '' : '';
      const text = isObj ? item.explanation || '' : String(item);

      return `
        <div class="hud-aspect-card important-point-item">
          <div class="aspect-card-header">
            <span class="aspect-badge">${category}</span>
            ${title ? `<h4 class="aspect-card-title">${title}</h4>` : ''}
          </div>
          <p class="aspect-card-body">${text}</p>
        </div>`;
    })
    .join('');

  return `
    <div class="hud-card-header">
      <h3 class="hud-card-title">Aspectos Importantes</h3>
    </div>
    <div class="hud-card-body hud-aspects-list">
      ${items}
    </div>
  `;
}

/**
 * Construye el marcado HTML compacto Layout B de la columna izquierda:
 * insignia de estación, Pregunta Real y 3 viñetas cortas de guía sutil.
 *
 * @param {Object} stationData - Datos de la estación (de STATIONS).
 * @returns {string} Marcado HTML estructurado.
 */
export function buildStationCardHTML(stationData) {
  if (!stationData) return '';

  const id = stationData.id ?? '';
  const title = stationData.title || '';
  const badgeColor = stationData.badgeColor || '#38bdf8';
  const hookQuestion = stationData.hookQuestion || '';
  const cues = Array.isArray(stationData.cues) ? stationData.cues : [];
  const description = stationData.description || '';

  const hookHTML = hookQuestion
    ? `<div class="hud-hook-block">
        <span class="hook-kicker">Idea Central</span>
        <p class="hook-question">${hookQuestion}</p>
       </div>`
    : '';

  const cuesHTML =
    cues.length > 0
      ? `<div class="hud-cues-list">
          ${cues
            .map(
              (cue, idx) => `
            <div class="hud-cue-item">
              <span class="hud-cue-step">${cue.step ?? idx + 1}</span>
              <div class="hud-cue-copy">
                <span class="hud-cue-label">${cue.label || ''}</span>
                <p class="hud-cue-text">${cue.text || ''}</p>
              </div>
            </div>`
            )
            .join('')}
        </div>`
      : description
        ? `<p class="station-description">${description}</p>`
        : '';

  return `
    <div class="station-card-inner">
      <div class="station-header">
        <div class="station-badge-row">
          <span class="station-phase-badge" style="background-color: ${badgeColor}; box-shadow: 0 0 12px ${badgeColor}55;">
            Estación ${id} de 7
          </span>
        </div>
        <h2 class="station-title">${title}</h2>
      </div>

      ${hookHTML}
      ${cuesHTML}
    </div>
  `;
}

/**
 * Gestor del HUD flotante para el Modo Presentación ("Keynote 3D").
 *
 * @param {Object} [options={}] - Configuración e inyecciones de dependencias DOM y callbacks.
 * @returns {Object} Instancia controladora con métodos show(), hide(), renderStation(), etc.
 */
export function createPresentationHUD(options = {}) {
  let opts = {};
  if (options && options.nodeType) {
    opts = { appContainer: options, pvCanvas: arguments[1] };
  } else if (typeof options === 'object' && options !== null) {
    opts = options;
  }

  const doc = opts.document || (typeof document !== 'undefined' ? document : null);
  if (!doc) {
    throw new Error('createPresentationHUD requiere acceso a un objeto document');
  }

  const appContainer = opts.appContainer || doc.getElementById('app') || doc.body;
  const sidebarElement = opts.sidebarElement || doc.getElementById('sidebar');
  const viewportElement =
    opts.viewportElement || doc.getElementById('viewport-container') || appContainer;
  const pvCanvas = opts.pvCanvas || doc.getElementById('pv-canvas');

  const onStationSelect =
    typeof opts.onStationSelect === 'function' ? opts.onStationSelect : () => {};
  const onTogglePause =
    typeof opts.onTogglePause === 'function' ? opts.onTogglePause : () => {};
  const onExit = typeof opts.onExit === 'function' ? opts.onExit : () => {};

  let visible = false;
  let lastRenderedStationIndex = null;
  let liveMetricNodes = {};
  let pvCanvasOriginalParent = null;
  let pvCanvasNextSibling = null;
  let sidebarOriginalDisplay = '';

  // Crear la estructura de capas del HUD
  const overlay = doc.createElement('div');
  overlay.className = 'presentation-hud-overlay';
  overlay.style.display = 'none';

  // Barra superior de navegación editorial
  const topBar = doc.createElement('header');
  topBar.className = 'hud-top-bar';

  // Marca / Identidad de la charla
  const brand = doc.createElement('div');
  brand.className = 'hud-brand';
  brand.innerHTML = `
    <span class="hud-brand-pill">DEFENSA FÍSICA 2</span>
    <span class="hud-author">Samuel Gallego Osorio · Ciclo Otto</span>
  `;
  topBar.appendChild(brand);

  // Navegación de los 7 puntos
  const stepper = doc.createElement('nav');
  stepper.className = 'hud-stepper';
  if (typeof stepper.setAttribute === 'function') {
    stepper.setAttribute('aria-label', 'Estaciones de la presentación');
  }

  const stepperDots = [];
  for (let i = 1; i <= 7; i++) {
    const dot = doc.createElement('button');
    dot.type = 'button';
    dot.className = `hud-stepper-dot${i === 1 ? ' active' : ''}`;
    dot.dataset.station = String(i);
    dot.textContent = String(i);
    dot.title = `Ir a Estación ${i}`;
    dot.addEventListener('click', () => {
      onStationSelect(i);
    });
    stepper.appendChild(dot);
    stepperDots.push(dot);
  }
  topBar.appendChild(stepper);

  // Controles superiores: Pausa y Salir (el cronómetro se oculta para quitar presión de tiempo)
  const topControls = doc.createElement('div');
  topControls.className = 'hud-top-controls';

  const timerBadge = doc.createElement('div');
  timerBadge.className = 'hud-timer-badge';
  timerBadge.style.display = 'none'; // Quitado para eliminar la presión de tiempo
  timerBadge.textContent = '00:00 / 10:00';
  topControls.appendChild(timerBadge);

  const pauseBtn = doc.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'hud-btn hud-btn-pause';
  pauseBtn.title = 'Pausar / Reanudar el ciclo [P]';
  pauseBtn.innerHTML = `
    <span class="hud-btn-icon">⏸</span>
    <span class="hud-btn-text">Pausar</span>
  `;
  pauseBtn.addEventListener('click', () => {
    onTogglePause();
  });
  topControls.appendChild(pauseBtn);

  const exitBtn = doc.createElement('button');
  exitBtn.type = 'button';
  exitBtn.className = 'hud-btn hud-btn-exit';
  exitBtn.title = 'Salir del Modo Presentación [K / Esc]';
  exitBtn.innerHTML = `
    <span class="hud-btn-icon">✕</span>
    <span class="hud-btn-text">Salir</span>
  `;
  exitBtn.addEventListener('click', () => {
    onExit();
  });
  topControls.appendChild(exitBtn);

  topBar.appendChild(topControls);
  overlay.appendChild(topBar);

  // Tarjeta principal izquierda glassmorphism (información pedagógica de la estación)
  const stationCard = doc.createElement('main');
  stationCard.className = 'hud-station-card';

  const stationCardBody = doc.createElement('div');
  stationCardBody.className = 'hud-station-card-body';
  stationCard.appendChild(stationCardBody);
  overlay.appendChild(stationCard);

  // Panel lateral derecho compacto: Fundamento Físico y Diagrama p–V (Estación 7)
  const rightPanel = doc.createElement('aside');
  rightPanel.className = 'hud-right-panel';

  const equationsCard = doc.createElement('section');
  equationsCard.className = 'hud-card hud-equations-card';

  const equationsHeader = doc.createElement('div');
  equationsHeader.className = 'hud-card-header';
  equationsHeader.innerHTML = '<h3 class="hud-card-title">Fundamento Físico</h3>';
  equationsCard.appendChild(equationsHeader);

  const equationsBody = doc.createElement('div');
  equationsBody.className = 'hud-card-body hud-equations-body';
  equationsCard.appendChild(equationsBody);

  const liveMetricsBar = doc.createElement('div');
  liveMetricsBar.className = 'hud-live-metrics';
  equationsCard.appendChild(liveMetricsBar);

  rightPanel.appendChild(equationsCard);

  // Contenedor para el canvas del diagrama p–V (visible en Estación 7)
  const hudPvContainer = doc.createElement('section');
  hudPvContainer.className = 'hud-pv-container pv-hidden';

  const hudPvHeader = doc.createElement('div');
  hudPvHeader.className = 'hud-pv-header';
  hudPvHeader.innerHTML = `
    <div class="hud-pv-title-row">
      <span class="hud-pv-badge">Diagrama p–V</span>
      <span class="hud-pv-pulse-dot"></span>
    </div>
    <span class="hud-pv-hint">Lazo Termodinámico</span>
  `;
  hudPvContainer.appendChild(hudPvHeader);

  const hudPvCanvasWrapper = doc.createElement('div');
  hudPvCanvasWrapper.className = 'hud-pv-canvas-wrapper';
  hudPvContainer.appendChild(hudPvCanvasWrapper);

  rightPanel.appendChild(hudPvContainer);
  overlay.appendChild(rightPanel);

  // Barra inferior con atajos de teclado (incluye AvPág / RePág para pasador inalámbrico)
  const bottomBar = doc.createElement('footer');
  bottomBar.className = 'hud-bottom-bar';
  bottomBar.innerHTML = `
    <div class="hud-kbd-hint"><kbd>Espacio</kbd> / <kbd>→</kbd> / <kbd>AvPág</kbd> Siguiente</div>
    <div class="hud-kbd-hint"><kbd>←</kbd> / <kbd>RePág</kbd> Anterior</div>
    <div class="hud-kbd-hint"><kbd>1–7</kbd> Estación</div>
    <div class="hud-kbd-hint"><kbd>P</kbd> Pausar</div>
    <div class="hud-kbd-hint"><kbd>K</kbd> / <kbd>Esc</kbd> Salir</div>
  `;
  overlay.appendChild(bottomBar);

  function rebuildLiveMetricNodes(stationData) {
    liveMetricNodes = {};
    while (liveMetricsBar.children.length > 0) {
      liveMetricsBar.removeChild(liveMetricsBar.children[0]);
    }

    const metrics = Array.isArray(stationData?.liveMetrics) ? stationData.liveMetrics : [];
    if (metrics.length === 0) {
      liveMetricsBar.style.display = 'none';
      return;
    }

    liveMetricsBar.style.display = 'flex';
    for (const metric of metrics) {
      const chip = doc.createElement('div');
      chip.className = 'live-metric-chip';

      const lbl = doc.createElement('span');
      lbl.className = 'live-metric-label';
      lbl.textContent = metric.label || '';

      const val = doc.createElement('span');
      val.className = 'live-metric-value';
      val.dataset.liveMetric = metric.key || '';
      val.textContent = '--';

      chip.appendChild(lbl);
      chip.appendChild(val);
      liveMetricsBar.appendChild(chip);

      if (metric.key) {
        liveMetricNodes[metric.key] = { chipEl: chip, valueEl: val };
      }
    }
  }

  function triggerStationEntrance() {
    stationCard.classList.remove('is-entering');
    rightPanel.classList.remove('is-entering');
    if (typeof stationCard.offsetWidth === 'number') {
      void stationCard.offsetWidth;
    }
    stationCard.classList.add('is-entering');
    rightPanel.classList.add('is-entering');
  }

  // Montar overlay en el contenedor de viewport
  viewportElement.appendChild(overlay);

  return {
    /**
     * Activa el modo presentación en la interfaz:
     * oculta el sidebar, desacopla pvCanvas hacia el HUD y activa la clase.
     */
    show() {
      if (visible) return;
      visible = true;

      if (appContainer && appContainer.classList) {
        appContainer.classList.add('presentation-mode-active');
      }

      if (sidebarElement) {
        sidebarOriginalDisplay = sidebarElement.style.display || '';
        sidebarElement.style.display = 'none';
      }

      // Desacoplar pv-canvas hacia el HUD
      if (pvCanvas && pvCanvas.parentNode) {
        pvCanvasOriginalParent = pvCanvas.parentNode;
        pvCanvasNextSibling = pvCanvas.nextSibling;
        hudPvCanvasWrapper.appendChild(pvCanvas);
      }

      overlay.style.display = 'flex';
    },

    /**
     * Desactiva el modo presentación en la interfaz:
     * restaura pvCanvas a su posición original en el sidebar y muestra el sidebar.
     */
    hide() {
      if (!visible) return;
      visible = false;

      overlay.style.display = 'none';

      // Restaurar pv-canvas a su contenedor original en sidebar
      if (pvCanvas && pvCanvasOriginalParent) {
        if (pvCanvasNextSibling) {
          pvCanvasOriginalParent.insertBefore(pvCanvas, pvCanvasNextSibling);
        } else {
          pvCanvasOriginalParent.appendChild(pvCanvas);
        }
      }

      if (sidebarElement) {
        sidebarElement.style.display = sidebarOriginalDisplay;
      }

      if (appContainer && appContainer.classList) {
        appContainer.classList.remove('presentation-mode-active');
      }

      lastRenderedStationIndex = null;
    },

    /**
     * Actualiza la barra de estaciones, botón de pausa y, únicamente al cambiar de estación,
     * reconstruye las tarjetas Layout B y la renderización KaTeX.
     *
     * @param {number} stationIndex - Índice 1-based (1..7).
     * @param {Object} stationData - Objeto de configuración de la estación de STATIONS.
     * @param {number|string} timerSeconds - Segundos transcurridos o cadena formateada.
     * @param {boolean} [isPaused=false] - Si el ciclo está actualmente en pausa.
     */
    renderStation(stationIndex, stationData, timerSeconds, isPaused = false) {
      // 1. Temporizador interno
      const timeText =
        typeof timerSeconds === 'number'
          ? formatTimeBadge(timerSeconds)
          : String(timerSeconds || '00:00 / 10:00');
      timerBadge.textContent = timeText;

      // 2. Botón de Pausa
      if (isPaused) {
        pauseBtn.classList.add('is-paused');
        pauseBtn.innerHTML = `
          <span class="hud-btn-icon">▶</span>
          <span class="hud-btn-text">Reanudar</span>
        `;
      } else {
        pauseBtn.classList.remove('is-paused');
        pauseBtn.innerHTML = `
          <span class="hud-btn-icon">⏸</span>
          <span class="hud-btn-text">Pausar</span>
        `;
      }

      // 3. Barra de 7 puntos superiores
      for (let i = 0; i < stepperDots.length; i++) {
        const dot = stepperDots[i];
        if (i + 1 === stationIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      }

      // 4. Reconstruir tarjetas Layout B únicamente cuando cambia la estación
      if (stationData && stationIndex !== lastRenderedStationIndex) {
        lastRenderedStationIndex = stationIndex;
        stationCardBody.innerHTML = buildStationCardHTML(stationData);

        const formulasHTML = buildFormulasBodyHTML(stationData);
        if (formulasHTML) {
          equationsBody.innerHTML = formulasHTML;
          equationsCard.style.display = 'block';
        } else {
          equationsBody.innerHTML = '';
          equationsCard.style.display = 'none';
        }

        rebuildLiveMetricNodes(stationData);
        triggerStationEntrance();
      }

      // 5. Visibilidad del diagrama p–V únicamente en Estación 7
      if (stationIndex === 7) {
        hudPvContainer.classList.add('pv-visible');
        hudPvContainer.classList.remove('pv-hidden');
      } else {
        hudPvContainer.classList.add('pv-hidden');
        hudPvContainer.classList.remove('pv-visible');
      }
    },

    /**
     * Actualiza en O(1) las lecturas numéricas vivas de la estación sin tocar innerHTML.
     */
    updateLiveTelemetry(stationIndex, thermoState) {
      const values = computePresentationLiveMetrics(stationIndex, thermoState);
      for (const [key, entry] of Object.entries(values)) {
        const node = liveMetricNodes[key];
        if (!node) continue;
        node.valueEl.textContent = entry.text;
        node.chipEl.classList.remove('is-safe', 'is-warning');
        if (entry.alert === 'safe') {
          node.chipEl.classList.add('is-safe');
        } else if (entry.alert === 'warning') {
          node.chipEl.classList.add('is-warning');
        }
      }
    },

    /**
     * Alterna explícitamente la visibilidad del contenedor del diagrama p–V.
     * @param {boolean} expanded
     */
    togglePvExpanded(expanded) {
      if (expanded) {
        hudPvContainer.classList.add('pv-visible');
        hudPvContainer.classList.remove('pv-hidden');
      } else {
        hudPvContainer.classList.add('pv-hidden');
        hudPvContainer.classList.remove('pv-visible');
      }
    },

    /**
     * Retorna si el HUD está visible en pantalla.
     * @returns {boolean}
     */
    isVisible() {
      return visible;
    },

    /**
     * Desmonta el overlay y limpia referencias del DOM.
     */
    destroy() {
      this.hide();
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }
  };
}
