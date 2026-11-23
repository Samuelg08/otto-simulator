# Modo Presentación "Keynote 3D" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar el simulador del motor monocilíndrico en una experiencia expositiva cinematográfica de 10 minutos a pantalla completa ("Modo Keynote 3D"), con navegación por teclado, interpolación suave de cámara Three.js, tarjetas flotantes HUD con glassmorphism y bucle didáctico continuo por fase.

**Architecture:** Se desacopla el estado de la presentación (`presentationState.js`) como una máquina de estados pura y testeable que orquesta las 7 estaciones y la cinemática de $\theta$. Un interpolador de cámara (`cameraAnimator.js`) gestiona los vuelos suaves de Three.js sin bloquear los controles orbitales manuales. La interfaz HUD (`presentationHUD.js`) inyecta tarjetas semitransparentes sobre el lienzo 3D que alojan las fórmulas, el cronómetro de 10 minutos y la telemetría del diagrama p–V desacoplada del panel lateral.

**Tech Stack:** Three.js 0.170.0, Canvas 2D, Vanilla JavaScript (ES Modules), CSS3 moderno (Glassmorphism / CSS Grid), Vite 5.4.11, Vitest 2.1.5.

**Spec:** `docs/superpowers/specs/2026-11-05-modo-presentacion-keynote-design.md`

## Global Constraints

- Pila técnica fija: JavaScript ES Modules nativo, Three.js 0.170.0, Vitest 2.1.5, Vite 5.4.11; sin dependencias npm pesadas adicionales.
- Valores numéricos exactos de Física 2 reproducidos al pie de la letra: $B = 80\text{ mm}$, $L = 80\text{ mm}$, $l_b = 130\text{ mm}$, $V_d = 402.12\text{ cm}^3$, $V_c = 50.27\text{ cm}^3$, $r_c = 9$, $Q_{in} = 700\text{ J}$, $p_1 = 100\text{ kPa}$, $T_1 = 300\text{ K}$, $p_2 = 2167.4\text{ kPa}$, $T_2 = 722.5\text{ K}$, $p_3 = 7737.8\text{ kPa}$, $T_3 = 2579.3\text{ K}$, $p_4 = 357.0\text{ kPa}$, $T_4 = 1071.0\text{ K}$, $W_{12} = -159.3\text{ J}$, $W_{34} = +568.6\text{ J}$, $W_{neto} = +409.3\text{ J}$, $Q_{out} = 290.7\text{ J}$, $\eta = 58.48\%$, $P = 10.23\text{ kW}$ (a $3000\text{ rpm}$).
- Inclusión explícita en tarjetas y guión de los dos énfasis docentes: límite de $V_c$ para evitar autoignición prematura (detonación), e imperfección del M.A.S. debida a la oblicuidad geométrica de la biela finita ($130\text{ mm}$) y a la fuerza impulsora periódica de la combustión ($F = p \cdot A$ en $360^\circ$).
- Control por teclado unificado: `Espacio` / `→` avanza estación, `←` retrocede, `P` pausa/reanuda ciclo, `K` o `Escape` activa/desactiva modo presentación.

## Review Focus

1. **Reinicio de la onda senoidal durante bucles angulares de fase:** En estaciones 3 a 6 (donde $\theta$ cicla en rangos como $0^\circ \to 180^\circ$ o $180^\circ \to 360^\circ$), el trazador senoidal 3D no debe acumular saltos gráficos abruptos ni corromper el histórico de coordenadas.
2. **Concurrencia entre interpolación cinemática de cámara y manipulación del ratón:** Si el expositor arrastra con el ratón durante o después de una interpolación de cámara para responder una duda, la cámara no debe saltar bruscamente ni bloquearse.
3. **Persistencia y precisión del cronómetro al pausar:** Al pausar el motor con la tecla `P`, el cronómetro de la presentación debe poder pausar o continuar sin perder la referencia del tiempo total de 10 minutos.
4. **Desacoplamiento visual del canvas p–V:** Al ocultar `#sidebar` en modo presentación, el canvas `#pv-canvas` debe renderizarse nítidamente dentro del HUD sin perder resolución ni deformar sus proporciones de aspecto.
5. **Transición limpia al salir del modo presentación (tecla `K` o `Escape`):** Al regresar al simulador estándar, el panel lateral y los controles originales deben restaurarse de inmediato y la cámara debe volver a su vista ortográfica base sin recargar la página.

---

### Task 1: Modelo de Datos y Máquina de Estados de la Presentación

