import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildBlueprintSpec,
  createBlueprintOverlay
} from '../src/presentation/blueprintOverlay.js';
import { DEFAULT_PARAMS } from '../src/model/geometry.js';
import { computeStateAtTheta } from '../src/model/thermodynamics.js';

function createMockSvgDom() {
  function makeNode(tag) {
    const attrs = {};
    const children = [];
    return {
      tagName: tag,
      attrs,
      children,
      style: {},
      className: '',
      parentNode: null,
      _textContent: '',
      _innerHTML: '',
      setAttribute(k, v) {
        attrs[k] = String(v);
        if (k === 'class') this.className = String(v);
      },
      getAttribute(k) {
        return attrs[k] ?? null;
      },
      appendChild(child) {
        child.parentNode = this;
        children.push(child);
        return child;
      },
      removeChild(child) {
        const i = children.indexOf(child);
        if (i !== -1) {
          children.splice(i, 1);
          child.parentNode = null;
        }
        return child;
      },
      replaceChildren(...nodes) {
        children.length = 0;
        nodes.forEach((n) => this.appendChild(n));
      },
      set textContent(v) {
        this._textContent = String(v);
      },
      get textContent() {
        return this._textContent;
      },
      set innerHTML(v) {
        this._innerHTML = String(v);
        if (v === '') children.length = 0;
      },
      get innerHTML() {
        return this._innerHTML;
      }
    };
  }

  const container = makeNode('main');
  const doc = {
    createElement(tag) {
      return makeNode(tag);
    },
    createElementNS(_ns, tag) {
      return makeNode(tag);
    }
  };
  return { container, doc };
}

function mockLinearProjector(x, y, _z = 0, w = 1280, h = 720) {
  return {
    x: w * 0.5 + x * 1200,
    y: h * 0.65 - y * 1200,
    visible: true
  };
}

describe('blueprintOverlay · Descriptores físicos y proyección SVG', () => {
  it('genera cotas B=80 mm y L=80 mm para Estación 1', () => {
    const thermo = computeStateAtTheta(45, DEFAULT_PARAMS);
    const spec = buildBlueprintSpec(1, thermo);
    const labels = spec.brackets.map((b) => b.label);
    expect(labels.some((l) => l.includes('B = 80 mm'))).toBe(true);
    expect(labels.some((l) => l.includes('L = 80 mm'))).toBe(true);
    expect(spec.callouts.some((c) => c.title.includes('720°'))).toBe(true);
  });

  it('genera vector pulsante F_gas (38.89 kN en 360°) y desvío Δs en Estación 2', () => {
    const thermo = computeStateAtTheta(360, DEFAULT_PARAMS, { beforeJump: false });
    const spec = buildBlueprintSpec(2, thermo);
    expect(spec.arrows.length).toBeGreaterThanOrEqual(1);
    const forceArrow = spec.arrows[0];
    expect(forceArrow.to.y).toBeCloseTo(thermo.geometry.y_corona + 0.002, 5);
    expect(forceArrow.from.y).toBeGreaterThan(forceArrow.to.y);
    expect(forceArrow.label).toContain('38.89 kN');
    expect(spec.callouts.some((c) => c.title.includes('Δs'))).toBe(true);
  });

  it('genera cota de alzada h_v y volumen V(θ) en Estación 3 (Admisión)', () => {
    const thermo = computeStateAtTheta(90, DEFAULT_PARAMS);
    const spec = buildBlueprintSpec(3, thermo);
    expect(spec.brackets.some((b) => b.label.includes('5.5 mm'))).toBe(true);
    expect(spec.callouts.some((c) => c.title.includes('V(θ)'))).toBe(true);
  });

  it('genera cota crítica hc = 10.0 mm y aviso de knocking en Estación 4 (Compresión)', () => {
    const thermo = computeStateAtTheta(360, DEFAULT_PARAMS, { beforeJump: true });
    const spec = buildBlueprintSpec(4, thermo);
    const hcBracket = spec.brackets.find((b) => b.label.includes('10.0 mm'));
    expect(hcBracket).toBeDefined();
    expect(hcBracket.from.y).toBeCloseTo(0.20, 4);
    expect(hcBracket.to.y).toBeCloseTo(0.21, 4);
    const thermalCallout = spec.callouts.find((c) => c.title.includes('722.5 K'));
    expect(thermalCallout).toBeDefined();
    expect(thermalCallout.subtitle.toLowerCase()).toContain('knocking');
  });

  it('genera etiqueta de chispa Qin = 700 J y vector útil F_gas en Estación 5', () => {
    const thermo = computeStateAtTheta(365, DEFAULT_PARAMS);
    const spec = buildBlueprintSpec(5, thermo);
    const sparkCallout = spec.callouts.find((c) => c.title.includes('700 J'));
    expect(sparkCallout).toBeDefined();
    expect(sparkCallout.subtitle).toContain('kPa');
    expect(sparkCallout.subtitle).not.toContain('bar');
    expect(spec.arrows.length).toBeGreaterThanOrEqual(1);
  });

  it('genera relación 2:1 en levas, alzada de escape y Qout = 290.7 J en Estación 6', () => {
    const thermo = computeStateAtTheta(630, DEFAULT_PARAMS);
    const spec = buildBlueprintSpec(6, thermo);
    expect(spec.callouts.some((c) => c.title.includes('1:2') || c.subtitle.includes('θ/2'))).toBe(true);
    expect(spec.brackets.some((b) => b.label.includes('5.5 mm'))).toBe(true);
    expect(spec.callouts.some((c) => c.title.includes('290.7 J'))).toBe(true);
  });

  it('genera síntesis energética (Qin, Wneto, Qout, 10.23 kW) y vector de choque lateral limpio en Estación 7', () => {
    const thermo = computeStateAtTheta(120, DEFAULT_PARAMS);
    const spec = buildBlueprintSpec(7, thermo);
    const joined = spec.callouts.map((c) => `${c.title} ${c.subtitle || ''}`).join(' ');
    expect(joined).toContain('700 J');
    expect(joined).toContain('+409.3 J');
    expect(joined).toContain('290.7 J');
    expect(joined).toContain('10.23 kW');
    expect(joined.toLowerCase()).toContain('choques a los lados');

    // Exactamente 2 flechas claras: una chocando contra la pared izquierda y otra empujando el pistón
    expect(spec.arrows).toHaveLength(2);
    const lateralArrow = spec.arrows.find((a) => a.id === 'verdict-scatter-wall');
    const pistonArrow = spec.arrows.find((a) => a.id === 'verdict-piston-push');
    expect(lateralArrow).toBeDefined();
    expect(lateralArrow.to.x).toBeLessThan(0);
    expect(lateralArrow.to.z).toBe(0);
    expect(pistonArrow).toBeDefined();
    expect(pistonArrow.to.y).toBeLessThan(pistonArrow.from.y);
    expect(pistonArrow.to.z).toBe(0);

    // El callout de choques laterales debe apuntar hacia el espacio libre izquierdo, no a la esquina derecha
    const qoutCallout = spec.callouts.find((c) => c.id === 'verdict-qout');
    expect(qoutCallout).toBeDefined();
    expect(qoutCallout.boxOffsetPx.dx).toBeLessThan(0);
  });
});

