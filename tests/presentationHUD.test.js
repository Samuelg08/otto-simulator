import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatTimeBadge,
  formatEquation,
  buildEquationsCardHTML,
  buildImportantCardHTML,
  buildStationCardHTML,
  createPresentationHUD
} from '../src/presentation/presentationHUD.js';
import { STATIONS } from '../src/presentation/presentationState.js';
import { DEFAULT_PARAMS } from '../src/model/geometry.js';
import { computeStateAtTheta } from '../src/model/thermodynamics.js';

/**
 * Mock ligero y autocontenido para pruebas de DOM en entorno Node.
 */
function createMockClassList() {
  const classes = new Set();
  return {
    add: (...names) => names.forEach((n) => classes.add(n)),
    remove: (...names) => names.forEach((n) => classes.delete(n)),
    contains: (name) => classes.has(name),
    toggle: (name, force) => {
      if (typeof force === 'boolean') {
        if (force) classes.add(name);
        else classes.delete(name);
        return force;
      }
      if (classes.has(name)) {
        classes.delete(name);
        return false;
      }
      classes.add(name);
      return true;
    },
    toString: () => Array.from(classes).join(' ')
  };
}

function createMockElement(tagName = 'div', id = '', className = '') {
  const listeners = {};
  const children = [];
  const classList = createMockClassList();
  if (className) {
    className.split(/\s+/).filter(Boolean).forEach((c) => classList.add(c));
  }

  const el = {
    tagName: tagName.toUpperCase(),
    id,
    classList,
    style: {},
    dataset: {},
    parentNode: null,
    nextSibling: null,
    children,
    _innerHTML: '',
    _textContent: '',

    get className() {
      return this.classList.toString();
    },
    set className(val) {
      const existing = this.classList.toString().split(/\s+/).filter(Boolean);
      existing.forEach((c) => this.classList.remove(c));
      const newClasses = String(val || '').split(/\s+/).filter(Boolean);
      newClasses.forEach((c) => this.classList.add(c));
    },

    get innerHTML() {
      return this._innerHTML;
    },
    set innerHTML(html) {
      this._innerHTML = String(html);
      // Simulación básica de hijos para selectores si es necesario
    },

    get textContent() {
      return this._textContent;
    },
    set textContent(text) {
      this._textContent = String(text);
    },

    appendChild(child) {
      if (!child) return null;
      if (child.parentNode) {
        child.parentNode.removeChild(child);
      }
      child.parentNode = this;
      child.nextSibling = null;
      if (children.length > 0) {
        children[children.length - 1].nextSibling = child;
      }
      children.push(child);
      return child;
    },

    removeChild(child) {
      const idx = children.indexOf(child);
      if (idx !== -1) {
        children.splice(idx, 1);
        child.parentNode = null;
        // Reconstruir nextSibling
        for (let i = 0; i < children.length; i++) {
          children[i].nextSibling = children[i + 1] || null;
        }
      }
      return child;
    },

    insertBefore(newNode, referenceNode) {
      if (!newNode) return null;
      if (newNode.parentNode) {
        newNode.parentNode.removeChild(newNode);
      }
      if (!referenceNode) {
        return this.appendChild(newNode);
      }
      const idx = children.indexOf(referenceNode);
      if (idx === -1) {
        return this.appendChild(newNode);
      }
      children.splice(idx, 0, newNode);
      newNode.parentNode = this;
      for (let i = 0; i < children.length; i++) {
        children[i].nextSibling = children[i + 1] || null;
      }
      return newNode;
    },

    remove() {
      if (this.parentNode) {
        this.parentNode.removeChild(this);
      }
    },

    addEventListener(event, handler) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },

    setAttribute(name, val) {
      this[name] = String(val);
    },

    getAttribute(name) {
      return this[name] || null;
    },

    removeEventListener(event, handler) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter((h) => h !== handler);
    },

    dispatchEvent(event) {
      const type = typeof event === 'string' ? event : event.type;
      const handlers = listeners[type] || [];
      const ev = typeof event === 'string' ? { type: event, target: this } : event;
      handlers.forEach((h) => h.call(this, ev));
    },

    querySelector(selector) {
      return this._query(selector, false);
    },

    querySelectorAll(selector) {
      const results = [];
      this._query(selector, true, results);
      return results;
    },

    _query(selector, multiple, acc = []) {
      const check = (node) => {
        if (!node) return false;
        if (selector.startsWith('#') && node.id === selector.slice(1)) return true;
        if (selector.startsWith('.') && node.classList.contains(selector.slice(1))) return true;
        const attrMatch = selector.match(/^\[([^=\]]+)="([^"]*)"\]$/);
        if (attrMatch) {
          const [, attrName, attrVal] = attrMatch;
          if (attrName.startsWith('data-')) {
            const key = attrName.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            return node.dataset?.[key] === attrVal || node[attrName] === attrVal;
          }
          return node[attrName] === attrVal;
        }
        if (node.tagName.toLowerCase() === selector.toLowerCase()) return true;
        return false;
      };

      for (const child of children) {
        if (check(child)) {
          if (!multiple) return child;
          acc.push(child);
        }
        const found = child._query(selector, multiple, acc);
        if (!multiple && found) return found;
      }
      return multiple ? acc : null;
    }
  };

  return el;
}