**Files:**
- Create: `src/presentation/presentationState.js`
- Test: `tests/presentationState.test.js`

**Interfaces:**
- Consumes: `DEFAULT_PARAMS` de `src/model/geometry.js`
- Produces:
  - `STATIONS`: Array inmutable de 7 objetos con metadatos, cotas físicas, rangos angulares, textos explicativos y objetivos de cámara.
  - `createPresentationState(initialActive = false)`: Función que retorna el objeto de estado reactivo con métodos:
    - `nextStation()`: Avanza la estación (clamped a 7).
    - `prevStation()`: Retrocede estación (clamped a 1).
    - `goToStation(index)`: Salta a estación 1..7.
    - `toggleActive()`: Alterna el modo presentación.
    - `togglePause()`: Alterna pausa de movimiento.
    - `tickTimer(dtSeconds)`: Avanza el cronómetro hasta 600 segundos (10:00).
    - `computeTheta(currentTheta, dtSeconds, omegaBase)`: Retorna el nuevo ángulo $\theta$ respetando el modo de movimiento de la estación actual (bucle en fases 3..6, continuo en 1, 2 y 7).

- [ ] **Step 1: Escribir el test unitario fallido para la máquina de estados de presentación**

Crear `tests/presentationState.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { createPresentationState, STATIONS } from '../src/presentation/presentationState.js';

describe('presentationState · Máquina de estados de los 10 minutos', () => {
  it('contiene exactamente 7 estaciones con todos los campos obligatorios y valores físicos', () => {
    expect(STATIONS).toHaveLength(7);
    for (const st of STATIONS) {
      expect(st.id).toBeDefined();
      expect(st.title).toBeDefined();
      expect(st.badgeColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(st.camera).toHaveProperty('position');
      expect(st.camera).toHaveProperty('target');
      expect(st.motion).toBeDefined();
    }
    // Verificar inclusión de puntos de la profesora en estaciones 2 y 4
    expect(STATIONS[1].physicsNote).toContain('Fuerza externa periódica no armónica');
    expect(STATIONS[3].physicsNote).toContain('Detonación prematura');
  });

  it('inicia inactivo en estación 1 y navega secuencialmente con clamping', () => {
    const p = createPresentationState(false);
    expect(p.isActive()).toBe(false);
    p.toggleActive();
    expect(p.isActive()).toBe(true);
    expect(p.getCurrentStationIndex()).toBe(1);

    p.prevStation(); // Clamping inferior
    expect(p.getCurrentStationIndex()).toBe(1);

    for (let i = 0; i < 10; i++) p.nextStation();
    expect(p.getCurrentStationIndex()).toBe(7); // Clamping superior
  });

  it('calcula theta en bucle didáctico cerrado para las estaciones de fase (3, 4, 5, 6)', () => {
    const p = createPresentationState(true);
    p.goToStation(3); // Admisión: [0, 180)
    const st3 = p.getCurrentStation();
    expect(st3.motion.type).toBe('loop');
    expect(st3.motion.thetaStart).toBe(0);
    expect(st3.motion.thetaEnd).toBe(180);

    let theta = 179;
    theta = p.computeTheta(theta, 0.5, 20); // Debe volver a empezar cerca de 0
    expect(theta).toBeGreaterThanOrEqual(0);
    expect(theta).toBeLessThan(180);
  });
});
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Ejecutar: `npm test`
Resultado esperado: FAIL con "Cannot find module '../src/presentation/presentationState.js'"

- [ ] **Step 3: Implementar `src/presentation/presentationState.js`**

Implementar el módulo con la definición completa de las 7 estaciones (con los textos de Física 2, límites de $V_c$ por autoignición, M.A.S. no armónico por fuerza externa periódica de combustión $F=p\cdot A$, y la lógica de bucle angular por fase).

- [ ] **Step 4: Ejecutar los tests para comprobar que pasan**

Ejecutar: `npm test`
Resultado esperado: PASS (todos los tests de `presentationState.test.js` y `geometry.test.js` en verde).

- [ ] **Step 5: Commit**

```bash
git add src/presentation/presentationState.js tests/presentationState.test.js
git commit -m "feat(presentation): add presentationState module and unit tests"
```

---

### Task 2: Interpolador Cinemático de Cámara Three.js

**Files:**
- Create: `src/scene/cameraAnimator.js`
- Test: `tests/cameraAnimator.test.js`

**Interfaces:**
- Consumes: Objetos `{ position, target }` de las estaciones de `presentationState.js`.
- Produces:
  - `createCameraAnimator(camera, controls)`: Módulo con métodos:
    - `transitionTo(targetPosition, targetLookAt, durationSeconds = 1.0)`
    - `update(dtSeconds)`: Aplica interpolación cúbica suave (`easeInOutCubic`) en cada fotograma.
    - `isAnimating()`: Retorna `boolean`.
    - `cancel()`: Interrumpe la animación si el usuario interactúa manualmente con el ratón.

- [ ] **Step 1: Escribir el test unitario fallido para la interpolación matemática**

Crear `tests/cameraAnimator.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { interpolateVector, easeInOutCubic } from '../src/scene/cameraAnimator.js';

