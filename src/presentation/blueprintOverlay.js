/**
 * Capa SVG Blueprint 3D proyectada sobre la escena Three.js para el Modo Exposición.
 * Traduce el estado geométrico y termodinámico en cotas técnicas, vectores de fuerza
 * y etiquetas ancladas a las coordenadas físicas reales del motor (metros).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function pt(x, y, z = 0) {
  return { x, y, z };
}

function isValidPt(p) {
  return (
    Boolean(p) &&
    p.visible === true &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

/**
 * Construye los descriptores geométricos y etiquetas blueprint en coordenadas físicas del motor (SI).
 *
 * @param {number} stationIndex - Índice de estación (1..7).
 * @param {Object} thermoState - Estado instantáneo retornado por computeStateAtTheta().
 * @returns {{ brackets: Array<Object>, arrows: Array<Object>, callouts: Array<Object> }}
 */
export function buildBlueprintSpec(stationIndex, thermoState) {
  if (!thermoState || !thermoState.geometry || !thermoState.cycle) {
    return { brackets: [], arrows: [], callouts: [] };
  }

  const { geometry, cycle, p, T, V } = thermoState;
  const rInner = (geometry.B ?? 0.08) / 2; // 0.040 m
  const a = geometry.a ?? 0.04;
  const lb = geometry.lb ?? 0.13;
  const hp = geometry.hp ?? 0.03;
  const L = geometry.L ?? 0.08;
  const hc = geometry.hc ?? 0.01;
  const yPmsCrown = a + lb + hp; // 0.200 m
  const yPmiCrown = yPmsCrown - L; // 0.120 m
  const yCorona = geometry.y_corona ?? yPmsCrown;
  const yCulata = geometry.y_culata ?? (yPmsCrown + hc);
  const valves = geometry.valves || { intakeLift: 0, exhaustLift: 0, camAngleDeg: 0 };

  const brackets = [];
  const arrows = [];
  const callouts = [];

  switch (stationIndex) {
    case 1:
      brackets.push(
        {
          id: 'bore',
          from: pt(-rInner, yPmsCrown + 0.018, 0),
          to: pt(rInner, yPmsCrown + 0.018, 0),
          labelOffsetPx: { dx: 0, dy: -16 },
          label: `B = ${(geometry.B * 1000).toFixed(0)} mm`,
          color: '#38bdf8'
        },
        {
          id: 'stroke',
          from: pt(-rInner - 0.022, yPmiCrown, 0),
          to: pt(-rInner - 0.022, yPmsCrown, 0),
          labelOffsetPx: { dx: -52, dy: 0 },
          label: `L = ${(L * 1000).toFixed(0)} mm`,
          color: '#fbbf24'
        }
      );
      callouts.push({
        id: 'cycle-720',
        anchor: pt(0, 0, 0),
        boxOffsetPx: { dx: 115, dy: 12 },
        title: 'Ciclo 720° (2 vueltas)',
        subtitle: `Vd = ${(geometry.Vd * 1e6).toFixed(2)} cm³`,
        color: '#38bdf8',
        tone: 'info'
      });
      break;

    case 2: {
      const fGasKn = (p * geometry.A) / 1000;
      const forceRatio = Math.min(1, Math.max(0.08, p / cycle.p3));
      const arrowLenMeters = 0.014 + forceRatio * 0.044;
      const deltaMm = geometry.delta_mas * 1000;
      const deltaSign = deltaMm >= 0 ? '+' : '';
      const isPeak = fGasKn >= 15;

      arrows.push({
        id: 'force-gas',
        from: pt(0, yCorona + arrowLenMeters, 0),
        to: pt(0, yCorona + 0.002, 0),
        labelOffsetPx: { dx: 62, dy: -8 },
        label: `F_gas = ${fGasKn.toFixed(2)} kN`,
        color: isPeak ? '#ef4444' : '#f59e0b'
      });
      callouts.push({
        id: 'delta-mas',
        anchor: pt(0.115, (yPmsCrown + yPmiCrown) / 2, 0),
        boxOffsetPx: { dx: -52, dy: -68 },
        title: `Desvío Δs = ${deltaSign}${deltaMm.toFixed(2)} mm`,
        subtitle: 'Trazo real vs. M.A.S. ideal',
        color: '#a855f7',
        tone: 'info'
      });
      break;
    }

    case 3: {
      const liftMm = valves.intakeLift * 1000;
      const liftVisual = Math.max(0.003, valves.intakeLift);
      brackets.push({
        id: 'hv-intake',
        from: pt(-0.017, yCulata, 0),
        to: pt(-0.017, yCulata - liftVisual, 0),
        labelOffsetPx: { dx: -76, dy: 4 },
        label: `h_v = ${liftMm.toFixed(1)} mm`,
        color: '#38bdf8'
      });
      callouts.push({
        id: 'intake-vol',
        anchor: pt(0, (yCulata + yCorona) / 2, 0),
        boxOffsetPx: { dx: 98, dy: 12 },
        title: `V(θ) = ${(V * 1e6).toFixed(1)} cm³`,
        subtitle: `p₁ = ${(cycle.p1 / 1000).toFixed(0)} kPa · T₁ = ${cycle.T1.toFixed(0)} K`,
        color: '#38bdf8',
        tone: 'info'
      });
      break;
    }

    case 4: {
      const isRisk = T > 750;
      brackets.push({
        id: 'hc-clearance',
        from: pt(-rInner - 0.008, yPmsCrown, 0),
        to: pt(-rInner - 0.008, yCulata, 0),
        labelOffsetPx: { dx: -82, dy: -10 },
        label: `h_c = ${(hc * 1000).toFixed(1)} mm`,
        color: '#fbbf24'
      });
      callouts.push({
        id: 'knocking-guard',
        anchor: pt(rInner, (yPmsCrown + yCulata) / 2, 0),
        boxOffsetPx: { dx: 82, dy: -20 },
        title: `T(θ) = ${T.toFixed(1)} K (Vc = ${(geometry.Vc * 1e6).toFixed(2)} cm³)`,
        subtitle: isRisk ? 'Zona riesgo knocking' : 'Seguro bajo límite knocking (rc > 12)',
        color: isRisk ? '#ef4444' : '#f59e0b',
        tone: isRisk ? 'warning' : 'safe'
      });
      break;
    }

    case 5: {
      const fGasKn = (p * geometry.A) / 1000;
      const forceRatio = Math.min(1, Math.max(0.12, p / cycle.p3));
      const arrowLenMeters = 0.014 + forceRatio * 0.036;

      callouts.push({
        id: 'spark-qin',
        anchor: pt(0, yCulata - 0.002, 0),
        boxOffsetPx: { dx: 52, dy: -28 },
        title: `Chispa Q_in = ${cycle.Qin.toFixed(0)} J`,
        subtitle: `p = ${(p / 1000).toFixed(1)} kPa · T = ${T.toFixed(0)} K`,
        color: '#ef4444',
        tone: 'warning'
      });
      arrows.push({
        id: 'power-thrust',
        from: pt(0, yCorona + arrowLenMeters, 0),
        to: pt(0, yCorona + 0.002, 0),
        labelOffsetPx: { dx: -90, dy: 0 },
        label: `Empuje ${fGasKn.toFixed(1)} kN`,
        color: '#ef4444'
      });
      break;
    }

    case 6: {
      const liftMm = valves.exhaustLift * 1000;
      const liftVisual = Math.max(0.003, valves.exhaustLift);
      brackets.push({
        id: 'hv-exhaust',
        from: pt(0.017, yCulata, 0),
        to: pt(0.017, yCulata - liftVisual, 0),
        labelOffsetPx: { dx: -78, dy: -6 },
        label: `h_v = ${liftMm.toFixed(1)} mm`,
        color: '#94a3b8'
      });
      callouts.push(
        {
          id: 'cam-ratio',
          anchor: pt(-0.017, yCulata + 0.044, 0),
          boxOffsetPx: { dx: -78, dy: -28 },
          title: 'Relación 1:2 en levas',
          subtitle: `θ/2 = ${valves.camAngleDeg.toFixed(1)}°`,
          color: '#38bdf8',
          tone: 'info'
        },
        {
          id: 'qout-exhaust',
          anchor: pt(0.068, yCulata + 0.024, 0),
          boxOffsetPx: { dx: 76, dy: -6 },
          title: `Q_out = ${cycle.Qout.toFixed(1)} J`,
          subtitle: 'Calor cedido al escape',
          color: '#94a3b8',
          tone: 'info'
        }
      );
      break;
    }

    case 7: {
      const yMidChamber = (yCulata + yCorona) / 2;
      arrows.push(
        {
          id: 'verdict-scatter-wall',
          from: pt(0, yMidChamber, 0),
          to: pt(-rInner + 0.003, yMidChamber, 0),
          color: '#fbbf24'
        },
        {
          id: 'verdict-piston-push',
          from: pt(0, yCorona + 0.022, 0),
          to: pt(0, yCorona + 0.002, 0),
          labelOffsetPx: { dx: 72, dy: 24 },
          label: 'Empuje útil',
          color: '#10b981'
        }
      );
      callouts.push(
        {
          id: 'verdict-qin',
          anchor: pt(0, yCulata, 0),
          boxOffsetPx: { dx: 92, dy: -48 },
          title: `Q_in = ${cycle.Qin.toFixed(0)} J`,
          subtitle: 'Explosión en toda dirección',
          color: '#ef4444',
          tone: 'warning'
        },
        {
          id: 'verdict-qout',
          anchor: pt(-rInner, yMidChamber, 0),
          boxOffsetPx: { dx: -86, dy: 8 },
          title: 'Choques a los lados',
          subtitle: `Q_out = ${cycle.Qout.toFixed(1)} J`,
          color: '#fbbf24',
          tone: 'warning'
        },
        {
          id: 'verdict-wneto',
          anchor: pt(0, 0, 0),
          boxOffsetPx: { dx: 0, dy: 18 },
          title: `W_neto = +${cycle.Wneto.toFixed(1)} J · ${(cycle.P / 1000).toFixed(2)} kW`,
          subtitle: `Solo una parte empuja (η = ${(cycle.eta * 100).toFixed(2)}%)`,
          color: '#10b981',
          tone: 'safe'
        }
      );
      break;
    }

    default:
      break;
  }

  return { brackets, arrows, callouts };
}

