# Diseño del Modo Presentación "Keynote 3D" · Simulador Ciclo Otto Ideal

- **Fecha:** 2026-11-05
- **Proyecto:** Simulador Interactivo 3D del Ciclo Otto Ideal (Física 2)
- **Autor / Expositor:** Samuel Gallego Osorio
- **Docente:** Prof. Ruby Rocío Rodríguez Jacobo
- **Estado:** Aprobado para Planificación

---

## 1. Intención y Propósito ("The Why")

El objetivo es transformar la herramienta de simulación (`otto-simulator`) en una plataforma de exposición interactiva de alto impacto estético ("Modo Keynote 3D"). Samuel dispone de **10 minutos cronometrados** para exponer su proyecto final individualmente ante la profesora y sus compañeros. Se busca evitar la clásica presentación estática de diapositivas en PowerPoint y lograr una experiencia inmersiva continua, donde el código Three.js, la cinemática biela-manivela real y los principios termodinámicos se expliquen directamente sobre el motor en 3D en tiempo real.

---

## 2. Metas, No-Metas y Anti-Metas

### Metas (Goals)
1. **Modo Pantalla Completa / Presentación:** Permitir alternar entre el modo simulador libre actual y un modo guiado de presentación mediante un botón visible o la tecla `F` / `K`.
2. **7 Estaciones Cinemáticas:** Estructurar la exposición en 7 etapas sincronizadas con la narrativa de 10 minutos.
3. **Navegación Unificada por Teclado:** Avanzar entre estaciones con `Barra Espaciadora` o `Flecha Derecha`, retroceder con `Flecha Izquierda`, y pausar/reanudar el ciclo con `P` o `Espacio` sin tocar el ratón.
4. **Interpolación Cinemática de Cámara (Lerp / Tween):** Transiciones suaves de posición y objetivo (`target`) de la cámara de Three.js entre cada estación.
5. **HUD Flotante con Glassmorphism:** Tarjetas semitransparentes elegantes que presentan las ecuaciones, datos de estado ($p, V, T, W, \eta$) y los argumentos clave.
6. **Bucle Didáctico por Fase (Decisión de diseño):** Durante las estaciones dedicadas a una fase particular (3, 4, 5 y 6), el motor ejecuta un bucle continuo suave de esa carrera específica, manteniendo la escena en movimiento activo mientras el expositor habla.
7. **Diagrama p–V en Tiempo Real:** Tarjeta flotante HUD desacoplada del panel lateral que traza el lazo en vivo en una esquina durante las fases 3 a 6 y se expande en la Estación 7 para el balance final.
8. **Incorporación explícita de los dos énfasis docentes:**
   - Explicación física del volumen de la cámara de combustión ($V_c = 50.27\text{ cm}^3$, $h_c = 10.0\text{ mm}$, $r_c = 9$) como límite para prevenir la **autoignición prematura (detonación / *knocking*)**.
   - Justificación dinámica de la **imperfección del Movimiento Armónico Simple (M.A.S.)**: oblicuidad geométrica de la biela ($l_b = 130\text{ mm}$, $\lambda = 0.308$) sumada a la **fuerza impulsora externa periódica no lineal** producida por la combustión en $\theta = 360^\circ$ ($F_{gas} = p \cdot A$).
9. **Cronómetro sutil:** Indicador de tiempo transcurrido en el HUD (`00:00 / 10:00`) para ayudar a regular el ritmo de voz sin distraer.

### No-Metas (Non-Goals)
- No se busca interacción con la audiencia ni votaciones o encuestas durante la charla.
- No se sustituye el modelo físico ni se alteran las ecuaciones validadas en Vitest (`geometry.js`).
- No se requiere audio ni música de fondo incrustada.

### Anti-Metas (Anti-Goals)
- **Cero dependencia de maniobras manuales con el ratón:** El expositor no debe verse obligado a orbitar o reencuadrar la cámara a mano bajo los nervios de los 10 minutos, salvo que voluntariamente decida hacerlo ante una pregunta imprevista.
- **Sin pantallas estáticas o congeladas:** El motor nunca queda inerte; o bien rota en ciclo completo o cicla suavemente en la carrera que se está exponiendo.
- **Sin saturación visual:** Las tarjetas no deben tapar las partes mecánicas que se están explicando.
- **Sin ventanas externas:** No cambiar entre PowerPoint y el navegador; toda la presentación ocurre dentro de la aplicación.

---

## 3. Restricciones Técnicas y Académicas

