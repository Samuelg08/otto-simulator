# Modo Exposición "Neo Blueprint 3D · Layout B" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el Modo Exposición del simulador Otto en el formato "Neo Blueprint 3D · Layout B", con columnas compactas (Pregunta Real + 3 viñetas cortas a la izquierda, fórmula traducida + telemetría viva a la derecha), capa SVG *blueprint* proyectada sobre el motor 3D, reactivación del diagrama $p\text{–}V$ en Estación 7 y aislamiento no destructivo del estado nominal.

**Architecture:** `presentationState.js` concentra los nuevos datos editoriales de las 7 estaciones, el cálculo puro de métricas vivas por estación (`computePresentationLiveMetrics`), el aislamiento de parámetros nominales (`getPresentationParams`) y el mapeo de teclado (`resolvePresentationKeyAction`). `engineScene.js` expone `projectWorldToScreen(x, y, z)` para alimentar un módulo dedicado `blueprintOverlay.js` que proyecta cotas, flechas de fuerza y etiquetas SVG nítidas sobre `#viewport-container`. `presentationHUD.js` renderiza el Layout B una sola vez por cambio de estación y expone `updateLiveTelemetry` para actualizar a 60 FPS sin reconstruir `innerHTML`.

**Tech Stack:** Vanilla JavaScript (ES Modules), Three.js `0.170.0`, KaTeX `^0.19.1`, SVG + CSS3, Vite `5.4.11`, Vitest `2.1.5`.

**Spec:** `docs/superpowers/specs/2026-11-11-modo-exposicion-neo-blueprint-design.md`

## Global Constraints

- Pila técnica fija: Vanilla JS (ES Modules), Three.js `0.170.0`, KaTeX `^0.19.1`, Canvas 2D, Vite `5.4.11`, Vitest `2.1.5`; cero dependencias nuevas en `package.json`.
- No modificar `src/model/geometry.js` ni `src/model/thermodynamics.js`; todos los valores nominales deben coincidir con la Ficha Técnica (`B = 80 mm`, `L = 80 mm`, `a = 40 mm`, `lb = 130 mm`, `hp = 30 mm`, `rc = 9`, `p1 = 100.0 kPa`, `T1 = 300.0 K`, `gamma = 1.4`, `Qin = 700.0 J`, `N = 3000 rpm`, `Vd = 402.12 cm³`, `Vc = 50.27 cm³`, `hc = 10.0 mm`, `V1 = 452.39 cm³`, `p2 = 2167.4 kPa`, `T2 = 722.5 K`, `p3 = 7737.8 kPa`, `T3 = 2579.3 K`, `p4 = 357.0 kPa`, `T4 = 1071.0 K`, `W12 = -159.3 J`, `W34 = +568.6 J`, `Wneto = +409.3 J`, `Qout = 290.7 J`, `eta = 58.48%`, `P = 10.23 kW`).
- Conservar explícitamente los dos énfasis docentes en Estación 2 (`Fuerza externa periódica no armónica`, `lb = 130 mm`, `F = p(t)·A` en `360°`) y Estación 4 (`Detonación prematura` / `knocking`, `V_c = 50.27 cm³`).
- Un solo toque por estación (`Espacio`, `ArrowRight`, `PageDown` avanzan; `ArrowLeft`, `PageUp` retroceden; `1`–`7` saltan directo; `P` pausa; `K`/`Escape` salen); sin sub-pasos internos.
- Todas las pruebas unitarias corren en Node vía `vitest run` con mocks ligeros de DOM (sin WebGL real requerido para lógica de presentación ni SVG).
- Nota de repositorio: este directorio no tiene `.git` inicializado (`fatal: not a git repository`), por lo que cada tarea cierra con verificación completa de pruebas (`npx vitest run`) y build (`npm run build`) en lugar de commits.

## Review Focus

