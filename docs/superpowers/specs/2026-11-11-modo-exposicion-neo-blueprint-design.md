# Diseño: Modo Exposición "Neo Blueprint 3D · Layout B"

- **Fecha:** 2026-11-11
- **Proyecto:** Simulador Interactivo 3D del Ciclo Otto Ideal (`otto-simulator-v2`, Física 2)
- **Autor / Expositor:** Samuel Gallego Osorio
- **Docente:** Prof. Ruby Rocío Rodríguez Jacobo
- **Documento base previo:** [`2026-11-05-modo-presentacion-keynote-design.md`](./2026-11-05-modo-presentacion-keynote-design.md)
- **Estado:** Listo para aprobación del expositor

---

## 1. Intención y Propósito ("The Why")

Rediseñar el Modo Exposición ("Keynote 3D") para pasar de tarjetas con muros de texto y ecuaciones desconectadas a una narrativa visual inspirada en el estilo documental del canal **Neo (`@neoexplains`)**:

1. **Despertar interés desde la vida real:** Cada estación arranca con una pregunta cotidiana o paradoja física (*«¿por qué pasa esto en un motor real? ¿gracias a qué funciona o falla?»*) en lugar de definiciones de manual.
2. **Hacer visible lo invisible sobre el motor 3D:** Superponer cotas técnicas, vectores de fuerza y marcadores dinámicos tipo *blueprint* directamente sobre el corte CAD 3D para mostrar fuerzas, holguras, relaciones de giro y saltos térmicos que no se ven a simple vista.
3. **Desembocar en la fórmula como fundamento:** Presentar cada ecuación clave traducida a lenguaje cotidiano (qué representa cada término en la realidad) y vinculada a los valores vivos que están gobernando ese instante del ciclo.
4. **Apoyo sutil para el expositor en un solo proyector:** Como Samuel expone en una única pantalla compartida (proyector de aula) y necesita respaldo al hablar sin que parezca un acordeón o ayuda obvia, las tarjetas adoptan el formato **Layout B (Columnas Compactas)**: frente a la clase lucen como un resumen técnico minimalista de alta gama, mientras al expositor le marcan exactamente el hilo hablado en tres viñetas breves.

---

## 2. Metas, No-Metas y Anti-Metas

### Metas (Goals)
1. **Un solo toque por estación:** Mantener las **7 estaciones** y navegar de una a otra con una sola pulsación (`Espacio`, `→` o `AvPág` para pasador inalámbrico; `←` o `RePág` para retroceder; botones `1–7` en barra superior). Sin sub-pasos internos que obliguen a volver al teclado tres veces por estación.
2. **Columnas compactas (Layout B):** Reducir el ancho y densidad de los paneles laterales actuales (`470 px` con 3 párrafos extensos y listas largas) a columnas limpias (~`320–340 px` o escalado proporcional al proyector) para despejar el motor 3D en el centro.
3. **Estructura "Pregunta Real + 3 Viñetas Cortas" a la izquierda:** Cada estación reemplaza los párrafos densos por 1 pregunta gancho y exactamente 3 viñetas escaneables (`1. Qué ocurre`, `2. Gracias a qué`, `3. Límite / Realidad`).
4. **Capa Blueprint 3D sobre la escena:** Mostrar cotas y vectores dinámicos anclados al modelo físico real (`B`, `L`, `h_c`, `h_v`, vector de fuerza `F_gas = p(t) · A`, desfase `Δs = s - s_mas`, relación `2:1` de levas).
5. **Fórmula traducida + telemetría viva a la derecha:** Mostrar 1–2 ecuaciones KaTeX esenciales por estación con etiquetas cotidianas por símbolo y lectura numérica viva sincronizada con `θ` (y sin reconstruir `innerHTML` 60 veces por segundo).
6. **Reactivar el Diagrama `p–V` en la Estación 7:** Hacer visible `pv-canvas` dentro del panel derecho en la Estación 7 (corrigiendo el `display: none !important` actual en `src/style.css`) sin tapar el motor 3D central.
7. **Conservar los dos énfasis docentes obligatorios:**
   - Estación 2: Doble causa física de desviación respecto al M.A.S. (oblicuidad de biela `lb = 130 mm` + fuerza externa periódica no armónica `F_gas = p(t)·A` concentrada en `360°`, violando `F = -kx`).
   - Estación 4: Función crítica de seguridad del volumen muerto `V_c = 50.27 cm³` (`h_c = 10.0 mm`, `r_c = 9`) para evitar autoignición prematura (*knocking* / detonación).