- **Tiempo límite:** 10 minutos exactos.
- **Pila tecnológica:** HTML5, CSS3 moderno, Vanilla JavaScript (ES Modules), Three.js `0.170.0`, Canvas 2D, Vite `5.4.11`.
- **Compatibilidad:** Renderizado a 60 fps en navegadores modernos (Chromium / Firefox / Safari) sin librerías externas pesadas adicionales.
- **Fidelidad al modelo:** Los valores mostrados deben coincidir exactamente con los 4 estados de la Ficha Técnica de Física 2:
  - Estado 1 ($180^\circ$): $V_1 = 452.39\text{ cm}^3$, $p_1 = 100.0\text{ kPa}$, $T_1 = 300.0\text{ K}$.
  - Estado 2 ($360^\circ-$): $V_2 = 50.27\text{ cm}^3$, $p_2 = 2167.4\text{ kPa}$, $T_2 = 722.5\text{ K}$.
  - Estado 3 ($360^\circ$): $V_3 = 50.27\text{ cm}^3$, $p_3 = 7737.8\text{ kPa}$, $T_3 = 2579.3\text{ K}$.
  - Estado 4 ($540^\circ-$): $V_4 = 452.39\text{ cm}^3$, $p_4 = 357.0\text{ kPa}$, $T_4 = 1071.0\text{ K}$.
  - Balance: $Q_{in} = 700.0\text{ J}$, $W_{12} = -159.3\text{ J}$, $W_{34} = +568.6\text{ J}$, $W_{neto} = +409.3\text{ J}$, $Q_{out} = 290.7\text{ J}$, $\eta = 58.48\%$, $P = 10.23\text{ kW}$ (a $3000\text{ rpm}$).

---

## 4. Enfoques Considerados y Selección

| Enfoque | Descripción | Ventajas | Desventajas | Decisión |
| :--- | :--- | :--- | :--- | :--- |
| **Enfoque 1 (HUD Glassmorphism puro)** | Todo el lienzo en 3D con tarjetas flotantes translúcidas. | Estética impecable estilo Apple. | Requiere controlar la cámara o definir qué muestra en cada momento. | **Aceptado (combinado con 3)** |
| **Enfoque 2 (PowerPoint / Deck editorial externo)** | Diapositivas oscuras de alta gama + demo puntual. | Muy seguro y controlado. | Rompe la continuidad al cambiar de ventana; se siente tradicional. | **Descartado** |
| **Enfoque 3 (Consola de telemetría fija 60/40)** | Pantalla dividida fija con gráficos a la derecha. | Rigor técnico claro. | Menos dramático e inmersivo; reduce el tamaño del motor 3D. | **Descartado como vista única** |
| **Selección Definitiva: Fusión 1 + 3 (Keynote Story Mode 3D)** | Motor 3D a pantalla completa con HUD flotante glassmorphism y 7 estaciones cinemáticas preprogramadas navegables por teclado. | Máxima inmersión visual, control absoluto del tiempo (10 min) y cero estrés al exponer. | Requiere programar la máquina de estados de las 7 estaciones e interpolación de cámara. | **SELECCIONADO** |

---

## 5. Diseño Detallado de las 7 Estaciones (10 Minutos)