describe('blueprintOverlay · Controlador SVG createBlueprintOverlay', () => {
  let container;
  let doc;

  beforeEach(() => {
    const dom = createMockSvgDom();
    container = dom.container;
    doc = dom.doc;
  });

  it('monta el SVG oculto, proyecta nodos al mostrar y limpia al ocultar o destruir', () => {
    const overlay = createBlueprintOverlay({ container, document: doc });
    expect(overlay.isVisible()).toBe(false);
    expect(container.children).toHaveLength(1);
    const svg = container.children[0];
    expect(svg.style.display).toBe('none');

    overlay.show();
    expect(overlay.isVisible()).toBe(true);
    expect(svg.style.display).toBe('block');

    const thermo = computeStateAtTheta(360, DEFAULT_PARAMS, { beforeJump: true });
    overlay.update(4, thermo, mockLinearProjector, { width: 1280, height: 720 });
    expect(svg.getAttribute('viewBox')).toBe('0 0 1280 720');
    expect(svg.children.length).toBeGreaterThan(0);

    overlay.hide();
    expect(overlay.isVisible()).toBe(false);
    expect(svg.style.display).toBe('none');
    expect(svg.children).toHaveLength(0);

    overlay.destroy();
    expect(container.children).toHaveLength(0);
  });

  it('maneja viewport nulo, proyector ausente o coordenadas NaN sin lanzar ni escribir NaN', () => {
    const overlay = createBlueprintOverlay({ container, document: doc });
    overlay.show();
    const svg = container.children[0];
    const thermo = computeStateAtTheta(180, DEFAULT_PARAMS);

    expect(() => {
      overlay.update(4, thermo, null, { width: 1280, height: 720 });
      overlay.update(4, thermo, mockLinearProjector, { width: 0, height: 0 });
      overlay.update(4, thermo, () => ({ x: NaN, y: 100, visible: true }), {
        width: 1280,
        height: 720
      });
      overlay.update(4, thermo, () => ({ x: 100, y: 100, visible: false }), {
        width: 1280,
        height: 720
      });
    }).not.toThrow();

    expect(svg.children).toHaveLength(0);
  });

  it('proyecta las flechas claras en Estación 7 sin generar cajas vacías', () => {
    const overlay = createBlueprintOverlay({ container, document: doc });
    overlay.show();
    const svg = container.children[0];
    const thermo = computeStateAtTheta(400, DEFAULT_PARAMS);

    overlay.update(7, thermo, mockLinearProjector, { width: 1280, height: 720 });
    const group = svg.children[0];
    expect(group).toBeDefined();
    const rects = group.children.filter((c) => c.tagName === 'rect');
    const polygons = group.children.filter((c) => c.tagName === 'polygon');
    // 3 callouts + 1 flecha con etiqueta ('Empuje útil') -> 4 píldoras <rect> y 2 flechas <polygon>
    expect(rects).toHaveLength(4);
    expect(polygons).toHaveLength(2);
  });

  it('mantiene todas las píldoras de Estación 2 y Estación 7 fuera de los paneles laterales en 1280x720 y 1440x800', () => {
    const overlay = createBlueprintOverlay({ container, document: doc });
    overlay.show();
    const svg = container.children[0];

    for (const [w, h] of [[1280, 720], [1440, 800]]) {
      const leftEdge = 20 + Math.min(310, Math.max(255, w * 0.21)) + 8;
      const rightEdge = w - 20 - Math.min(345, Math.max(290, w * 0.235)) - 8;

      for (const stIdx of [2, 5, 7]) {
        const thermo = computeStateAtTheta(400, DEFAULT_PARAMS);
        overlay.update(stIdx, thermo, mockLinearProjector, { width: w, height: h });
        const group = svg.children[0];
        const rects = group.children.filter((c) => c.tagName === 'rect');
        for (const r of rects) {
          const rx = parseFloat(r.getAttribute('x'));
          const rw = parseFloat(r.getAttribute('width'));
          expect(rx).toBeGreaterThanOrEqual(leftEdge - 0.5);
          expect(rx + rw).toBeLessThanOrEqual(rightEdge + 0.5);
        }
      }
    }
  });
});