### No-Metas (Non-Goals)
- No añadir controles interactivos de parámetros (`rc`, `Qin`, `N`) ni botones de experimento "¿qué pasaría si...?" dentro del Modo Exposición (el usuario descartó ese nivel de interacción en favor de fluidez con 1 toque por estación; esos controles siguen en el modo simulador libre).
- No crear ventanas secundarias de notas privadas ni cajones ocultables de apuntador (la pantalla es única sobre proyector).
- No modificar el modelo físico ni las ecuaciones validadas en `src/model/geometry.js` y `src/model/thermodynamics.js`.
- No cambiar el motor de gráficos ni agregar librerías externas fuera de Three.js, KaTeX, Vite y Vitest.

### Anti-Metas (Anti-Goals)
- **Sin sub-pasos de teclado dentro de la estación:** No exigir múltiples pulsaciones por estación para revelar texto o fórmulas.
- **Sin apariencia de "chuleta" o diapositiva cargada:** Prohibido regresar a bloques de 2–3 párrafos por estación o repetir los mismos datos en tres tarjetas distintas.
- **Sin parpadeo ni pérdida de animaciones CSS a 60 FPS:** No re-renderizar todo el `innerHTML` del HUD en cada frame de `requestAnimationFrame`.
- **Sin obstrucción del motor 3D:** Ni las columnas laterales ni las cotas *blueprint* ni el diagrama `p–V` en Estación 7 deben tapar el cilindro, pistón, válvulas o trazo senoidal en encuadres de proyector (1280×720 y 1920×1080).

---

## 3. Restricciones Técnicas y Académicas

- **Tiempo de charla:** 10 minutos, 7 estaciones, teclado / pasador sin depender del ratón.
- **Entorno de proyección:** Una sola pantalla conectada a proyector de aula; tipografía legible a distancia y contraste alto sobre fondo oscuro (`#090d16` / `#0e131f`).
- **Fidelidad al modelo físico SI:** Parámetros nominales (`B = 0.08 m`, `L = 0.08 m`, `a = 0.04 m`, `lb = 0.13 m`, `rc = 9`, `p1 = 100 kPa`, `T1 = 300 K`, `gamma = 1.4`, `Qin = 700 J`, `N = 3000 rpm`) y estados exactos 1–4 (`V1 = 452.39 cm³`, `Vc = 50.27 cm³`, `p2 = 2167.4 kPa`, `T2 = 722.5 K`, `p3 = 7737.8 kPa`, `T3 = 2579.3 K`, `p4 = 357.0 kPa`, `T4 = 1071.0 K`, `Wneto = +409.3 J`, `Qout = 290.7 J`, `η = 58.48%`, `P = 10.23 kW`).
- **Pila tecnológica:** Vanilla JS (ES Modules), Three.js `0.170.0`, KaTeX `^0.19.1`, Canvas 2D, Vite `5.4.11`, Vitest `2.1.5`.
- **Compatibilidad de tests:** Las pruebas unitarias en `tests/` corren en Node sin navegador real (usan mocks ligeros de DOM); el nuevo código del HUD y de la capa *blueprint* debe poder probarse en Node sin requerir WebGL real para lógica pura/DOM.

---

## 4. Enfoques Considerados y Selección

### 4.1 Enfoques de fondo (cómo explicar la física estilo Neo)

| Enfoque | Descripción | Trade-offs | Decisión |
| :--- | :--- | :--- | :--- |
| **Opción A · Neo Narrativo** | Guion progresivo limpio sin cambiar la escena 3D actual. | Muy seguro y limpio, pero no visualiza fuerzas ni cotas invisibles sobre el motor. | Descartado |
| **Opción B · Neo Blueprint 3D** | Narrativa "¿por qué ocurre? → gracias a qué → fórmula" apoyada por cotas y vectores técnicos animados sobre el motor 3D. | Conecta visualmente el fenómeno invisible con la ecuación sin añadir botones durante la charla; exige construir la capa de superposición *blueprint*. | **SELECCIONADO** |
| **Opción C · Neo Interactivo ("¿Qué pasaría si...?")** | Opción B más disparadores por estación para forzar `rc = 14` o variar `Qin` en vivo. | Gran impacto experimental, pero exige manipular botones adicionales durante los 10 min. | Descartado |

