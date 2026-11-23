/**
 * Dial circular interactivo del ciclo de 4 tiempos (0° a 720°) en Canvas 2D.
 * Permite arrastrar con el ratón para posicionar manualmente el ángulo theta del cigüeñal.
 */
export function createCycleDial(canvas, { onScrubTheta } = {}) {
  const ctx = canvas.getContext('2d');

  const sectors = [
    { id: 'admision', name: 'ADM', startDeg: 0, endDeg: 180, color: '#38bdf8' },
    { id: 'compresion', name: 'COMP', startDeg: 180, endDeg: 360, color: '#f59e0b' },
    { id: 'expansion', name: 'EXP', startDeg: 360, endDeg: 540, color: '#ef4444' },
    { id: 'escape', name: 'ESC', startDeg: 540, endDeg: 720, color: '#94a3b8' }
  ];

  function degToRad(cycleDeg) {
    return -Math.PI / 2 + (cycleDeg / 720) * Math.PI * 2;
  }

  let isDragging = false;

  function pointerToCycleDeg(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    let angleRad = Math.atan2(y, x) + Math.PI / 2;
    if (angleRad < 0) angleRad += Math.PI * 2;
    return (angleRad / (Math.PI * 2)) * 720;
  }

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    canvas.setPointerCapture(e.pointerId);
    if (onScrubTheta) onScrubTheta(pointerToCycleDeg(e));
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    if (onScrubTheta) onScrubTheta(pointerToCycleDeg(e));
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    canvas.releasePointerCapture(e.pointerId);
  });

  function draw(thermoState) {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const rArc = Math.min(cx, cy) - 22;

    const cycleAngle = thermoState.cycleAngle % 720;
    const { phase, geometry } = thermoState;
    const { valves } = geometry;

    ctx.clearRect(0, 0, w, h);

    for (const sec of sectors) {
      const a0 = degToRad(sec.startDeg);
      const a1 = degToRad(sec.endDeg);
      const active = sec.id === phase.id;

      ctx.beginPath();
      ctx.arc(cx, cy, rArc, a0 + 0.03, a1 - 0.03);
      ctx.strokeStyle = sec.color;
      ctx.lineWidth = active ? 13 : 8;
      ctx.globalAlpha = active ? 1.0 : 0.32;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      const aMid = (a0 + a1) / 2;
      ctx.fillStyle = active ? '#0f172a' : '#cbd5e1';
      ctx.font = '700 8.5px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sec.name, cx + Math.cos(aMid) * rArc, cy + Math.sin(aMid) * rArc);
    }

    ctx.font = '600 8px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('0° PMS', cx, 8);
    ctx.fillText('180°', cx + rArc + 13, cy);
    ctx.fillText('540°', cx - rArc - 13, cy);

    const sparkGlow = Math.abs(cycleAngle - 360) <= 25;
    ctx.fillStyle = sparkGlow ? '#fef08a' : '#f59e0b';
    ctx.font = '700 8.5px system-ui, -apple-system, sans-serif';
    ctx.fillText('360°⚡', cx, h - 7);

    const needleRad = degToRad(cycleAngle);
    const nx = cx + Math.cos(needleRad) * (rArc - 3);
    const ny = cy + Math.sin(needleRad) * (rArc - 3);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = phase.color;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, rArc - 14, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    ctx.fillStyle = phase.color;
    ctx.font = '700 9.5px system-ui, -apple-system, sans-serif';
    ctx.fillText(phase.name.toUpperCase(), cx, cy - 9);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '700 10.5px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${cycleAngle.toFixed(1)}°`, cx, cy + 3);

    const valveStatus = valves.intakeOpen
      ? 'ADM: ABIERTA'
      : valves.exhaustOpen
        ? 'ESC: ABIERTA'
        : 'VÁLV: CERRADAS';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 7.5px system-ui, -apple-system, sans-serif';
    ctx.fillText(valveStatus, cx, cy + 15);
  }

  return { draw };
}