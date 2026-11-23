import { s, s_mas, getCyclePhase, normalizeCycleAngle } from '../model/geometry.js';

/**
 * Registrador en vivo del trazo del pistón en Canvas 2D:
 * A la izquierda se muestra el esquema del pistón subiendo y bajando dentro del cilindro;
 * de su corona sale un brazo trazador que deja un rastro continuo desplazándose hacia la
 * derecha y formando la onda senoidal en tiempo real.
 */
export function createKinematicsDiagram(canvas) {
  const ctx = canvas.getContext('2d');

  const pad = { top: 26, right: 16, bottom: 28, left: 74 };
  const maxSpanDeg = 720;

  let tracedSpanDeg = 0;
  let prevCycleAngle = null;

  function toTraceX(ageDeg, width) {
    const plotW = width - pad.left - pad.right;
    return pad.left + (ageDeg / maxSpanDeg) * plotW;
  }

  function toPistonY(sMeters, L, height) {
    const plotH = height - pad.top - pad.bottom;
    return pad.top + (sMeters / L) * plotH;
  }

  function draw(geoState) {
    const width = canvas.width;
    const height = canvas.height;
    const { L } = geoState;

    const curAngle = normalizeCycleAngle(geoState.theta);
    if (prevCycleAngle !== null) {
      let delta = curAngle - prevCycleAngle;
      if (delta < -360) delta += 720;
      if (delta > 360) delta -= 720;
      tracedSpanDeg = Math.min(maxSpanDeg, Math.max(0, tracedSpanDeg + Math.abs(delta)));
    }
    prevCycleAngle = curAngle;

    const phase = getCyclePhase(geoState.theta);

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';

    const yGuides = [
      { sVal: 0, label: 'PMS 0.00m' },
      { sVal: L / 2, label: '0.04m' },
      { sVal: L, label: 'PMI 0.08m' }
    ];
    for (const g of yGuides) {
      const y = toPistonY(g.sVal, L, height);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
    }

    for (let deg = 0; deg <= maxSpanDeg; deg += 180) {
      const x = toTraceX(deg, width);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, height - pad.bottom);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillText(deg === 0 ? 'Pistón (ahora)' : `−${deg}°`, x, height - 8);
    }

    const cylX = 16;
    const cylW = 30;
    const cylTop = pad.top - 4;
    const cylBot = height - pad.bottom + 14;

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cylX, cylTop, cylW, cylBot - cylTop);

    const yCrown = toPistonY(geoState.s, L, height);
    ctx.fillStyle = phase.color + '44';
    ctx.fillRect(cylX + 1, cylTop + 1, cylW - 2, Math.max(1, yCrown - cylTop - 1));

    const pistonH = 12;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cylX + 2, yCrown, cylW - 4, pistonH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.strokeRect(cylX + 2, yCrown, cylW - 4, pistonH);

    const penX = pad.left;
    ctx.save();
    ctx.setLineDash([3, 2]);
    ctx.strokeStyle = phase.color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cylX + cylW - 2, yCrown);
    ctx.lineTo(penX, yCrown);
    ctx.stroke();
    ctx.restore();

    const stepDeg = 3;

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let age = 0; age <= tracedSpanDeg; age += stepDeg) {
      const sampleTheta = geoState.theta - age;
      const x = toTraceX(age, width);
      const yMas = toPistonY(s_mas(sampleTheta, geoState), L, height);
      if (age === 0) ctx.moveTo(x, yMas);
      else ctx.lineTo(x, yMas);
    }
    ctx.stroke();
    ctx.restore();

    for (let age = 0; age + stepDeg <= tracedSpanDeg; age += stepDeg) {
      const thetaA = geoState.theta - age;
      const thetaB = geoState.theta - (age + stepDeg);
      const segPhase = getCyclePhase(thetaA);

      ctx.strokeStyle = segPhase.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(toTraceX(age, width), toPistonY(s(thetaA, geoState), L, height));
      ctx.lineTo(toTraceX(age + stepDeg, width), toPistonY(s(thetaB, geoState), L, height));
      ctx.stroke();
    }

    const yMasNow = toPistonY(geoState.s_mas, L, height);
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(penX, yMasNow, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = phase.color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(penX, yCrown, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 10.5px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = phase.color;
    ctx.fillText(`● Trazo pistón s: ${geoState.s.toFixed(4)} m`, 14, 15);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(
      `○ M.A.S.: ${geoState.s_mas.toFixed(4)} m (Δs: +${geoState.delta_mas.toFixed(4)} m)`,
      width - pad.right,
      15
    );
  }

  return { draw };
}