describe('cameraAnimator · Cinemática de cámara', () => {
  it('aplica la curva de aceleración easeInOutCubic en los extremos y centro', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('interpola suavemente vectores tridimensionales entre origen y destino', () => {
    const start = { x: 0, y: 0, z: 0 };
    const end = { x: 10, y: 20, z: 30 };
    const mid = interpolateVector(start, end, 0.5);
    expect(mid.x).toBeCloseTo(5, 4);
    expect(mid.y).toBeCloseTo(10, 4);
    expect(mid.z).toBeCloseTo(15, 4);
  });
});
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Ejecutar: `npm test`
Resultado esperado: FAIL con "Cannot find module '../src/scene/cameraAnimator.js'"

- [ ] **Step 3: Implementar `src/scene/cameraAnimator.js`**

Implementar funciones matemáticas puras (`easeInOutCubic`, `interpolateVector`) y la clase/función integradora `createCameraAnimator` con actualización frame a frame.

- [ ] **Step 4: Ejecutar los tests para comprobar que pasan**

Ejecutar: `npm test`
Resultado esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scene/cameraAnimator.js tests/cameraAnimator.test.js
git commit -m "feat(scene): add cameraAnimator with smooth cubic interpolation"
```

---

### Task 3: Efecto de Ignición y Chispa en Three.js

**Files:**
- Create: `src/scene/sparkEffect.js`
- Modify: `src/scene/engineScene.js`
- Test: `tests/sparkEffect.test.js`

**Interfaces:**
- Consumes: `scene`, `materials` de `src/scene/engineScene.js`
- Produces:
  - `createSparkEffect(scene, options)`: Métodos:
    - `trigger(durationMs = 300)`: Activa pulso lumínico incandescente y material emisivo en electrodos.
    - `update(dtSeconds)`: Decae la intensidad exponencialmente hasta volver al reposo.
    - `isActive()`: Retorna `boolean`.

- [ ] **Step 1: Escribir el test unitario fallido para el decaimiento de intensidad de chispa**

Crear `tests/sparkEffect.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { computeSparkIntensity } from '../src/scene/sparkEffect.js';

describe('sparkEffect · Dinámica lumínica de la combustión', () => {
  it('inicia en 1.0 al dispararse y decae a 0 al expirar la duración', () => {
    expect(computeSparkIntensity(0, 0.3)).toBeCloseTo(1.0, 4);
    expect(computeSparkIntensity(0.15, 0.3)).toBeGreaterThan(0);
    expect(computeSparkIntensity(0.3, 0.3)).toBe(0);
    expect(computeSparkIntensity(0.5, 0.3)).toBe(0);
  });
});
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Ejecutar: `npm test`
Resultado esperado: FAIL con "Cannot find module '../src/scene/sparkEffect.js'"

- [ ] **Step 3: Implementar `src/scene/sparkEffect.js` y conectar a `engineScene.js`**

Crear el gestor de destello y añadir método `triggerSpark()` a la escena de `engineScene.js`.

- [ ] **Step 4: Ejecutar los tests para comprobar que pasan**

Ejecutar: `npm test`
Resultado esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scene/sparkEffect.js src/scene/engineScene.js tests/sparkEffect.test.js
git commit -m "feat(scene): add sparkEffect with decay dynamics and engineScene hook"
```

---

### Task 4: Componente HUD Flotante con Glassmorphism y Telemetría p–V

**Files:**
- Create: `src/presentation/presentationHUD.js`
- Modify: `src/style.css`
- Test: `tests/presentationHUD.test.js`

**Interfaces:**
- Consumes: `STATIONS`, estado de `presentationState.js`
- Produces:
  - `createPresentationHUD(container, pvCanvas)`: Objeto con métodos:
    - `show()`: Despliega el overlay HUD a pantalla completa y oculta sidebar.
    - `hide()`: Restaura el simulador estándar.
    - `renderStation(stationIndex, stationData, timerFormatted)`: Actualiza las tarjetas flotantes glassmorphism, el acento de color de la fase actual y los 7 puntos de la barra superior.
    - `togglePvExpanded(expanded: boolean)`: Cambia el tamaño del canvas p–V de miniatura de esquina a panel central para la Estación 7.

- [ ] **Step 1: Escribir el test unitario para el formateador de tiempo y estructura del HUD**

Crear `tests/presentationHUD.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { formatTimeBadge, buildStationCardHTML } from '../src/presentation/presentationHUD.js';
import { STATIONS } from '../src/presentation/presentationState.js';

describe('presentationHUD · Componentes visuales y formato', () => {
  it('formatea correctamente los segundos en formato MM:SS / 10:00', () => {
    expect(formatTimeBadge(0)).toBe('00:00 / 10:00');
    expect(formatTimeBadge(95)).toBe('01:35 / 10:00');
    expect(formatTimeBadge(600)).toBe('10:00 / 10:00');
    expect(formatTimeBadge(650)).toBe('10:00 / 10:00'); // Clamped
  });

  it('construye tarjeta HTML con título, fórmulas y notas de advertencia física', () => {
    const cardHtml = buildStationCardHTML(STATIONS[1]);
    expect(cardHtml).toContain('Cinemática Real vs. M.A.S.');
    expect(cardHtml).toContain('Fuerza externa periódica no armónica');
  });
});
```

- [ ] **Step 2: Ejecutar el test para comprobar que falla**

Ejecutar: `npm test`
Resultado esperado: FAIL con "Cannot find module '../src/presentation/presentationHUD.js'"

- [ ] **Step 3: Implementar `src/presentation/presentationHUD.js` y estilos en `src/style.css`**

- Añadir estilos glassmorphism (`backdrop-filter: blur(12px)`, sombras profundas, bordes con transparencias sutiles).
- Implementar la inyección del overlay en `#app` con control de visibilidad y reubicación de `#pv-canvas`.

- [ ] **Step 4: Ejecutar los tests para comprobar que pasan**

Ejecutar: `npm test`
Resultado esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add src/presentation/presentationHUD.js src/style.css tests/presentationHUD.test.js
git commit -m "feat(ui): add presentationHUD glassmorphism overlay and styles"
```

---

### Task 5: Integración del Bucle Principal, Controles de Teclado y Verificación Final

**Files:**
- Modify: `src/main.js`
- Modify: `index.html`
- Test: Suite completa `vitest run` y build `npm run build`

**Interfaces:**
- Consumes: `presentationState`, `cameraAnimator`, `presentationHUD`, `engineScene`
- Produces: Flujo de exposición 100% operativo en el simulador mediante botón `Modo Presentación [K]` y controles de teclado `Espacio`, `←`, `→`, `P`, `Escape`.

- [ ] **Step 1: Integrar el botón de acceso en `index.html` y los listeners de teclado en `main.js`**

- Añadir botón de activación en la barra superior de `index.html`.
- Añadir listener de eventos `keydown` en `main.js`:
  - `K` o botón: `togglePresentation()`.
  - `Space` o `ArrowRight`: avanzar estación.
  - `ArrowLeft`: retroceder estación.
  - `P`: pausar / reanudar.
  - `Escape`: salir del modo presentación.

- [ ] **Step 2: Conectar la actualización de $\theta$ y cámara en el bucle `animate()`**

En `src/main.js`:
- Si `presentationState.isActive()`:
  - Calcular $\theta$ con `presentationState.computeTheta()`.
  - Actualizar `cameraAnimator.update(dtSeconds)`.
  - Actualizar `presentationHUD.renderStation()`.
  - Si la estación es la 5 y cruza $\theta = 360^\circ$, disparar `engineScene.triggerSpark()`.

- [ ] **Step 3: Ejecutar la suite completa de pruebas unitarias**

Ejecutar: `npm test`
Resultado esperado: 100% de los tests en verde en todas las suites.

- [ ] **Step 4: Verificar la compilación de producción con Vite**

Ejecutar: `npm run build`
Resultado esperado: Build exitoso sin errores de tipos, dependencias o sintaxis.

- [ ] **Step 5: Commit**

```bash
git add src/main.js index.html
git commit -m "feat: integrate presentation mode into main animate loop and UI"
```