function createMockDocument() {
  const docElement = createMockElement('html');
  const body = createMockElement('body');
  docElement.appendChild(body);

  return {
    createElement(tagName) {
      return createMockElement(tagName);
    },
    getElementById(id) {
      return body.querySelector(`#${id}`);
    },
    querySelector(sel) {
      return body.querySelector(sel);
    },
    querySelectorAll(sel) {
      return body.querySelectorAll(sel);
    },
    body
  };
}

describe('presentationHUD · Funciones puras de formato y maquetación', () => {
  describe('formatTimeBadge', () => {
    it('formatea 0 segundos como 00:00 / 10:00', () => {
      expect(formatTimeBadge(0)).toBe('00:00 / 10:00');
    });

    it('formatea 95 segundos como 01:35 / 10:00', () => {
      expect(formatTimeBadge(95)).toBe('01:35 / 10:00');
    });

    it('formatea 600 segundos como 10:00 / 10:00', () => {
      expect(formatTimeBadge(600)).toBe('10:00 / 10:00');
    });

    it('hace clamping superior a 10:00 / 10:00 para segundos >= 600', () => {
      expect(formatTimeBadge(601)).toBe('10:00 / 10:00');
      expect(formatTimeBadge(9999)).toBe('10:00 / 10:00');
    });

    it('hace clamping inferior a 00:00 / 10:00 para valores negativos', () => {
      expect(formatTimeBadge(-1)).toBe('00:00 / 10:00');
      expect(formatTimeBadge(-150)).toBe('00:00 / 10:00');
    });

    it('trunca o redondea hacia abajo los decimales', () => {
      expect(formatTimeBadge(95.8)).toBe('01:35 / 10:00');
    });

    it('maneja valores no numéricos devolviendo 00:00 / 10:00 de forma segura', () => {
      expect(formatTimeBadge(null)).toBe('00:00 / 10:00');
      expect(formatTimeBadge(undefined)).toBe('00:00 / 10:00');
      expect(formatTimeBadge(NaN)).toBe('00:00 / 10:00');
      expect(formatTimeBadge('invalid')).toBe('00:00 / 10:00');
    });
  });


  describe('formatEquation', () => {
    it('limpia macros TeX simples como frac, cdot, approx, pi', () => {
      const res = formatEquation('\\frac{\\pi B^2}{4} \\cdot L \\approx 402.12');
      expect(res).toContain('π');
      expect(res).toContain('·');
      expect(res).toContain('≈');
      expect(res).not.toContain('\\frac');
    });

    it('respeta cadenas matemáticas ya formateadas en Unicode', () => {
      const eq = 's(θ) = a·(1 - cos θ) + l_b·(1 - √(1 - λ²·sin²θ))';
      expect(formatEquation(eq)).toBe(eq);
    });

    it('devuelve cadena vacía ante valores nulos o indefinidos', () => {
      expect(formatEquation(null)).toBe('');
      expect(formatEquation(undefined)).toBe('');
    });
  });

  describe('buildEquationsCardHTML', () => {
    it('construye tarjeta limpia de Fundamento Físico con insignia Ec., ecuación grande, explicación física y leyenda compacta', () => {
      const html = buildEquationsCardHTML(STATIONS[0]);
      expect(html).toContain('Fundamento Físico');
      expect(html).toContain('station-equation-item');
      expect(html).toContain('formula-eq-badge');
      expect(html).toContain('Ec. (2)');
      expect(html).toContain('formula-main-eq');
      expect(html).toContain('formula-explanation');
      expect(html).toContain('formula-term-chip');
      expect(html).toContain('data-live-metric');
      expect(html).toContain('402.12');
      expect(html).toContain('katex');
      expect(html).not.toContain('formula-substitution-row');
      expect(html).not.toContain('formula-result-banner');
    });

    it('devuelve vacío si no hay ecuaciones ni formulaCards', () => {
      expect(buildEquationsCardHTML(null)).toBe('');
      expect(buildEquationsCardHTML({})).toBe('');
      expect(buildEquationsCardHTML({ equations: [], formulaCards: [] })).toBe('');
    });
  });

  describe('buildImportantCardHTML', () => {
    it('construye tarjeta con encabezado Aspectos Importantes y viñetas formales', () => {
      const html = buildImportantCardHTML(STATIONS[0]);
      expect(html).toContain('Aspectos Importantes');
      expect(html).toContain('important-point-item');
      expect(html).toContain('720°');
    });

    it('devuelve vacío si no hay puntos importantes', () => {
      expect(buildImportantCardHTML(null)).toBe('');
      expect(buildImportantCardHTML({})).toBe('');
      expect(buildImportantCardHTML({ importantPoints: [] })).toBe('');
    });
  });
  describe('buildStationCardHTML', () => {
    it('construye tarjeta de orador con Idea Central y exactamente 3 pasos narrativos específicos', () => {
      const cardHtml = buildStationCardHTML(STATIONS[0]);
      expect(cardHtml).toContain('Introducción y Mecanismo');
      expect(cardHtml).toContain('hud-hook-block');
      expect(cardHtml).toContain('Idea Central');
      expect(cardHtml).toContain(STATIONS[0].hookQuestion);
      expect(cardHtml).toContain('hud-cues-list');
      expect(cardHtml.match(/hud-cue-item/g)).toHaveLength(3);
      expect(cardHtml).toContain(STATIONS[0].badgeColor); // #3b82f6
      expect(cardHtml).toContain('402.12 cm³');
    });

    it('garantiza la presencia destacada de los argumentos de M.A.S. no armónico en la Estación 2', () => {
      const cardHtml = buildStationCardHTML(STATIONS[1]);
      expect(cardHtml).toContain('Dinámica y Cinemática Real vs. M.A.S.');
      expect(cardHtml).toContain('fuerza externa periódica no armónica');
      expect(cardHtml).toContain('F_gas = p(t)·A');
    });

    it('garantiza la presencia destacada del límite de autoignición (detonación / knocking) en la Estación 4', () => {
      const cardHtml = buildStationCardHTML(STATIONS[3]);
      expect(cardHtml).toContain('Compresión Adiabática');
      expect(cardHtml).toContain('detonación prematura');
      expect(cardHtml).toContain('knocking');
    });

    it('incluye balance global, dispersión omnidireccional de partículas y contraste real en las viñetas de Estación 7', () => {
      const cardHtml = buildStationCardHTML(STATIONS[6]);
      expect(cardHtml).toContain('Veredicto Termodinámico');
      expect(cardHtml).toContain('+409.3 J');
      expect(cardHtml).toContain('58.48%');
      expect(cardHtml.toLowerCase()).toContain('partículas');
      expect(cardHtml.toLowerCase()).toContain('chocan a los lados');
      expect(cardHtml).not.toContain('2ª Ley');
    });

    it('maneja valores nulos o vacíos sin lanzar excepciones', () => {
      expect(buildStationCardHTML(null)).toBe('');
      expect(buildStationCardHTML(undefined)).toBe('');
      expect(buildStationCardHTML({})).toContain('station-card-inner');
    });
  });
});