/**
 * Crea el controlador SVG superpuesto al lienzo 3D para las cotas blueprint del Modo Exposición.
 */
export function createBlueprintOverlay({ container, document: customDoc } = {}) {
  const doc = customDoc || (typeof document !== 'undefined' ? document : null);
  if (!doc || !container) {
    throw new Error('createBlueprintOverlay requiere container y document');
  }

  function createSvgEl(tag) {
    if (typeof doc.createElementNS === 'function') {
      return doc.createElementNS(SVG_NS, tag);
    }
    return doc.createElement(tag);
  }

  const svg = createSvgEl('svg');
  svg.setAttribute('class', 'blueprint-overlay');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.display = 'none';
  container.appendChild(svg);

  let visible = false;

  function clearSvg() {
    if (typeof svg.replaceChildren === 'function') {
      svg.replaceChildren();
    } else {
      svg.innerHTML = '';
    }
  }

  function appendLine(parent, x1, y1, x2, y2, className, stroke) {
    const line = createSvgEl('line');
    line.setAttribute('x1', x1.toFixed(1));
    line.setAttribute('y1', y1.toFixed(1));
    line.setAttribute('x2', x2.toFixed(1));
    line.setAttribute('y2', y2.toFixed(1));
    line.setAttribute('class', className);
    if (stroke) line.setAttribute('stroke', stroke);
    parent.appendChild(line);
  }

  function measurePill(title, subtitle) {
    const maxChars = Math.max(title.length, subtitle ? subtitle.length : 0);
    const boxW = Math.max(88, Math.round(maxChars * 6.4 + 22));
    const boxH = subtitle ? 38 : 24;
    return { boxW, boxH };
  }

  function clampPillCenter(cx, cy, boxW, boxH, viewW, viewH) {
    if (!Number.isFinite(viewW) || !Number.isFinite(viewH) || viewW <= 0 || viewH <= 0) {
      return { cx, cy };
    }
    const leftPanelRight = 20 + Math.min(310, Math.max(255, viewW * 0.21)) + 8;
    const rightPanelLeft = viewW - 20 - Math.min(345, Math.max(290, viewW * 0.235)) - 8;
    const topSafe = 76 + boxH / 2;
    const botSafe = Math.max(topSafe, viewH - 62 - boxH / 2);

    let safeCx = cx;
    if (rightPanelLeft - leftPanelRight > boxW) {
      safeCx = Math.max(leftPanelRight + boxW / 2, Math.min(rightPanelLeft - boxW / 2, cx));
    } else {
      safeCx = Math.max(boxW / 2 + 8, Math.min(viewW - boxW / 2 - 8, cx));
    }
    const safeCy = Math.max(topSafe, Math.min(botSafe, cy));
    return { cx: safeCx, cy: safeCy };
  }

  function appendPill(parent, cx, cy, title, subtitle, strokeColor, viewW = 0, viewH = 0) {
    const { boxW, boxH } = measurePill(title, subtitle);
    const clamped = clampPillCenter(cx, cy, boxW, boxH, viewW, viewH);
    const bx = clamped.cx - boxW / 2;
    const by = clamped.cy - boxH / 2;

    const rect = createSvgEl('rect');
    rect.setAttribute('x', bx.toFixed(1));
    rect.setAttribute('y', by.toFixed(1));
    rect.setAttribute('width', String(boxW));
    rect.setAttribute('height', String(boxH));
    rect.setAttribute('rx', '6');
    rect.setAttribute('class', 'bp-pill');
    if (strokeColor) rect.setAttribute('stroke', strokeColor);
    parent.appendChild(rect);

    const t1 = createSvgEl('text');
    t1.setAttribute('x', clamped.cx.toFixed(1));
    t1.setAttribute('y', (subtitle ? clamped.cy - 3 : clamped.cy + 4).toFixed(1));
    t1.setAttribute('text-anchor', 'middle');
    t1.setAttribute('class', 'bp-text bp-text-title');
    if (strokeColor) t1.setAttribute('fill', strokeColor);
    t1.textContent = title;
    parent.appendChild(t1);

    if (subtitle) {
      const t2 = createSvgEl('text');
      t2.setAttribute('x', clamped.cx.toFixed(1));
      t2.setAttribute('y', (clamped.cy + 12).toFixed(1));
      t2.setAttribute('text-anchor', 'middle');
      t2.setAttribute('class', 'bp-text bp-text-sub');
      t2.textContent = subtitle;
      parent.appendChild(t2);
    }

    return clamped;
  }

  return {
    show() {
      visible = true;
      svg.style.display = 'block';
    },
    hide() {
      visible = false;
      svg.style.display = 'none';
      clearSvg();
    },
    isVisible() {
      return visible;
    },
    update(stationIndex, thermoState, projectFn, viewportSize) {
      if (!visible) return;

      const w = viewportSize?.width;
      const h = viewportSize?.height;
      if (
        !thermoState ||
        typeof projectFn !== 'function' ||
        !Number.isFinite(w) ||
        !Number.isFinite(h) ||
        w <= 0 ||
        h <= 0
      ) {
        clearSvg();
        return;
      }

      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      const spec = buildBlueprintSpec(stationIndex, thermoState);
      const group = createSvgEl('g');
      group.setAttribute('class', 'bp-layer-group');

      // 1. Cotas con remates
      for (const br of spec.brackets) {
        const p1 = projectFn(br.from.x, br.from.y, br.from.z, w, h);
        const p2 = projectFn(br.to.x, br.to.y, br.to.z, w, h);
        if (!isValidPt(p1) || !isValidPt(p2)) continue;

        appendLine(group, p1.x, p1.y, p2.x, p2.y, 'bp-bracket', br.color);
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * 5;
        const ny = (dx / len) * 5;
        appendLine(group, p1.x - nx, p1.y - ny, p1.x + nx, p1.y + ny, 'bp-bracket', br.color);
        appendLine(group, p2.x - nx, p2.y - ny, p2.x + nx, p2.y + ny, 'bp-bracket', br.color);

        const midX = (p1.x + p2.x) / 2 + (br.labelOffsetPx?.dx ?? 0);
        const midY = (p1.y + p2.y) / 2 + (br.labelOffsetPx?.dy ?? 0);
        appendPill(group, midX, midY, br.label, '', br.color, w, h);
      }

      // 2. Vectores dinámicos de fuerza
      for (const arr of spec.arrows) {
        const p1 = projectFn(arr.from.x, arr.from.y, arr.from.z, w, h);
        const p2 = projectFn(arr.to.x, arr.to.y, arr.to.z, w, h);
        if (!isValidPt(p1) || !isValidPt(p2)) continue;

        appendLine(group, p1.x, p1.y, p2.x, p2.y, 'bp-arrow', arr.color);
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const px = -uy;
        const py = ux;
        const headLen = 9;
        const headHalf = 5;
        const basePtX = p2.x - ux * headLen;
        const basePtY = p2.y - uy * headLen;

        const poly = createSvgEl('polygon');
        poly.setAttribute(
          'points',
          `${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${(basePtX + px * headHalf).toFixed(1)},${(basePtY + py * headHalf).toFixed(1)} ${(basePtX - px * headHalf).toFixed(1)},${(basePtY - py * headHalf).toFixed(1)}`
        );
        poly.setAttribute('fill', arr.color);
        group.appendChild(poly);

        if (arr.label) {
          const lx = p1.x + (arr.labelOffsetPx?.dx ?? 0);
          const ly = p1.y + (arr.labelOffsetPx?.dy ?? 0);
          const { boxW, boxH } = measurePill(arr.label, '');
          const clamped = clampPillCenter(lx, ly, boxW, boxH, w, h);
          appendLine(group, p1.x, p1.y, clamped.cx, clamped.cy, 'bp-line', arr.color);
          appendPill(group, clamped.cx, clamped.cy, arr.label, '', arr.color, w, h);
        }
      }

      // 3. Callouts anclados
      for (const co of spec.callouts) {
        const anchorPx = projectFn(co.anchor.x, co.anchor.y, co.anchor.z, w, h);
        if (!isValidPt(anchorPx)) continue;

        const bx = anchorPx.x + (co.boxOffsetPx?.dx ?? 0);
        const by = anchorPx.y + (co.boxOffsetPx?.dy ?? 0);
        const { boxW, boxH } = measurePill(co.title, co.subtitle);
        const clamped = clampPillCenter(bx, by, boxW, boxH, w, h);
        appendLine(group, anchorPx.x, anchorPx.y, clamped.cx, clamped.cy, 'bp-line', co.color);

        const dot = createSvgEl('circle');
        dot.setAttribute('cx', anchorPx.x.toFixed(1));
        dot.setAttribute('cy', anchorPx.y.toFixed(1));
        dot.setAttribute('r', '3.5');
        dot.setAttribute('fill', co.color);
        group.appendChild(dot);

        appendPill(group, clamped.cx, clamped.cy, co.title, co.subtitle, co.color, w, h);
      }

      if (group.children.length === 0) {
        clearSvg();
      } else if (typeof svg.replaceChildren === 'function') {
        svg.replaceChildren(group);
      } else {
        clearSvg();
        svg.appendChild(group);
      }
    },
    destroy() {
      this.hide();
      if (svg.parentNode) {
        svg.parentNode.removeChild(svg);
      }
    }
  };
}