1. **Contaminación desde el modo libre antes de pulsar `K`:** Si el usuario movió `rc = 14`, `Qin = 800`, dejó un `ghostCycle` activo o cambió la escala del $p\text{–}V$ a `'log'` antes de entrar al Modo Exposición, al activarse debe evaluar motor, telemetría y $p\text{–}V$ con los parámetros nominales (`rc = 9`, `Qin = 700`, `N = 3000`, `ghostCycle = null`, `'auto'`), conservando `kappa`, y al salir con `K`/`Escape` debe restaurar intacto el estado previo del modo libre.
2. **Trabajo vivo en Estación 5 (`W₃₄(θ)` de `0.0 → +568.6 J`):** En `360° → 540°`, la lectura viva debe mostrar el trabajo de la carrera de expansión (`n_cv * (T3 - T)`) comenzando en `0.0 J` y llegando a `+568.6 J`, nunca el acumulado negativo `thermoState.Wacum` (`-119.1 J → +449.5 J`).
3. **Fuga de teclas `1`–`7` o `PageDown`/`PageUp` en Modo Exposición:** Al pulsar `5`, `6`, `7`, `PageDown` o `PageUp` con el Modo Exposición activo, debe navegar entre estaciones `1..7` y nunca caer al `switch` del modo libre (`setManualTheta`).
4. **Viewport nulo o proyector ausente en `blueprintOverlay`:** Al llamar `blueprintOverlay.update(...)` con `{ width: 0, height: 0 }` o sin `projectFn` válido (o retornando `visible: false`), la capa SVG debe limpiarse sin lanzar excepciones ni generar atributos `NaN`.
5. **Cero reconstrucción de DOM a 60 FPS:** Llamar `renderStation` repetidamente para la misma estación o `updateLiveTelemetry` en cada frame no debe reemplazar `.hud-station-card-body.innerHTML` ni `.hud-equations-card.innerHTML`, preservando animaciones CSS y referencias de nodos.

---

### Task 1: Datos de las 7 Estaciones, Aislamiento Nominal, Métricas Vivas y Router de Teclado

**Files:**
- Modify: `src/presentation/presentationState.js:1-704`
- Test: `tests/presentationState.test.js:1-140`

**Interfaces:**
- Consumes: `DEFAULT_PARAMS` de `src/model/geometry.js`
- Produces en `src/presentation/presentationState.js`:
  - `STATIONS`: Array congelado de 7 estaciones conservando los campos existentes (`id`, `title`, `subtitle`, `badgeColor`, `camera`, `motion`, `hasSpark`, `equations`, `physicsNote`, `importantPoints`) y añadiendo en cada estación:
    - `hookQuestion: string`
    - `cues: Array<{ step: 1|2|3, label: string, text: string }>` (exactamente 3 viñetas cortas, ≤ 20 palabras cada una)
    - `blueprint: { type: string, caption?: string }`
    - `formulaCards: Array<{ latex: string, terms: Array<{ symbol: string, meaning: string }> }>`
    - `liveMetrics: Array<{ key: string, label: string }>`
  - `getPresentationParams(freeParams = DEFAULT_PARAMS): object` — devuelve `{ ...DEFAULT_PARAMS, kappa }` preservando `kappa` numérico válido o `DEFAULT_PARAMS.kappa`.
  - `computePresentationLiveMetrics(stationIndex: number, thermoState: object): Record<string, { text: string, alert?: 'safe'|'warning' }>` — calcula el mapa de valores formateados para los `key` de `station.liveMetrics` (incluyendo `W34_theta = cycle.n_cv * (cycle.T3 - T)` en Estación 5 y estado térmico `'safe' | 'warning'` en Estación 4).
  - `resolvePresentationKeyAction(key: string): { type: 'next'|'prev'|'station'|'togglePause'|'exit', station?: number } | null` — mapea `Space`, `ArrowRight`, `PageDown`, `ArrowLeft`, `PageUp`, `'1'..'7'`, `'p'|'P'`, `'k'|'K'`, `'Escape'`.

- [ ] **Step 1: Escribir los tests fallidos en `tests/presentationState.test.js`**