### 4.2 Disposición visual de pantalla (probada en bocetos)

| Layout | Descripción | Trade-offs | Decisión |
| :--- | :--- | :--- | :--- |
| **Layout A · Documental Puro** | Subtítulo editorial abajo + fórmula flotante en esquina + motor al 100%. | Máximo cine, pero menor respaldo textual visible de un vistazo para el expositor. | Descartado |
| **Layout B · Columnas Compactas** | Evolución limpia del HUD actual: columnas compactas izquierda/derecha (`~320–340 px`), motor central con cotas *blueprint*, guía en pregunta + 3 viñetas cortas y fórmula traducida. | Mantiene la familiaridad del proyecto, da respaldo sutil y escaneable al expositor sin parecer acordeón, y deja el centro despejado. | **SELECCIONADO** |
| **Layout C · Plano Blueprint Asimétrico** | Motor a la izquierda y callouts conectados a la derecha. | Exige re-encuadrar todas las cámaras y deja menos simetría para el diagrama `p–V`. | Descartado |

---

## 5. Diseño Detallado de la Solución

### 5.1 Disposición de Pantalla (Layout B · Columnas Compactas)

Se mantiene la barra superior (`hud-top-bar` con insignia de defensa, selector `1..7`, botón `Pausar [P]` y `Salir [K / Esc]`) y la barra inferior discreta de atajos (`Espacio / → / AvPág`, `← / RePág`, `P`, `K / Esc`).

- **Columna Izquierda (`hud-station-card`, ancho compacto `330 px`, `max-width: 26vw` en pantallas anchas y escalado responsive en 720p):**
  - **Insignia + Título breve** de la estación.
  - **Bloque "Pregunta Real":** Titular destacado en tono interrogativo cotidiano (1–2 líneas máx.).
  - **3 Viñetas Guías (`cues`):** Exactamente 3 ítems cortos y visuales (etiqueta + frase de ≤ 16–20 palabras):
    1. `1. Qué ocurre` (lo que se ve en el motor en ese instante)
    2. `2. Gracias a qué` (el mecanismo o fenómeno físico invisible que lo produce)
    3. `3. Límite / Realidad` (el porqué práctico o restricción física)
  - Se eliminan en la vista del proyector los 3 párrafos extensos (`paragraphs`), el cuadro duplicado de `physicsNote` y la lista extensa de 5–6 `parameters` estáticos para evitar muros de texto.
- **Centro (Lienzo 3D + Capa Blueprint):**
  - El motor 3D en `viewport-container` permanece despejado entre ambas columnas.
  - Sobre las piezas del motor aparecen únicamente las **cotas, flechas y etiquetas *blueprint*** correspondientes a la estación activa.
- **Columna Derecha (`hud-right-panel`, ancho compacto `330 px`, `max-width: 26vw`):**
  - **Tarjeta "Fundamento Físico":** Contiene 1 o 2 fórmulas KaTeX clave de la estación (se retira el bloque separado de `Aspectos Importantes` para no saturar ni repetir las viñetas de la izquierda).
  - **Traducción por término (`terms`):** Debajo de cada ecuación aparecen chips compactos (`símbolo` → significado cotidiano en 2–4 palabras, ej. `rc` → *cuánto se comprime*, `T₂` → *calor antes de chispa*).
  - **Lectura Viva (`liveMetrics`):** Franja compacta con 1–3 magnitudes calculadas al instante desde `computeStateAtTheta` / `computeGeometry` que muestran el número real moviéndose en sincronía con el motor y la fórmula.
  - **Diagrama `p–V` (solo Estación 7):** En la Estación 7 aparece debajo de la tarjeta de Fundamento Físico dentro de `.hud-right-panel` (reemplazando la regla `display: none !important` por visibilidad controlada únicamente cuando corresponde a Estación 7, sin invadir el centro del motor).

### 5.2 Ritmo, Teclado y Transición Automática

- **Un toque por estación:** `Espacio`, `ArrowRight` o `PageDown` avanzan `currentStationIndex` (`1 → 7`). `ArrowLeft` o `PageUp` retroceden (`7 → 1`). Las teclas `1`..`7` dentro del modo presentación (o clic en los puntos superiores) saltan directo a esa estación.
- **Entrada documental automática (sin sub-pasos manuales):** Al cambiar de estación, la cámara interpola en `1.0 s` (`cameraAnimator`) y las columnas usan una transición CSS corta y escalonada automática (~`0.15 s` pregunta/viñetas, ~`0.35 s` blueprint/fórmula) mediante una clase/animación disparada solo en cambio de estación. Si el usuario cambia rápido de estación, la transición previa se reemplaza limpiamente.