| Estación | Tiempo sugerido | Enfoque de Cámara 3D | Cinemática del Motor | Contenido de la Tarjeta HUD |
| :--- | :--- | :--- | :--- | :--- |
| **1. Introducción y Mecanismo** | 0:00 – 1:30 | Vista isométrica global elevada | Rotación continua ($3000\text{ rpm}$ escaladas) | **Motor Monocilíndrico 4T:** Diámetro $B = 80\text{ mm}$, carrera $L = 80\text{ mm}$, cilindrada $V_d = 402\text{ cm}^3$. Explicación del ciclo de 2 vueltas ($720^\circ$). |
| **2. Cinemática Real vs. M.A.S.** | 1:30 – 3:00 | Vista ortográfica lateral alineada al cilindro y biela | Rotación continua a velocidad didáctica con trazo senoidal | **La doble causa de la desviación del M.A.S.:**<br>1. *Geométrica:* Longitud finita de biela $l_b = 130\text{ mm}$ ($\lambda = 0.308$) acelera el pistón cerca del PMS.<br>2. *Dinámica:* Fuerza externa periódica no armónica $F(t) = p(t) \cdot A$ concentrada en el pulso de combustión en $360^\circ$ ($77.4\text{ bar}$). |
| **3. Fase 1: Admisión** | 3:00 – 4:15 | Zoom al cabezal del cilindro y válvula de admisión | **Bucle didáctico:** $0^\circ \to 180^\circ$ repetido suavemente | Válvula de admisión abierta (alzada $5.5\text{ mm}$). El pistón desciende hasta PMI. Aspiración a $p_1 = 100\text{ kPa}$, $T_1 = 300\text{ K}$, $V_1 = 452.4\text{ cm}^3$. Cantidad de mezcla $n = 0.0181\text{ mol}$. |
| **4. Fase 2: Compresión y Límite de Autoignición** | 4:15 – 5:30 | Vista de perfil con visualización de la reducción de volumen | **Bucle didáctico:** $180^\circ \to 360^\circ-$ repetido suavemente | Ambas válvulas cerradas. Proceso adiabático reversible ($Q=0$). $p_2 = 2167\text{ kPa}$, $T_2 = 722.5\text{ K}$ ($449^\circ\text{C}$). Trabajo absorbido $W_{12} = -159.3\text{ J}$.<br>**Límite de Detonación:** Si el volumen de la cámara $V_c$ fuera menor ($r_c > 12$), $T_2$ superaría la autoignición del combustible causando cascabeleo (*knocking*). |
| **5. Chispa e Ignición + Fase 3: Expansión** | 5:30 – 7:00 | Zoom a la cámara en PMS, destello de chispa y retroceso de cámara | **Bucle didáctico:** Destello en $360^\circ$ seguido de $360^\circ \to 540^\circ$ | **Aporte instantáneo de calor isocórico:** $Q_{in} = 700\text{ J}$ en PMS. Salto instantáneo a $p_3 = 7738\text{ kPa}$ ($77.4\text{ bar}$) y $T_3 = 2579\text{ K}$.<br>**Expansión adiabática útil:** El gas empuja el pistón produciendo trabajo positivo $W_{34} = +568.6\text{ J}$. |
| **6. Fase 4: Escape** | 7:00 – 8:15 | Enfoque en la válvula de escape y el tren de distribución | **Bucle didáctico:** $540^\circ \to 720^\circ$ repetido suavemente | Válvula de escape abierta. Expulsión de gases quemados y cesión isocórica de calor $Q_{out} = 290.7\text{ J}$ a $V_1$. El árbol de levas gira a media velocidad ($\theta_{leva} = \theta/2$). |
| **7. El Veredicto Termodinámico (Lazo p–V)** | 8:15 – 10:00 | Cámara panorámica con el diagrama p–V completo iluminado en primer plano | Rotación continua suave | **Balance global del ciclo:**<br>• Trabajo neto: $W_{neto} = W_{12} + W_{34} = +409.3\text{ J}$ (área del ciclo p–V).<br>• Eficiencia térmica ideal: $\eta = 1 - 1/r_c^{\gamma-1} = 58.48\%$.<br>• Potencia a $3000\text{ rpm}$: $P = 10.23\text{ kW}$.<br>• Contraste con motor real ($25\text{–}35\%$ debido a pérdidas térmicas, fricción y combustión progresiva). |

---

## 6. Aspectos de Interfaz y Comportamiento (UX/UI)

1. **Botón de Activación:**
   - En la esquina superior derecha o inferior del simulador: `Modo Exposición (10 min) [K]`.
   - Al activarse: se oculta el panel lateral denso de configuración y se entra a un layout cinematográfico limpio con el canvas 3D a pantalla completa.
2. **HUD Flotante (Glassmorphism):**
   - Fondo: `rgba(15, 23, 42, 0.75)` con `backdrop-filter: blur(12px)`.
   - Bordes: `1px solid rgba(148, 163, 184, 0.15)`.
   - Colores temáticos de fase:
     - Admisión: Cyan neón (`#38bdf8`)
     - Compresión: Ámbar (`#f59e0b`)
     - Combustión / Expansión: Carmesí fuego (`#ef4444`)
     - Escape: Pizarra / Plata (`#94a3b8`)
3. **Tarjeta de Telemetría p–V en Tiempo Real:**
   - Ubicada en la esquina inferior derecha durante las estaciones 3 a 6 para verificar cómo el punto termodinámico se desplaza en vivo durante cada bucle.
   - En la Estación 7, se desplaza y amplía hacia el centro de la escena para la explicación del área bajo la curva y el trabajo neto.
4. **Indicador de Estación y Cronómetro:**
   - Una barra sutil de progreso superior con 7 puntos interactivos (`1 2 3 4 5 6 7`).
   - Cronómetro `MM:SS / 10:00` con botón de pausa.
5. **Controles de Teclado:**
   - `Espacio` o `→`: Avanzar a la siguiente estación (la cámara viaja suavemente y se actualiza el contenido).
   - `←`: Retroceder estación.
   - `P`: Pausar / reanudar el movimiento del motor en cualquier momento.
   - `Escape` o `K`: Salir del modo presentación y volver a los controles habituales.

---

## 7. Lo que Queda a Criterio del Desarrollador (Left to Builder)

- Duración exacta de la interpolación de cámara (recomendado: 0.8s a 1.2s con curva *easeInOutCubic*).
- Coordenadas exactas $(x, y, z)$ de la cámara para cada estación según el encuadre óptimo de la malla 3D actual.
- Selector de tamaño de tipografía adaptable a proyectores estándar de aula (1080p).
- Persistencia local del estado de la presentación si se recarga la página.