Añadir pruebas al final de `tests/presentationState.test.js` verificando:
- Campos Layout B en las 7 estaciones (`hookQuestion` no vacío, `cues` de longitud 3, `blueprint.type`, `formulaCards` con `>= 1` entrada y `terms`, `liveMetrics` con `>= 1` entrada).
- `getPresentationParams({ ...DEFAULT_PARAMS, rc: 14, Qin: 800, N: 5500, kappa: 0.005 })` retorna `rc === 9`, `Qin === 700`, `N === 3000`, `kappa === 0.005`, y ante `null` o `kappa` inválido vuelve a `DEFAULT_PARAMS.kappa`.
- `computePresentationLiveMetrics(5, thermoAt360)` devuelve `W34_theta` con `'0.0 J'` y `computePresentationLiveMetrics(5, thermoAt540BeforeJump)` devuelve `'+568.6 J'` (usando `computeStateAtTheta` de `src/model/thermodynamics.js`).
- `computePresentationLiveMetrics(2, thermoAt360)` devuelve `F_gas` con `'38.89 kN'` y `delta_mas` en `mm`.
- `computePresentationLiveMetrics(4, thermoAt360BeforeJump)` devuelve `T_inst` con `'722.5 K'` y `alert: 'safe'`.
- `resolvePresentationKeyAction` mapea `'PageDown'` → `{ type: 'next' }`, `'PageUp'` → `{ type: 'prev' }`, `' '` → `{ type: 'next' }`, `'7'` → `{ type: 'station', station: 7 }`, `'1'` → `{ type: 'station', station: 1 }`, `'p'` → `{ type: 'togglePause' }`, `'Escape'` → `{ type: 'exit' }`, `'x'` → `null`.

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run tests/presentationState.test.js`
Expected: FAIL porque `getPresentationParams`, `computePresentationLiveMetrics`, `resolvePresentationKeyAction` y los campos nuevos de `STATIONS` aún no existen.

- [ ] **Step 3: Implementar los nuevos datos y funciones puras en `src/presentation/presentationState.js`**

- Añadir a cada una de las 7 entradas de `STATIONS` en `src/presentation/presentationState.js` sus campos `hookQuestion`, `cues` (3 viñetas con etiquetas `Qué ocurre`, `Gracias a qué`, `Realidad` / `Límite`), `blueprint`, `formulaCards` (1–2 fórmulas clave en LaTeX con chips `terms` de traducción cotidiana según la tabla §5.3 de la spec) y `liveMetrics` (claves: Est. 1 `theta`, `phase`; Est. 2 `F_gas`, `delta_mas`; Est. 3 `V_inst`, `hv_intake`; Est. 4 `T_inst`, `p_inst`; Est. 5 `p_bar`, `T_inst`, `W34_theta`; Est. 6 `theta`, `theta_leva`, `hv_exhaust`; Est. 7 `Wneto`, `eta`, `power`).
- Mantener congelados con `deepFreeze` todos los campos existentes (`equations`, `physicsNote`, `importantPoints`, etc.) para no romper el contrato de datos.
- Implementar y exportar `getPresentationParams(freeParams = DEFAULT_PARAMS)`, `computePresentationLiveMetrics(stationIndex, thermoState)` y `resolvePresentationKeyAction(key)`.

- [ ] **Step 4: Ejecutar tests de `presentationState` para confirmar que pasan**

Run: `npx vitest run tests/presentationState.test.js`
Expected: PASS (todos los tests anteriores + nuevos en verde).

---

### Task 2: Proyección 3D en `engineScene.js` y Capa SVG `blueprintOverlay.js`

**Files:**
- Modify: `src/scene/engineScene.js:1385-1418`
- Create: `src/presentation/blueprintOverlay.js`
- Test: `tests/blueprintOverlay.test.js`

**Interfaces:**
- Consumes: `camera` y `renderer` en `src/scene/engineScene.js`; `thermoState` (`theta`, `p`, `T`, `V`, `geometry` con `B`, `L`, `a`, `lb`, `hp`, `hc`, `y_corona`, `y_culata`, `delta_mas`, `valves`, `cycle`) de `src/model/thermodynamics.js`.
- Produces:
  - En `engineScene.js`: método `projectWorldToScreen(x, y, z, widthOverride, heightOverride)` en el objeto retornado por `createEngineScene`, retornando `{ x: number, y: number, visible: boolean }`.
  - En `src/presentation/blueprintOverlay.js`:
    - `buildBlueprintSpec(stationIndex: number, thermoState: object): { callouts: Array<object>, brackets: Array<object>, arrows: Array<object> }` — genera anclajes en coordenadas físicas del motor (metros) y textos por estación (1..7).
    - `createBlueprintOverlay({ container, document }): { show(), hide(), isVisible(), update(stationIndex, thermoState, projectFn, viewportSize), destroy() }` — gestiona `<svg class="blueprint-overlay">` dentro de `container`.

- [ ] **Step 1: Escribir tests fallidos en `tests/blueprintOverlay.test.js`**

Crear `tests/blueprintOverlay.test.js` cubriendo:
- `buildBlueprintSpec`:
  - Estación 1 incluye cotas de calibre `B = 80 mm` (anclaje `x: -0.04..0.04`) y carrera `L = 80 mm` (`y: 0.120..0.200`).
  - Estación 2 incluye flecha dinámica `F_gas` anclada en corona `(0, y_corona, 0)` con etiqueta `38.89 kN` en `θ = 360°` y callout `Δs` sobre `waveGroup` (`x = 0.152`).
  - Estación 3 incluye cota de alzada `h_v` en válvula admisión (`x = -0.017`) y etiqueta `V(θ)`.
  - Estación 4 incluye cota de altura muerta `h_c = 10.0 mm` entre `yPmsCrown = 0.200` y `y_culata = 0.210`, más callout térmico con `722.5 K` y mención `knocking` / `rc > 12`.
  - Estación 5 incluye callout `Q_in = 700 J` en bujía y flecha roja descendente `F_gas` en `y_corona`.
  - Estación 6 incluye indicador `2×` vs `1× (θ/2)` en levas y alzada en válvula escape (`x = 0.017`).
  - Estación 7 incluye etiquetas `Q_in = 700 J`, `W_neto = +409.3 J`, `Q_out = 290.7 J`, `10.23 kW`.
- `createBlueprintOverlay` (usando mock DOM ligero igual al patrón de `tests/presentationHUD.test.js`):
  - Se monta oculto (`display: none`), `show()`/`hide()` alternan visibilidad y `destroy()` remueve el `<svg>`.
  - Review Focus #4: al invocar `update(4, thermoState, null, { width: 1280, height: 720 })`, `update(4, thermoState, mockProjector, { width: 0, height: 0 })` o con `projectFn` devolviendo `{ x: NaN, y: 0, visible: false }`, limpia los elementos internos sin lanzar excepciones y nunca escribe `NaN` en el SVG.

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run tests/blueprintOverlay.test.js`
Expected: FAIL con "Cannot find module '../src/presentation/blueprintOverlay.js'".

