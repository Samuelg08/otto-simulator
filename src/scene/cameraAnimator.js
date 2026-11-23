/**
 * Módulo cinemático de interpolación de cámara para Three.js ("Modo Keynote 3D").
 * Proporciona transiciones suaves entre encuadres de estación mediante flexibilización
 * cúbica (easeInOutCubic) y sincronización con OrbitControls.
 */

/**
 * Curva de flexibilización cúbica (ease-in-out cubic) con aceleración y desaceleración suaves.
 * Satisface:
 * - t <= 0: 0
 * - t >= 1: 1
 * - t < 0.5: 4 * t^3
 * - t >= 0.5: 1 - (-2t + 2)^3 / 2
 *
 * @param {number} t Parámetro normalizado de progreso en [0, 1].
 * @returns {number} Factor de interpolación flexibilizado en [0, 1].
 */
export function easeInOutCubic(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Extrae las componentes (x, y, z) numéricas de un objeto plano, array o Vector3.
 *
 * @private
 * @param {Object|Array|null} v Vector de entrada.
 * @param {{x: number, y: number, z: number}} defaultVal Valor de respaldo por defecto.
 * @returns {{x: number, y: number, z: number}}
 */
function extractCoords(v, defaultVal = { x: 0, y: 0, z: 0 }) {
  if (!v) return { ...defaultVal };
  if (Array.isArray(v)) {
    return {
      x: typeof v[0] === 'number' ? v[0] : defaultVal.x,
      y: typeof v[1] === 'number' ? v[1] : defaultVal.y,
      z: typeof v[2] === 'number' ? v[2] : defaultVal.z
    };
  }
  return {
    x: typeof v.x === 'number' ? v.x : defaultVal.x,
    y: typeof v.y === 'number' ? v.y : defaultVal.y,
    z: typeof v.z === 'number' ? v.z : defaultVal.z
  };
}

/**
 * Asigna coordenadas (x, y, z) a un objeto o instancia Three.js usando .set() si existe.
 *
 * @private
 * @param {Object|null} target Objeto de destino.
 * @param {{x: number, y: number, z: number}} coords Coordenadas a asignar.
 */
function assignCoords(target, { x, y, z }) {
  if (!target) return;
  if (typeof target.set === 'function') {
    target.set(x, y, z);
  } else {
    target.x = x;
    target.y = y;
    target.z = z;
  }
}

/**
 * Interpola linealmente las componentes (x, y, z) entre start y end con factor progress.
 * Maneja objetos planos {x, y, z}, arrays [x, y, z] o instancias THREE.Vector3.
 * Si se suministra out, actualiza dicho objeto y lo retorna; en caso contrario retorna {x, y, z}.
 *
 * @param {Object|Array} start Vector origen
 * @param {Object|Array} end Vector destino
 * @param {number} progress Factor de avance [0, 1]
 * @param {Object|null} [out=null] Objeto opcional para recibir el resultado
 * @returns {{x: number, y: number, z: number}|Object}
 */
export function interpolateVector(start, end, progress, out = null) {
  const s = extractCoords(start);
  const e = extractCoords(end);
  const result = {
    x: s.x + (e.x - s.x) * progress,
    y: s.y + (e.y - s.y) * progress,
    z: s.z + (e.z - s.z) * progress
  };

  if (out) {
    assignCoords(out, result);
    return out;
  }

  return result;
}

/**
 * Gestor de animación cinemática para la cámara y los controles de órbita.
 *
 * @param {Object} camera Cámara Three.js (OrthographicCamera o PerspectiveCamera)
 * @param {Object|null} [controls=null] OrbitControls asociados a la cámara
 * @returns {{
 *   transitionTo: (targetPos: Object|Array, targetLookAt: Object|Array, durationSeconds?: number) => void,
 *   update: (dtSeconds: number) => boolean,
 *   isAnimating: () => boolean,
 *   cancel: () => void
 * }}
 */
export function createCameraAnimator(camera, controls = null) {
  let animating = false;
  let duration = 1.0;
  let elapsed = 0;

  const startPos = { x: 0, y: 0, z: 0 };
  const endPos = { x: 0, y: 0, z: 0 };
  const startTarget = { x: 0, y: 0, z: 0 };
  const endTarget = { x: 0, y: 0, z: 0 };
  const currentTarget = { x: 0, y: 0, z: 0 };

  function applyImmediate(destP, destL) {
    assignCoords(camera?.position, destP);
    assignCoords(currentTarget, destL);

    if (controls?.target) {
      assignCoords(controls.target, destL);
    }
    if (controls && typeof controls.update === 'function') {
      controls.update();
    }
    if (camera && typeof camera.lookAt === 'function') {
      camera.lookAt(destL.x, destL.y, destL.z);
    }
  }

  function transitionTo(targetPos, targetLookAt, durationSeconds = 1.0) {
    const destP = extractCoords(targetPos, extractCoords(camera?.position));
    const destL = extractCoords(
      targetLookAt,
      controls?.target ? extractCoords(controls.target) : currentTarget
    );

    const dur = typeof durationSeconds === 'number' && durationSeconds >= 0 ? durationSeconds : 1.0;

    if (dur === 0) {
      applyImmediate(destP, destL);
      animating = false;
      return;
    }

    const curCamPos = extractCoords(camera?.position);
    startPos.x = curCamPos.x;
    startPos.y = curCamPos.y;
    startPos.z = curCamPos.z;

    endPos.x = destP.x;
    endPos.y = destP.y;
    endPos.z = destP.z;

    const curTarget = controls?.target ? extractCoords(controls.target) : { ...currentTarget };
    startTarget.x = curTarget.x;
    startTarget.y = curTarget.y;
    startTarget.z = curTarget.z;

    endTarget.x = destL.x;
    endTarget.y = destL.y;
    endTarget.z = destL.z;

    duration = dur;
    elapsed = 0;
    animating = true;
  }

  function update(dtSeconds = 0) {
    if (!animating) {
      return false;
    }

    elapsed += Math.max(0, dtSeconds);
    const progress = duration > 0 ? Math.min(elapsed / duration, 1) : 1;
    const easeT = easeInOutCubic(progress);

    // Interpolar posición de cámara
    interpolateVector(startPos, endPos, easeT, camera?.position);

    // Interpolar target de lookAt
    interpolateVector(startTarget, endTarget, easeT, currentTarget);
    if (controls?.target) {
      assignCoords(controls.target, currentTarget);
    }

    if (controls && typeof controls.update === 'function') {
      controls.update();
    }

    if (camera && typeof camera.lookAt === 'function') {
      camera.lookAt(currentTarget.x, currentTarget.y, currentTarget.z);
    }

    if (progress >= 1) {
      animating = false;
      return false;
    }

    return true;
  }

  function isAnimating() {
    return animating;
  }

  function cancel() {
    animating = false;
  }

  return {
    transitionTo,
    update,
    isAnimating,
    cancel
  };
}