### 5.3 Mapa Completo de las 7 Estaciones

| Est. | Pregunta Real (Izquierda) | 3 Viñetas Cortas (`Qué ocurre · Gracias a qué · Realidad`) | Capa Blueprint 3D (Centro sobre el motor) | Fórmula Fundamento + Chips + Dato Vivo (Derecha — Ec. 1 a 17 del PDF) |
| :--- | :--- | :--- | :--- | :--- |
| **1 · Arquitectura 4T** (`continuous`) | *¿Cómo convierte una sola cámara lineal el empuje en giro continuo?* | **1. Qué ocurre:** El pistón sube y baja 4 veces por ciclo.<br>**2. Gracias a qué:** Biela-manivela transforma carrera lineal en rotación.<br>**3. Realidad:** Geometría cuadrada `B = L = 80 mm` en 2 vueltas (`720°`). | Cotas técnicas ancladas al cilindro: **Calibre `B = 80 mm`**, **Carrera `L = 80 mm`** (entre PMS y PMI) y arco de ciclo `720° (2 vueltas)`. | Ec. (1), (2), (3), (4): `V_d = A_p · L = (π/4) B² L = 402.12 cm³` y `r_c = V₁ / V_c = (V_c + V_d)/V_c = 9`<br>Chips: `A_p` área pistón · `B, L` calibre y carrera · `V_c, V₁` volúmenes PMS/PMI<br>Vivo: `θ` actual y fase en curso. |
| **2 · Dinámica vs M.A.S.** (`continuous`) | *¿Por qué un motor real vibra y golpea tan distinto a un resorte ideal?* | **1. Qué ocurre:** La onda del pistón se deforma frente al M.A.S.<br>**2. Gracias a qué:** Biela finita (`lb = 130 mm`) + pulso explosivo en `360°`.<br>**3. Realidad:** Fuerza externa periódica no armónica (`F_gas = p·A`) rompe `F = -kx`. | Vector rojo pulsante **`F_gas = p(θ)·A`** sobre la corona del pistón (pico `38.89 kN` en `360°`) + cota de desfase **`Δs = s - s_MAS`** entre las dos curvas del trazador lateral (`waveGroup`). | Ec. (7) y (1): `p_i = (n R T_i) / V_i` (`p₃ = 7737.8 kPa`) y `A_p = (π/4) B² = 50.265 cm²`<br>Chips: `p_i` presión del estado · `A_p` área donde empuja el gas<br>Vivo: `F_gas(θ)` en kN y `Δs(θ)` en mm. |
| **3 · Fase 1: Admisión** (`loop 0°→180°`) | *¿Cómo entra mezcla fresca sin bomba que la empuje?* | **1. Qué ocurre:** Baja el pistón mientras abre la válvula izquierda.<br>**2. Gracias a qué:** Al crecer `V(θ)`, entra aire-gasolina a `p₁ = 100 kPa`.<br>**3. Realidad:** Leva abre `5.5 mm` y atrapa `0.01814 mol` exactos. | Cota vertical de alzada **`h_v = 5.5 mm`** junto a la válvula de admisión (`x = -0.017 m`) + etiqueta de volumen creciente **`V(θ)`** en cámara azul (`T₁ = 300 K`). | Ec. (5) y (4): `pV = nRT ⟹ n = (p₁ V₁) / (R T₁) = 0.01814 mol` y `V₁ = V_c + V_d = 452.39 cm³`<br>Chips: `p₁, T₁` entrada · `n` moles encerrados · `V_c, V_d` volúmenes<br>Vivo: `V(θ)` cm³ y `h_v(θ)` mm. |
| **4 · Fase 2: Compresión** (`loop 180°→360°`) | *¿Por qué el pistón nunca aplasta la mezcla hasta tocar la culata?* | **1. Qué ocurre:** Válvulas selladas; volumen cae 9 veces (`r_c = 9`).<br>**2. Gracias a qué:** Trabajo `-159.3 J` se transforma en calor interno (`Q = 0`).<br>**3. Límite:** Sin `V_c = 50.27 cm³` (`r_c > 12`), `T₂` provoca detonación prematura (*knocking*). | Cota crítica de cámara muerta **`h_c = 10.0 mm`** (`V_c = 50.27 cm³`) entre corona PMS y culata + barra/etiqueta térmica en vivo acercándose a `722.5 K` (marcando zona segura vs umbral de *knocking*). | Ec. (9) y (4): `ΔU₁₂ = -W₁₂ ⟹ W₁₂ = -n c_v (T₂ - T₁) = -159.3 J` y `V_c = V_d / (r_c - 1) = 50.27 cm³`<br>Chips: `W₁₂` trabajo compresión · `T₂` 722.5 K · `V_c` cámara anti-knocking<br>Vivo: `T(θ)` K y `p(θ)` kPa subiendo en tiempo real. |
| **5 · Chispa + Expansión** (`loop 360°→540°`) | *¿Por qué de cuatro carreras solo UNA empuja de verdad al carro?* | **1. Qué ocurre:** Chispa en `360°` dispara `77.4 bar` y `2579 K`.<br>**2. Gracias a qué:** Aporte isocórico `Q_in = 700 J` empuja el pistón al bajar.<br>**3. Realidad:** Genera `+568.6 J` útiles que sostienen todo el ciclo. | Destello etiquetado **`Q_in = 700 J`** en la bujía + **vector rojo descendente de trabajo útil `F_gas`** sobre la corona durante `360°→540°` escalado con `p(θ)`. | Ec. (10) y (11): `ΔU₂₃ = Q_in = n c_v (T₃ - T₂) = 700.0 J ⟹ T₃ = 2579.3 K` y `ΔU₃₄ = -W₃₄ ⟹ W₃₄ = +n c_v (T₃ - T₄) = +568.6 J`<br>Chips: `Q_in` calor chispa · `T₃` pico térmico · `W₃₄` trabajo motriz útil<br>Vivo: `p(θ)` bar, `T(θ)` K y `W₃₄(θ)` (`0.0 → +568.6 J`). |
| **6 · Fase 4: Escape** (`loop 540°→720°`) | *¿Cómo sabe la válvula abrirse solo una vez cada DOS vueltas?* | **1. Qué ocurre:** Abre válvula derecha y el pistón barre los gases.<br>**2. Gracias a qué:** Árbol de levas gira a mitad de velocidad (`θ_leva = θ/2`).<br>**3. Realidad:** Al abrir en `540°`, se evacuan `290.7 J` de calor residual. | Indicador sincronizado **`ω_cigüeñal (2×)` vs `ω_leva (1× = θ/2)`** junto al árbol de levas + cota de alzada **`h_v = 5.5 mm`** en escape y etiqueta **`Q_out = 290.7 J`** en el conducto de salida. | Ec. (12) y (6): `ΔU₄₁ = -Q_out ⟹ Q_out = n c_v (T₄ - T₁) = 290.7 J` y `n c_v = 0.3770 J/K, ΔU = n c_v ΔT`<br>Chips: `T₄→T₁` enfriamiento a `V₁` fijo · `Q_out` calor cedido · `n c_v` capacidad térmica<br>Vivo: `θ` cigüeñal vs `θ_leva` grados y `h_v(θ)` mm. |
| **7 · Veredicto Termodinámico** (`continuous`) | *¿Por qué ni el motor ideal aprovecha el 100% de la gasolina?* | **1. Qué ocurre:** De `700 J` liberados, solo `+409.3 J` netos mueven el pistón (lazo `p–V`).<br>**2. Por qué ocurre:** En la explosión las partículas van sin dirección y muchas chocan a los lados del cilindro.<br>**3. Realidad:** No todo aporta al pistón: ideal `η = 58.48%` (`10.23 kW`) y real `25–35%`. | Etiquetas de síntesis + vectores de dispersión sobre el cilindro: **`Q_in = 700 J`**, flechas radiales contra las paredes laterales + flecha útil descendente **`+409.3 J`** (**`Choques laterales · Q_out = 290.7 J`**) y potencia **`10.23 kW`** a `3000 rpm`, coordinadas con el lazo `p–V`. | Ec. (13), (14), (15), (16): `W_neto = Q_in - Q_out = +409.3 J`, `η = 1 - Q_out / Q_in = 58.48%` (`P = W_neto(N/120) = 10.23 kW`)<br>+ **Diagrama `p–V` visible debajo** con área neta iluminada. |