- [ ] **Step 3: Añadir `projectWorldToScreen` en `src/scene/engineScene.js` e implementar `src/presentation/blueprintOverlay.js`**

- En `src/scene/engineScene.js`, añadir `projectWorldToScreen(x, y, z = 0, widthOverride, heightOverride)` usando `const w = widthOverride ?? container.clientWidth`, `const h = heightOverride ?? container.clientHeight`, proyectando `new THREE.Vector3(x, y, z).project(camera)` a píxeles `( (ndc.x * 0.5 + 0.5) * w, (-ndc.y * 0.5 + 0.5) * h )`, validando finitud (`Number.isFinite`) y `ndc.z <= 1`, y devolverlo en el objeto retornado por `createEngineScene`.
- En `src/presentation/blueprintOverlay.js`, implementar `buildBlueprintSpec(stationIndex, thermoState)` y `createBlueprintOverlay({ container, document })` generando `<g>` limpias con líneas punteadas (`bp-line`), cotas con remates (`bp-bracket`), flechas (`bp-arrow`) y píldoras de texto (`bp-pill`) evitando cualquier `NaN` o coordenada inválida.

- [ ] **Step 4: Ejecutar tests de `blueprintOverlay` para confirmar que pasan**

Run: `npx vitest run tests/blueprintOverlay.test.js`
Expected: PASS.

---

### Task 3: Rediseño HUD Layout B (`presentationHUD.js`) y Telemetría Viva sin Reconstruir DOM

**Files:**
- Modify: `src/presentation/presentationHUD.js:1-594`
- Test: `tests/presentationHUD.test.js:1-657`

