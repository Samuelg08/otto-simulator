/**
 * Diagrama p–V en vivo en Canvas 2D (Hito 4).
 * Fuente de verdad: Secciones 6, 8 y 9 de la Ficha Técnica.
 * Incluye:
 * - Lazo 1 -> 2 -> 3 -> 4 -> 1 en trazo continuo (2->3 y 4->1 verticales).
 * - Admisión y escape a presión constante p1 como línea gris punteada.
 * - Área sombreada con signo (W12 negativo en compresión, W34 positivo en expansión y área neta Wneto).
 * - Lazo fantasma del ajuste anterior para comparar el efecto de rc y Qin.
 * - Escalas: Auto, Fija (0–550 cm³, 0–16 MPa) y Logarítmica (Log p).
 */
export function createPVDiagram(canvas) {
  const ctx = canvas.getContext('2d');
  let scaleMode = 'auto'; // 'auto' | 'fixed' | 'log'

  const pad = { top: 24, right: 18, bottom: 34, left: 48 };
  const vMin = 0;
  const vMax = 550; // Escala fija sugerida en Sección 9: 0 a 550 cm³

  function setScaleMode(mode) {
    scaleMode = mode;
  }

  function getPressureBounds(cycle, ghostCycle) {
    if (scaleMode === 'fixed') {
      return { pMin: 0, pMax: 16.0 }; // 0 a 16 MPa (Sección 9)
    }
    const peakP = Math.max(
      cycle.p3 / 1e6,
      ghostCycle ? ghostCycle.p3 / 1e6 : 0
    );
    if (scaleMode === 'log') {
      return { pMin: 0.08, pMax: Math.max(16.0, peakP * 1.1) };
    }
    const niceMax = Math.max(2.5, Math.ceil((peakP * 1.12) * 2) / 2);
    return { pMin: 0, pMax: niceMax };
  }

  function toX(v_cm3, width) {
    const plotW = width - pad.left - pad.right;
    return pad.left + ((v_cm3 - vMin) / (vMax - vMin)) * plotW;
  }

  function toY(p_MPa, bounds, height) {
    const plotH = height - pad.top - pad.bottom;
    if (scaleMode === 'log') {
      const pClamped = Math.max(bounds.pMin, p_MPa);
      const logMin = Math.log10(bounds.pMin);
      const logMax = Math.log10(bounds.pMax);
      const norm = (Math.log10(pClamped) - logMin) / (logMax - logMin);
      return height - pad.bottom - norm * plotH;
    }
    const norm = (p_MPa - bounds.pMin) / (bounds.pMax - bounds.pMin);
    return height - pad.bottom - norm * plotH;
  }

  function drawGrid(width, height, bounds) {
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.13)';
    ctx.lineWidth = 1;
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';

    // Cuadrícula vertical: Volumen V (0 a 550 cm³)
    for (let v = 0; v <= 550; v += 100) {
      const x = toX(v, width);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, height - pad.bottom);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillText(`${v}`, x, height - pad.bottom + 12);
    }

    // Cuadrícula horizontal: Presión p (MPa)
    const yTicks =
      scaleMode === 'log'
        ? [0.1, 0.2, 0.5, 1, 2, 5, 10, 16]
        : [
            0,
            bounds.pMax * 0.25,
            bounds.pMax * 0.5,
            bounds.pMax * 0.75,
            bounds.pMax
          ];

    for (const pTick of yTicks) {
      if (pTick > bounds.pMax) continue;
      const y = toY(pTick, bounds, height);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();

      ctx.textAlign = 'right';
      const label =
        scaleMode === 'log'
          ? pTick < 1
            ? pTick.toFixed(1)
            : pTick.toFixed(0)
          : pTick.toFixed(1);
      ctx.fillText(label, pad.left - 5, y + 3.5);
    }

    // Títulos de ejes
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 10.5px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Volumen V (cm³)',
      pad.left + (width - pad.left - pad.right) / 2,
      height - 5
    );

    ctx.save();
    ctx.translate(12, pad.top + (height - pad.top - pad.bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(
      scaleMode === 'log' ? 'Presión p (MPa · log)' : 'Presión p (MPa)',
      0,
      0
    );
    ctx.restore();
  }

  function traceAdiabaticCurve(vStart_cm3, vEnd_cm3, pRef_MPa, vRef_cm3, gamma, bounds, width, height, moveFirst = true) {
    const steps = 56;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const v = vStart_cm3 + u * (vEnd_cm3 - vStart_cm3);
      const p = pRef_MPa * Math.pow(vRef_cm3 / v, gamma);
      const x = toX(v, width);
      const y = toY(p, bounds, height);
      if (i === 0 && moveFirst) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }

  function drawGhostLoop(ghostCycle, bounds, width, height) {
    const Vc = ghostCycle.Vc * 1e6;
    const V1 = ghostCycle.V1 * 1e6;
    const p1 = ghostCycle.p1 / 1e6;
    const p2 = ghostCycle.p2 / 1e6;
    const p3 = ghostCycle.p3 / 1e6;
    const p4 = ghostCycle.p4 / 1e6;
    const { gamma } = ghostCycle;

    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.42)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    traceAdiabaticCurve(V1, Vc, p1, V1, gamma, bounds, width, height, true);
    ctx.lineTo(toX(Vc, width), toY(p3, bounds, height));
    traceAdiabaticCurve(Vc, V1, p3, Vc, gamma, bounds, width, height, false);
    ctx.lineTo(toX(V1, width), toY(p1, bounds, height));
    ctx.stroke();

    ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
    ctx.font = '600 9.5px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `Fantasma: rc=${ghostCycle.rc.toFixed(1)}, Qin=${ghostCycle.Qin}J (W=${ghostCycle.Wneto.toFixed(0)}J)`,
      pad.left + 6,
      pad.top + 12
    );
    ctx.restore();
  }

  function drawSignedWorkAreas(thermoState, bounds, width, height) {
    const { cycle, cycleAngle, V } = thermoState;
    const Vc = cycle.Vc * 1e6;
    const V1 = cycle.V1 * 1e6;
    const vNow = V * 1e6;
    const p1 = cycle.p1 / 1e6;
    const p3 = cycle.p3 / 1e6;
    const { gamma } = cycle;
    const yBase = toY(scaleMode === 'log' ? bounds.pMin : 0, bounds, height);

    // 1. Área encerrada del ciclo completo (Wneto > 0)
    ctx.beginPath();
    traceAdiabaticCurve(V1, Vc, p1, V1, gamma, bounds, width, height, true);
    traceAdiabaticCurve(Vc, V1, p3, Vc, gamma, bounds, width, height, false);
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.11)';
    ctx.fill();

    // 2. Área dinámica bajo la curva con signo según la carrera actual
    if (cycleAngle >= 180 && cycleAngle < 360) {
      // Compresión (dV < 0 -> Trabajo W12 negativo realizado sobre el gas)
      ctx.beginPath();
      traceAdiabaticCurve(V1, vNow, p1, V1, gamma, bounds, width, height, true);
      ctx.lineTo(toX(vNow, width), yBase);
      ctx.lineTo(toX(V1, width), yBase);
      ctx.closePath();
      ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
      ctx.fill();
    } else if (cycleAngle >= 360 && cycleAngle < 540) {
      // Expansión (dV > 0 -> Trabajo W34 positivo realizado por el gas)
      ctx.beginPath();
      traceAdiabaticCurve(Vc, vNow, p3, Vc, gamma, bounds, width, height, true);
      ctx.lineTo(toX(vNow, width), yBase);
      ctx.lineTo(toX(Vc, width), yBase);
      ctx.closePath();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.fill();
    }
  }

  function draw(thermoState, ghostCycle = null) {
    const width = canvas.width;
    const height = canvas.height;
    const { cycle } = thermoState;
    const bounds = getPressureBounds(cycle, ghostCycle);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    drawGrid(width, height, bounds);

    if (ghostCycle) {
      drawGhostLoop(ghostCycle, bounds, width, height);
    }

    drawSignedWorkAreas(thermoState, bounds, width, height);

    const Vc = cycle.Vc * 1e6;
    const V1 = cycle.V1 * 1e6;
    const p1 = cycle.p1 / 1e6;
    const p2 = cycle.p2 / 1e6;
    const p3 = cycle.p3 / 1e6;
    const p4 = cycle.p4 / 1e6;
    const { gamma } = cycle;

    // 1. Línea gris punteada de admisión y escape a presión constante p1 (Sección 9)
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(toX(Vc, width), toY(p1, bounds, height));
    ctx.lineTo(toX(V1, width), toY(p1, bounds, height));
    ctx.stroke();
    ctx.restore();

    // 2. Compresión adiabática 1 -> 2 (Ámbar)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    traceAdiabaticCurve(V1, Vc, p1, V1, gamma, bounds, width, height, true);
    ctx.stroke();

    // 3. Salto vertical isocórico de combustión 2 -> 3 y expansión adiabática 3 -> 4 (Rojo)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(toX(Vc, width), toY(p2, bounds, height));
    ctx.lineTo(toX(Vc, width), toY(p3, bounds, height));
    traceAdiabaticCurve(Vc, V1, p3, Vc, gamma, bounds, width, height, false);
    ctx.stroke();

    // 4. Salto vertical isocórico de escape 4 -> 1 (Gris claro)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(toX(V1, width), toY(p4, bounds, height));
    ctx.lineTo(toX(V1, width), toY(p1, bounds, height));
    ctx.stroke();

    // 5. Puntos y etiquetas de los estados principales 1, 2, 3 y 4
    const pts = [
      { label: '1', v: V1, p: p1, dx: 6, dy: -4 },
      { label: '2', v: Vc, p: p2, dx: -12, dy: 3 },
      { label: '3', v: Vc, p: p3, dx: 6, dy: 4 },
      { label: '4', v: V1, p: p4, dx: 6, dy: -5 }
    ];
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 10.5px system-ui, -apple-system, sans-serif';
    for (const pt of pts) {
      const sx = toX(pt.v, width);
      const sy = toY(pt.p, bounds, height);
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(pt.label, sx + pt.dx, sy + pt.dy);
    }

    // 6. Punto móvil sincronizado con el estado instantáneo (V(θ), p(θ))
    const vNow_cm3 = thermoState.V * 1e6;
    const pNow_MPa = thermoState.p / 1e6;
    const px = toX(vNow_cm3, width);
    const py = toY(pNow_MPa, bounds, height);

    ctx.fillStyle = thermoState.phase.color;
    ctx.beginPath();
    ctx.arc(px, py, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 7. Leyenda de áreas con signo en la esquina superior derecha
    ctx.font = '600 9.5px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#10b981';
    ctx.fillText(
      `∮ p dV = Wneto = +${cycle.Wneto.toFixed(1)} J`,
      width - pad.right - 4,
      pad.top + 11
    );
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(
      `W12: ${cycle.W12.toFixed(1)} J · W34: +${cycle.W34.toFixed(1)} J`,
      width - pad.right - 4,
      pad.top + 23
    );
  }

  return {
    draw,
    setScaleMode
  };
}