### 5.4 Arquitectura de la Capa Blueprint 3D

Para garantizar nitidez absoluta en proyectores (1080p/720p) sin distorsión de perspectiva ni recorte por geometría metálica del bloque:

- **Proyección desde coordenadas reales del motor:** Se añade un helper puro de anclajes/proyección (o método de proyección en `engineScene` que proyecte puntos 3D del mundo a coordenadas normalizadas de pantalla `[-1, 1]` usando `camera` y las dimensiones actuales del viewport) para ubicar las cotas y vectores sobre una **capa SVG superpuesta** dentro de `viewport-container` (`pointer-events: none`), sincronizada frame a frame.
- **Puntos de anclaje físicos exactos en metros (coherentes con `engineScene.js`):**
  - Eje cilindro: `x = 0`; borde camisa: `x = ±0.040 m` (`B/2 = rInner`).
  - Corona pistón instantánea: `y_corona = y(θ) + hp`.
  - PMS corona: `yPmsCrown = a + lb + hp = 0.200 m`; PMI corona: `yPmiCrown = 0.120 m`; culata: `y_culata = yPmsCrown + hc`.
  - Válvula admisión: `x = -0.017 m`, apertura vertical `valves.intakeLift`.
  - Válvula escape: `x = +0.017 m`, apertura vertical `valves.exhaustLift`.
  - Trazador lateral (`waveGroup`): `xStart = 0.072 m` a `0.232 m`.