**Interfaces:**
- Consumes: `STATIONS` y `computePresentationLiveMetrics` de `src/presentation/presentationState.js`; `katex` de `'katex'`.
- Produces en `src/presentation/presentationHUD.js`:
  - `buildStationCardHTML(stationData): string` — renderiza `.hud-hook-block` (`stationData.hookQuestion`) + `.hud-cues-list` (las 3 viñetas cortas `stationData.cues`).
  - `buildEquationsCardHTML(stationData): string` — renderiza encabezado `"Fundamento Físico"`, ecuaciones KaTeX de `formulaCards` con chips `.formula-term-chip` (`symbol` + `meaning`), y franja `.hud-live-metrics` con atributos `data-live-metric="<key>"`.
  - `createPresentationHUD(options)`:
    - Mantiene `show()`, `hide()`, `renderStation(stationIndex, stationData, timerSeconds, isPaused)`, `togglePvExpanded(expanded)`, `isVisible()`, `destroy()`.
    - Añade `updateLiveTelemetry(stationIndex, thermoState)` que actualiza únicamente `.textContent` (y clase `is-warning` / `is-safe` cuando `alert` está presente) de los nodos `[data-live-metric]`.
    - `renderStation` no reemplaza `stationCardBody.innerHTML` ni `equationsCard.innerHTML` si `stationIndex === lastRenderedStationIndex` (solo actualiza barra `1..7`, botón Pausa, temporizador interno y clases `.hud-pv-container`).
    - `.hud-right-panel` NO monta ni muestra `.hud-important-card`.
    - `.hud-pv-container` recibe clase `pv-visible` únicamente cuando `stationIndex === 7` y `pv-hidden` en `1..6`.

- [ ] **Step 1: Actualizar `tests/presentationHUD.test.js` para el contrato Layout B y añadir pruebas de no-reconstrucción y `updateLiveTelemetry`**

Actualizar y ampliar `tests/presentationHUD.test.js` (manteniendo el mock de DOM ligero y agregando `querySelector('[data-live-metric="..."]')` o soporte de selector por atributo `[data-live-metric]` en `createMockElement._query`):
- Verificar `buildStationCardHTML(STATIONS[0..6])`: contiene `hookQuestion` y las 3 viñetas `.hud-cue-item` (sin los párrafos antiguos; verificando que Estación 2 mantiene `Fuerza externa periódica no armónica` / `F_gas = p·A` y Estación 4 mantiene `knocking` / `detonación prematura`).
- Verificar `buildEquationsCardHTML(STATIONS[i])`: contiene `"Fundamento Físico"`, chips `.formula-term-chip`, bloques `katex` y contenedores `data-live-metric`.
- Verificar `createPresentationHUD`:
  - `.hud-important-card` no existe en `.hud-right-panel`.
  - `.hud-pv-container` tiene `pv-hidden` en estaciones `1..6` y `pv-visible` en Estación 7.
  - Review Focus #5: al llamar `hud.renderStation(4, STATIONS[3], 10, false)` y luego volver a llamar `hud.renderStation(4, STATIONS[3], 11, true)`, no reasigna `stationCardBody.innerHTML` ni `equationsCard.innerHTML` (puede comprobarse espiando o comparando referencia / setter), mientras el botón de pausa sí cambia a `Reanudar`.
  - Review Focus #2 y #5: `hud.updateLiveTelemetry(5, thermoAt540BeforeJump)` actualiza el texto del elemento `[data-live-metric="W34_theta"]` a `'+568.6 J'` sin modificar `equationsCard.innerHTML`, y `hud.updateLiveTelemetry(4, thermoAt360BeforeJump)` actualiza `[data-live-metric="T_inst"]` a `'722.5 K'` con clase `is-safe`.

- [ ] **Step 2: Ejecutar los tests de `presentationHUD` para comprobar que fallan con la implementación vieja**

Run: `npx vitest run tests/presentationHUD.test.js`
Expected: FAIL en las nuevas aserciones de Layout B (`hookQuestion`, `Fundamento Físico`, `pv-visible`/`pv-hidden`, `updateLiveTelemetry`).

- [ ] **Step 3: Implementar los cambios en `src/presentation/presentationHUD.js`**