describe('presentationHUD · Gestor createPresentationHUD', () => {
  let mockDoc;
  let appContainer;
  let sidebarElement;
  let viewportElement;
  let pvCanvasWrapper;
  let pvCanvas;

  beforeEach(() => {
    mockDoc = createMockDocument();
    appContainer = mockDoc.createElement('div');
    appContainer.id = 'app';
    mockDoc.body.appendChild(appContainer);

    viewportElement = mockDoc.createElement('main');
    viewportElement.id = 'viewport-container';
    appContainer.appendChild(viewportElement);

    sidebarElement = mockDoc.createElement('aside');
    sidebarElement.id = 'sidebar';
    appContainer.appendChild(sidebarElement);

    const pvSection = mockDoc.createElement('section');
    pvSection.classList.add('panel-card');
    sidebarElement.appendChild(pvSection);

    pvCanvasWrapper = mockDoc.createElement('div');
    pvCanvasWrapper.classList.add('canvas-wrapper');
    pvSection.appendChild(pvCanvasWrapper);

    pvCanvas = mockDoc.createElement('canvas');
    pvCanvas.id = 'pv-canvas';
    pvCanvasWrapper.appendChild(pvCanvas);
  });

  it('se inicializa en estado no visible y monta el overlay en viewportElement', () => {
    const hud = createPresentationHUD({
      document: mockDoc,
      appContainer,
      sidebarElement,
      viewportElement,
      pvCanvas
    });

    expect(hud.isVisible()).toBe(false);
    expect(appContainer.classList.contains('presentation-mode-active')).toBe(false);
    // Debe haber montado el contenedor overlay del HUD
    const overlay = viewportElement.querySelector('.presentation-hud-overlay');
    expect(overlay).not.toBeNull();
  });


  it('monta el panel lateral derecho compacto con tarjeta Fundamento Físico, sin Aspectos Importantes repetidos, y contenedor p-V', () => {
    const hud = createPresentationHUD({
      document: mockDoc,
      appContainer,
      sidebarElement,
      viewportElement,
      pvCanvas
    });

    hud.show();
    const rightPanel = viewportElement.querySelector('.hud-right-panel');
    expect(rightPanel).not.toBeNull();

    const eqCard = viewportElement.querySelector('.hud-equations-card');
    expect(eqCard).not.toBeNull();

    const impCard = viewportElement.querySelector('.hud-important-card');
    expect(impCard).toBeNull();

    // El temporizador está presente en el DOM pero oculto visualmente
    const timer = viewportElement.querySelector('.hud-timer-badge');
    expect(timer).not.toBeNull();
    expect(timer.style.display).toBe('none');
  });

  it('al invocar show() oculta sidebar, desacopla pvCanvas al HUD y activa presentation-mode-active', () => {
    const hud = createPresentationHUD({
      document: mockDoc,
      appContainer,
      sidebarElement,
      viewportElement,
      pvCanvas
    });

    hud.show();

    expect(hud.isVisible()).toBe(true);
    expect(appContainer.classList.contains('presentation-mode-active')).toBe(true);
    expect(sidebarElement.style.display).toBe('none');

    // pvCanvas debe haber sido desacoplado del sidebar y colocado dentro del HUD
    expect(pvCanvas.parentNode).not.toBe(pvCanvasWrapper);
    const hudPvWrapper = viewportElement.querySelector('.hud-pv-canvas-wrapper');
    expect(hudPvWrapper).not.toBeNull();
    expect(pvCanvas.parentNode).toBe(hudPvWrapper);
  });

  it('al invocar hide() restaura pvCanvas a su contenedor original en sidebar y remueve clases', () => {
    const hud = createPresentationHUD({
      document: mockDoc,
      appContainer,
      sidebarElement,
      viewportElement,
      pvCanvas
    });

    hud.show();
    expect(hud.isVisible()).toBe(true);

    hud.hide();
    expect(hud.isVisible()).toBe(false);
    expect(appContainer.classList.contains('presentation-mode-active')).toBe(false);
    expect(sidebarElement.style.display).toBe('');

    // pvCanvas vuelve a estar dentro de su contenedor original en sidebar
    expect(pvCanvas.parentNode).toBe(pvCanvasWrapper);
  });

  it('renderStation actualiza el temporizador, marca el punto activo e inyecta la tarjeta', () => {
    const hud = createPresentationHUD({
      document: mockDoc,
      appContainer,
      sidebarElement,
      viewportElement,
      pvCanvas
    });

    hud.show();
    hud.renderStation(2, STATIONS[1], 120, false);

    // Temporizador
    const timerElem = viewportElement.querySelector('.hud-timer-badge');
    expect(timerElem.textContent).toBe('02:00 / 10:00');

    // Los 7 puntos de navegación: el 2 debe tener clase active
    const dots = viewportElement.querySelectorAll('.hud-stepper-dot');
    expect(dots).toHaveLength(7);
    expect(dots[1].classList.contains('active')).toBe(true);
    expect(dots[0].classList.contains('active')).toBe(false);

    // Contenido de la tarjeta de la estación 2
    const cardContent = viewportElement.querySelector('.hud-station-card-body');
    expect(cardContent.innerHTML).toContain('Cinemática Real vs. M.A.S.');
  });

  it('muestra el diagrama p-V (pv-visible) únicamente en la Estación 7 y lo oculta (pv-hidden) en estaciones 1..6', () => {
    const hud = createPresentationHUD({
      document: mockDoc,
      appContainer,
      sidebarElement,
      viewportElement,
      pvCanvas
    });

    hud.show();
    const pvContainer = viewportElement.querySelector('.hud-pv-container');

    for (let i = 1; i <= 6; i++) {
      hud.renderStation(i, STATIONS[i - 1], i * 60, false);
      expect(pvContainer.classList.contains('pv-hidden')).toBe(true);
      expect(pvContainer.classList.contains('pv-visible')).toBe(false);
    }

    // Estación 7 (Veredicto Termodinámico): visible en el panel derecho
    hud.renderStation(7, STATIONS[6], 550, false);
    expect(pvContainer.classList.contains('pv-visible')).toBe(true);
    expect(pvContainer.classList.contains('pv-hidden')).toBe(false);
  });

  it('dispara callbacks onStationSelect, onTogglePause y onExit al hacer clic', () => {
    const onStationSelect = vi.fn();
    const onTogglePause = vi.fn();
    const onExit = vi.fn();

    const hud = createPresentationHUD({
      document: mockDoc,
      appContainer,
      sidebarElement,
      viewportElement,
      pvCanvas,
      onStationSelect,
      onTogglePause,
      onExit
    });

    hud.show();

    // Clic en el punto 4
    const dots = viewportElement.querySelectorAll('.hud-stepper-dot');
    dots[3].dispatchEvent('click');
    expect(onStationSelect).toHaveBeenCalledWith(4);

    // Clic en pausa
    const pauseBtn = viewportElement.querySelector('.hud-btn-pause');
    pauseBtn.dispatchEvent('click');
    expect(onTogglePause).toHaveBeenCalledTimes(1);

    // Clic en salir
    const exitBtn = viewportElement.querySelector('.hud-btn-exit');
    exitBtn.dispatchEvent('click');
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('permite alternar visibilidad del p-V con togglePvExpanded', () => {
    const hud = createPresentationHUD({
      document: mockDoc,
      appContainer,
      sidebarElement,
      viewportElement,
      pvCanvas
    });

    hud.show();
    const pvContainer = viewportElement.querySelector('.hud-pv-container');

    hud.togglePvExpanded(true);
    expect(pvContainer.classList.contains('pv-visible')).toBe(true);
    expect(pvContainer.classList.contains('pv-hidden')).toBe(false);

    hud.togglePvExpanded(false);
    expect(pvContainer.classList.contains('pv-hidden')).toBe(true);
    expect(pvContainer.classList.contains('pv-visible')).toBe(false);
  });

  it('cambia el estado visual del botón de pausa según isPaused sin reconstruir innerHTML si la estación no cambió', () => {
    const hud = createPresentationHUD({
      document: mockDoc,
      appContainer,
      sidebarElement,
      viewportElement,
      pvCanvas
    });

    hud.show();
    const pauseBtn = viewportElement.querySelector('.hud-btn-pause');
    const cardBody = viewportElement.querySelector('.hud-station-card-body');
    const eqBody = viewportElement.querySelector('.hud-equations-body');

    hud.renderStation(1, STATIONS[0], 10, true);
    expect(pauseBtn.classList.contains('is-paused')).toBe(true);
    expect(pauseBtn.innerHTML).toContain('Reanudar');

    const spyCardSet = vi.spyOn(cardBody, 'innerHTML', 'set');
    const spyEqSet = vi.spyOn(eqBody, 'innerHTML', 'set');

    hud.renderStation(1, STATIONS[0], 12, false);
    expect(pauseBtn.classList.contains('is-paused')).toBe(false);
    expect(pauseBtn.innerHTML).toContain('Pausar');
    expect(spyCardSet).not.toHaveBeenCalled();
    expect(spyEqSet).not.toHaveBeenCalled();
  });

  it('actualiza telemetría viva en updateLiveTelemetry sin reconstruir DOM', () => {
    const hud = createPresentationHUD({
      document: mockDoc,
      appContainer,
      sidebarElement,
      viewportElement,
      pvCanvas
    });

    hud.show();
    hud.renderStation(5, STATIONS[4], 300, false);

    const eqBody = viewportElement.querySelector('.hud-equations-body');
    const spyEqSet = vi.spyOn(eqBody, 'innerHTML', 'set');

    const s5End = computeStateAtTheta(540, DEFAULT_PARAMS, { beforeJump: true });
    hud.updateLiveTelemetry(5, s5End);

    const w34Node = viewportElement.querySelector('[data-live-metric="W34_theta"]');
    expect(w34Node).not.toBeNull();
    expect(w34Node.textContent).toBe('+568.6 J');
    expect(spyEqSet).not.toHaveBeenCalled();

    hud.renderStation(4, STATIONS[3], 220, false);
    const s4End = computeStateAtTheta(360, DEFAULT_PARAMS, { beforeJump: true });
    hud.updateLiveTelemetry(4, s4End);
    const tNode = viewportElement.querySelector('[data-live-metric="T_inst"]');
    expect(tNode).not.toBeNull();
    expect(tNode.textContent).toBe('722.5 K');
    expect(tNode.parentNode.classList.contains('is-safe')).toBe(true);
  });

  it('maneja show() y hide() de forma idempotente sin duplicar ni romper estados', () => {
    const hud = createPresentationHUD({
      document: mockDoc,
      appContainer,
      sidebarElement,
      viewportElement,
      pvCanvas
    });

    hud.show();
    hud.show(); // Segunda llamada
    expect(hud.isVisible()).toBe(true);
    expect(pvCanvas.parentNode).not.toBe(pvCanvasWrapper);

    hud.hide();
    hud.hide(); // Segunda llamada
    expect(hud.isVisible()).toBe(false);
    expect(pvCanvas.parentNode).toBe(pvCanvasWrapper);
  });

  it('destruye el overlay limpiamente al invocar destroy()', () => {
    const hud = createPresentationHUD({
      document: mockDoc,
      appContainer,
      sidebarElement,
      viewportElement,
      pvCanvas
    });

    hud.show();
    expect(viewportElement.querySelector('.presentation-hud-overlay')).not.toBeNull();

    hud.destroy();
    expect(hud.isVisible()).toBe(false);
    expect(viewportElement.querySelector('.presentation-hud-overlay')).toBeNull();
  });

  it('funciona de manera segura cuando pvCanvas no está presente', () => {
    const hud = createPresentationHUD({
      document: mockDoc,
      appContainer,
      sidebarElement,
      viewportElement,
      pvCanvas: null
    });

    expect(() => {
      hud.show();
      hud.renderStation(1, STATIONS[0], 0, false);
      hud.hide();
    }).not.toThrow();
  });
});