- **Ventaja:** Permite dibujar líneas punteadas tipo CAD, cotas con remates, flechas dinámicas de fuerza `F_gas` (cuya longitud escala con `p(θ)`) y etiquetas nítidas sin acoplar dependencias del DOM dentro de `geometry.js` ni `thermodynamics.js`.
- **Seguridad en pruebas:** Si no hay `camera` o dimensiones válidas de viewport (`width === 0` o entorno Node), la capa *blueprint* calcula sus descriptores de forma segura y omite el trazado SVG sin lanzar errores.

### 5.5 Aislamiento de Estado Físico en Modo Exposición

Para garantizar que lo proyectado coincida siempre con las fórmulas, cotas y valores nominales de la Ficha Técnica —incluso si el expositor ajustó sliders o presets en el modo libre antes de pulsar `K`—:

- **Parámetros nominales aislados:** Mientras `presentationState.isActive()` sea `true`, `main.js` calcula `computeStateAtTheta(state.theta, presentationParams)` con los valores físicos nominales de `DEFAULT_PARAMS` (`rc = 9`, `Qin = 700 J`, `N = 3000 rpm`, `B = 0.08 m`, `L = 0.08 m`, `a = 0.04 m`, `lb = 0.13 m`, `hp = 0.03 m`, `p1 = 100000 Pa`, `T1 = 300 K`, `gamma = 1.4`, `R = 8.314`), **preservando únicamente `kappa` del modo libre** (`{ ...DEFAULT_PARAMS, kappa: state.params.kappa }`) para que el preset *"Lento (κ = 0.005) para exposición"* siga controlando la velocidad angular de la charla.
- **Diagrama `p–V` limpio en Estación 7:** Al entrar en Modo Exposición, `pvDiagram` se dibuja con `ghostCycle = null` y en modo de escala `'auto'`.
- **No destructivo al salir:** No se sobrescriben `state.params`, `state.ghostCycle` ni `state.scaleModeIndex`; al salir del Modo Exposición (`K` / `Esc`), el simulador libre recupera exactamente el estado previo (`pvDiagram.setScaleMode(SCALE_MODES[state.scaleModeIndex])`, etc.).

### 5.6 Actualización en Tiempo Real sin Reconstruir HTML (`main.js` y `presentationHUD.js`)

En el código actual (`src/main.js`), `animate()` llama a `updateHUDStation()` en cada frame, lo que vuelve a ejecutar `innerHTML = buildStationCardHTML(...)` y `katex.renderToString(...)` 60 veces por segundo. Eso impediría animaciones CSS suaves de entrada y generaría trabajo innecesario.