- Actualizar `buildStationCardHTML` y `buildEquationsCardHTML` para generar el HTML compacto del Layout B con los chips de términos reales y los nodos `data-live-metric`.
- Conservar `formatTimeBadge` y `formatEquation` (y `buildImportantCardHTML` como función pura exportada si algún caller externo la importa, pero **sin crear ni montar `.hud-important-card`** dentro de `createPresentationHUD`).
- Actualizar `renderStation`: trackear `lastStationIndex` (reiniciar a `null` en `hide()` / `destroy()` si es necesario o re-aplicar clase `.is-entering` en cambio real de estación), reconstruir contenido solo cuando cambie la estación y aplicar `pv-visible` en Estación 7 / `pv-hidden` en `1..6`.
- Implementar `updateLiveTelemetry(stationIndex, thermoState)` guardando referencias cacheadas a los nodos `[data-live-metric]` tras renderizar la estación para actualizar `.textContent` y `classList` en O(1) sin recorrer el DOM ni tocar `innerHTML`.

- [ ] **Step 4: Ejecutar tests de `presentationHUD` para confirmar que pasan**

Run: `npx vitest run tests/presentationHUD.test.js`
Expected: PASS.

---

### Task 4: Integración en `main.js` (Aislamiento de Estado, Teclado, Bucle 60 FPS) y Estilos Layout B en `style.css`

**Files:**
- Modify: `src/main.js:107-135,313-355,467-501`
- Modify: `src/style.css:794-1200`
- Modify/Add test: `tests/presentationState.test.js` (si falta algún helper puro de aislamiento de escala/estado en `presentationState.js`)

**Interfaces:**
- Consumes: `getPresentationParams`, `resolvePresentationKeyAction` de `src/presentation/presentationState.js`; `createBlueprintOverlay` de `src/presentation/blueprintOverlay.js`; `engineScene.projectWorldToScreen` de `src/scene/engineScene.js`; `presentationHUD.updateLiveTelemetry` de `src/presentation/presentationHUD.js`.
- Produces: Integración completa del Modo Exposición "Neo Blueprint 3D · Layout B" en el flujo principal de la aplicación.

- [ ] **Step 1: Verificar/completar test de integración pura de ciclo de vida de presentación**

Si se extrae un helper puro `createPresentationRuntime` o funciones de estado en `presentationState.js`, o directamente sobre `tests/presentationState.test.js`, asegurar prueba para:
- Review Focus #1: `getPresentationParams({ ...DEFAULT_PARAMS, rc: 14, Qin: 800, N: 5500, kappa: 0.005 })` preserva `kappa: 0.005` y fija `rc: 9, Qin: 700, N: 3000` sin mutar el objeto de entrada.
- Review Focus #3: `resolvePresentationKeyAction` cubre `'1'..'7'`, `'PageDown'`, `'PageUp'`, `' '`, `'ArrowRight'`, `'ArrowLeft'`, `'p'`, `'k'`, `'Escape'`.

- [ ] **Step 2: Actualizar `src/main.js`**

- Instanciar `const blueprintOverlay = createBlueprintOverlay({ container: viewportContainer, document });`.
- En `setPresentationActive(active)`:
  - Al activar (`true`): `presentationState.setActive(true)`, `pvDiagram.setScaleMode('auto')`, `presentationHUD.show()`, `blueprintOverlay.show()`, `navigateToStation(1)`. No mutar `state.params`, `state.ghostCycle` ni `state.scaleModeIndex`.
  - Al desactivar (`false`): `presentationState.setActive(false)`, `cameraAnimator.cancel()`, `blueprintOverlay.hide()`, `presentationHUD.hide()`, `pvDiagram.setScaleMode(SCALE_MODES[state.scaleModeIndex])`, `engineScene.resetCamera()`.
- En el listener `keydown` cuando `presentationState.isActive()`:
  - Usar `resolvePresentationKeyAction(e.key)`; si devuelve acción, ejecutar `e.preventDefault()`, despachar (`next` / `prev` / `station` / `togglePause` / `exit`) y hacer `return;` inmediato para que jamás caiga al `switch` del modo libre (`1..5`).