- **Cambio arquitectónico obligado:**
  1. `renderStation(stationIndex, stationData, timerSeconds, isPaused)` se llama **solo al activar presentación, al cambiar de estación o al alternar pausa**. Construye las tarjetas compactas y renderiza KaTeX una sola vez por transición.
  2. Se incorpora `updateLiveTelemetry(thermoState)` en `presentationHUD` (invocado en `animate()` cuando `presentationState.isActive()` es verdadero), que actualiza únicamente el `.textContent` (y estilos de barra/alerta si aplica) de los nodos de lectura viva (`data-live-metric`) y actualiza la capa SVG *blueprint* con `(thermoState, stationData, camera, viewportSize)`.
  3. **Decisión de diseño en Estación 5 (`W₃₄(θ)`):** Para que la telemetría en vivo coincida exactamente con la fórmula `W₃₄ = n c_v (T₃ - T₄) = +568.6 J` mostrada en Estación 5 (`360°→540°`), el valor vivo muestra el trabajo acumulado de la carrera de expansión **`W₃₄(θ) = cycle.n_cv * (cycle.T3 - T)` (`0.0 J → +568.6 J`)** en lugar de `thermoState.Wacum` (`-119.1 J → +449.5 J`), sin alterar `thermodynamics.js`.
  4. En `main.js`, cuando el usuario pulsa teclas durante el modo exposición, `PageDown` / `PageUp` se suman a `Space` / `ArrowRight` / `ArrowLeft`, y las teclas `1`–`7` permiten saltar a la estación correspondiente (en lugar de caer al `switch` del modo simulador libre cuando la presentación está activa).

### 5.7 Compatibilidad de Módulos y Pruebas Existentes

- **`src/presentation/presentationState.js`:**
  - Cada elemento de `STATIONS` añade los campos del nuevo diseño: `hookQuestion`, `cues` (arreglo de 3 objetos `{ step, label, text }`), `blueprint` (tipo e ítems de cota/vector por estación), `formulaCards` (arreglo de `{ latex, terms: [{ symbol, meaning }] }`) y `liveMetrics` (claves/formatos a mostrar en tiempo real).
  - Se mantienen las propiedades `id`, `title`, `subtitle`, `badgeColor`, `camera`, `motion`, `hasSpark`, `equations` (con `>= 2` entradas o derivadas), `physicsNote` (conservando la mención explícita de *Fuerza externa periódica no armónica* en Estación 2 y *Detonación prematura* en Estación 4) y `importantPoints` para compatibilidad con el contrato de datos probado en `tests/presentationState.test.js`, o se actualizan explícitamente las aserciones de `tests/presentationHUD.test.js` donde el viejo DOM cambia:
    - En `presentationHUD.js`, el panel derecho deja de renderizar visualmente `.hud-important-card` en el HUD (en cumplimiento del Layout B sin tarjetas repetidas) y reemplaza el contenido de `.hud-station-card` por la Pregunta Real + 3 viñetas cortas; asimismo `.hud-pv-container` pasa a mostrarse en Estación 7 dentro del panel derecho (y oculto en estaciones 1–6). Las pruebas de `tests/presentationHUD.test.js` deberán actualizarse para reflejar el nuevo contrato visual de Layout B y añadir pruebas unitarias para `updateLiveTelemetry` y el generador/proyector de cotas *blueprint*.

---

## 6. Lo que Queda a Criterio del Constructor (Left to Builder)

- **Implementación exacta del proyector Blueprint:** Decidir si el helper `blueprintOverlay.js` proyecta mediante `THREE.Vector3.project(camera)` dentro de un nuevo módulo en `src/presentation/` o recibe una función `projectWorldToScreen(x, y, z)` expuesta por `engineScene.js`.
- **Ajuste fino de cámara y encuadre en `STATIONS`:** Afinar ligeramente `camera.position` / `target` (o `camera.zoom` si se usa zoom ortográfico) si en alguna estación la reducción de columnas de `470 px` a `330 px` permite un encuadre aún más favorecedor de las cotas *blueprint* y del diagrama `p–V` en la Estación 7.
- **Estilo visual de la capa Blueprint:** Paleta exacta de trazos punteados, puntas de flecha del vector `F_gas`, badge de temperatura en Estación 4 y tamaños tipográficos responsivos CSS (`clamp(...)`) para `1280×720` y `1920×1080`.
- **Redacción final pulida de textos cortos:** Ajustar las frases exactas de `hookQuestion`, `cues` y `terms` manteniendo fidelidad numérica absoluta con `geometry.js` y `thermodynamics.js` y brevedad estricta para lectura en proyector.