- En `animate(now)`:
  - Cuando `presentationState.isActive()` es `true`:
    - `const effectiveParams = getPresentationParams(state.params);`
    - Usar `effectiveParams.N` y `effectiveParams.kappa` para `omegaDegPerSec` y `computeStateAtTheta(state.theta, effectiveParams, { beforeJump: false })`.
    - No llamar `updateHUDStation()` cada frame; llamar `presentationHUD.updateLiveTelemetry(presentationState.getCurrentStationIndex(), thermoState)` y `blueprintOverlay.update(presentationState.getCurrentStationIndex(), thermoState, engineScene.projectWorldToScreen, { width: viewportContainer.clientWidth, height: viewportContainer.clientHeight })`.
    - Dibujar `pvDiagram.draw(thermoState, null)` (nunca `state.ghostCycle` durante presentación).

- [ ] **Step 3: Actualizar `src/style.css` para Layout B, Capa Blueprint SVG y Diagrama `p–V` en Estación 7**

- Ajustar `.hud-station-card` y `.hud-right-panel` a ancho compacto (`width: clamp(280px, 24.5vw, 345px)`), tipografía legible en proyector (`1280×720` y `1920×1080`) y transición escalonada suave (`.hud-station-card.is-entering`, `.hud-right-panel.is-entering`).
- Añadir estilos para `.hud-hook-block`, `.hud-cues-list`, `.hud-cue-item`, `.hud-cue-badge`, `.hud-formulas-list`, `.formula-terms-row`, `.formula-term-chip`, `.hud-live-metrics`, `.live-metric-chip` (incluyendo `.is-safe` verde/ámbar e `.is-warning` rojo para Estación 4) y `.blueprint-overlay` (`.bp-line`, `.bp-bracket`, `.bp-arrow`, `.bp-pill`, `.bp-text`).
- Reemplazar `.hud-pv-container { display: none !important; }` por:
  - `.hud-pv-container.pv-hidden { display: none; }`
  - `.hud-pv-container.pv-visible { display: flex; flex-direction: column; width: 100%; ... }` dentro de `.hud-right-panel` (eliminando `position: fixed; top: 50%; left: 50%; width: 640px;` de `.pv-expanded` para que nunca tape el motor 3D).

- [ ] **Step 4: Ejecutar toda la suite de pruebas y build de producción**

Run: `npm test && npm run build`
Expected:
- `vitest run`: todos los archivos de prueba (`geometry.test.js`, `thermodynamics.test.js`, `cameraAnimator.test.js`, `presentationState.test.js`, `presentationHUD.test.js`, `blueprintOverlay.test.js`) en verde sin fallos ni advertencias.
- `vite build`: compilación limpia en `dist/` sin errores de módulos ni CSS.

---

## Self-Review Checklist (Completado)

1. **Cobertura de Spec:**
   - §5.1 Layout B columnas compactas (`~320–345 px`), Pregunta Real + 3 viñetas a izquierda, Fórmula traducida + lectura viva a derecha, sin `Aspectos Importantes` repetidos → Tasks 1, 3 y 4.
   - §5.2 Un toque por estación (`Espacio`, `→`, `PageDown`, `←`, `PageUp`, `1–7`), entrada automática suave → Tasks 1, 3 y 4.
   - §5.3 Mapa completo de las 7 estaciones → Tasks 1 y 2.
   - §5.4 Capa Blueprint 3D proyectada sobre SVG desde anclajes exactos en metros → Task 2.
   - §5.5 Aislamiento de estado nominal conservando `kappa` y sin destruir modo libre → Tasks 1 y 4.
   - §5.6 Actualización 60 FPS sin reconstruir `innerHTML` + `W₃₄(θ)` en Estación 5 → Tasks 1, 3 y 4.
   - §5.7 Reactivación de `pv-canvas` en Estación 7 sin tapar motor + actualización de tests → Tasks 3 y 4.
2. **Consistencia de Interfaces:** `getPresentationParams`, `computePresentationLiveMetrics`, `resolvePresentationKeyAction`, `projectWorldToScreen`, `buildBlueprintSpec`, `createBlueprintOverlay`, `updateLiveTelemetry` usan nombres y firmas idénticas entre Tasks 1–4.
3. **Review Focus:** Los 5 modos de fallo críticos quedan amarrados con aserciones explícitas en `presentationState.test.js`, `blueprintOverlay.test.js` y `presentationHUD.test.js`.
