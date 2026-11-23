# Guía Práctica de Exposición al Salón — Simulador Ciclo Otto Ideal (Física 2)

- **Expositor:** Samuel Gallego Osorio
- **Docente:** Prof. Ruby Rocío Rodríguez Jacobo
- **Duración objetivo:** 10 minutos (7 estaciones en Modo Exposición + demostración/preguntas en Modo Libre)
- **Control:** Teclado del portátil (sin necesidad de pasador inalámbrico)
- **Entorno:** Portátil conectado a proyector de aula como pantalla externa (`100 % offline`)

---

## 1. Configuración del Portátil y el Proyector (`Win + P`)

Antes de pasar al frente o mientras conectas el cable HDMI/VGA al portátil, presiona **`Win + P`** y elige una de estas dos formas de proyectar:

### Opción recomendada: `Ampliar` (pantalla extendida)
- **En el proyector (pantalla externa):** arrastra la ventana del navegador al proyector, presiona **`F`** (pantalla completa) y luego **`K`** (Modo Exposición). El salón verá únicamente el simulador 3D limpio.
- **En la pantalla de tu portátil:** deja abierta esta guía (`docs/guia-exposicion-salon.md`) junto a un cronómetro silencioso. Así puedes mirar tus tiempos y respuestas rápidas sin que el salón lo vea en el proyector.
- *Importante:* Haz clic una vez dentro de la ventana del navegador en el proyector antes de empezar para que las teclas (`Espacio`, `→`, `←`, `1–7`, `P`) vayan directo al simulador.

### Opción alternativa: `Duplicar` (espejo)
- Todo lo que ves en el portátil se ve en el proyector. En ese caso **no necesitas abrir esta guía en pantalla**: las tarjetas de la izquierda del Modo Exposición ya muestran tu *Idea Central* y tus **3 pasos cortos** de respaldo.
- **Resolución del proyector:** en pantalla panorámica (`1920×1080`) las columnas laterales dejan amplio espacio al motor 3D, las cotas Blueprint y el trazador lateral. Si el proyector en modo espejo baja a una resolución más estrecha o cuadrada (`1280×720` o `4:3`), presiona **`Ctrl + -`** una vez en el navegador para dar más aire lateral al motor (y **`Ctrl + 0`** para volver al 100 %).

---

## 2. Checklist Pre-Vuelo (2 minutos antes de hablar)

1. **Levanta el servidor local offline** desde la carpeta del proyecto (usa la versión ya compilada en `dist/`, sin necesitar internet):
   ```bash
   npm run preview
   ```
   *(Alternativa en desarrollo: `npm run dev`. Si el Wi-Fi del salón tiene portal cautivo lento, desconecta el Wi-Fi para evitar demoras al cargar estilos externos de fuente; las fuentes de respaldo y KaTeX funcionan localmente).*
2. **Abre la URL local** en Chrome o Edge (`http://localhost:4173` por defecto con `vite preview`).
3. **Ajusta la velocidad didáctica antes de entrar al Modo Exposición:**
   - En el panel derecho (`Presets y Controles`), haz clic en **`Lento (κ=0.005)`**.
   - *Por qué:* al entrar al Modo Exposición, el simulador fija los valores nominales oficiales (`r_c = 9`, `Q_in = 700 J`, `N = 3000 rpm`), pero **conserva la velocidad de cámara lenta `κ`** que dejaste elegida. Con `κ = 0.005`, el giro baja de `180 °/s` a `90 °/s`, dando el doble de tiempo para que el salón observe las válvulas, la chispa y las flechas.
4. **Activa pantalla completa y el Modo Exposición:**
   - Pulsa **`F`** (pantalla completa).
   - Pulsa **`K`** (o haz clic en **`Modo Exposición (10 min) [K]`**). Quedarás en la **Estación 1**.
5. **Ten presente que el cronómetro interno del HUD está oculto** para evitar presión visual en pantalla; controla tu ritmo con los tiempos sugeridos de la tabla siguiente (o un cronómetro discreto en tu portátil/reloj).

---

## 3. Mapa de Teclado Rápido

### Dentro del Modo Exposición (`[K]` activo)
| Tecla | Acción | Cuándo usarla |
| :--- | :--- | :--- |
| **`Espacio`** o **`→`** | Siguiente estación (`1 → 7`) | Un solo toque para avanzar toda la exposición |
| **`←`** | Estación anterior (`7 → 1`) | Si necesitas regresar a una fase previa |
| **`1` – `7`** | Saltar directo a esa estación | Si la profesora pide volver a un punto específico |
| **`P`** | Pausar / Reanudar el motor | Para señalar una cota o un instante sin que se mueva |
| **`F`** | Entrar / Salir de pantalla completa | Al iniciar o terminar |
| **`K`** o **`Esc`** | Salir al Simulador Libre | Al final (para la ronda de preguntas) |

> En Modo Exposición los atajos del simulador libre (`L`, `G`, `R`, saltos de estado `1–5`) quedan bloqueados para que no cambies parámetros por accidente mientras expones. Si necesitas rotar el motor con el ratón para mostrar un ángulo en 3D, puedes arrastrar suavemente; al salir con `K` o `Esc`, la cámara se restablece sola.

### En el Simulador Libre (para preguntas al final)
| Tecla | Acción |
| :--- | :--- |
| **`Espacio`** | Pausar / Reanudar movimiento |
| **`←` / `→`** | Avanzar o retroceder **`1°`** (`Shift + ←/→` para **`±15°`**) |
| **`1`**, **`2`**, **`3`**, **`4`**, **`5`** | Saltar a Estado `1 (180°)`, `2 (360°⁻ pre-chispa)`, `3 (360° post-chispa)`, `4 (540°⁻)`, `1' (540°)` |
| **`L`** | Cambiar escala del diagrama `p–V` (`Auto` → `Fija 16 MPa` → `Log p`) |
| **`G`** | Ocultar el lazo fantasma del diagrama `p–V` |
| **`R`** | Restablecer cámara y parámetros por defecto |
| **`Shift + Arrastrar`** (en el visor 3D) | Girar el cigüeñal manualmente con el ratón |

---

## 4. Guion Minuto a Minuto (10:00 min · 7 Estaciones)

> **Consejo de oratoria:** No leas las tarjetas palabra por palabra. Mira al salón, lanza primero la **pregunta de la Idea Central**, señala en el proyector las **cotas Blueprint 3D** mientras el motor se mueve, y cierra apuntando a la **fórmula de la derecha** como respaldo matemático.

### Estación 1 · Introducción y Mecanismo: Arquitectura del Motor 4T (`0:00 – 1:15`)
- **En pantalla:** Vista isométrica en rotación continua. Cotas Blueprint **`B = 80 mm`**, **`L = 80 mm`** y callout **`Ciclo 720° (2 vueltas) · Vd = 402.12 cm³`**. A la derecha, `Ec. (2)`, `Ec. (3) y (4)` y lecturas vivas de `θ` y fase.
- **Qué decir:**
  1. **Gancho:** *"¿Cómo logra un solo cilindro transformar cuatro carreras rectilíneas de un pistón en rotación continua? Este simulador 3D resuelve en tiempo real la cinemática y termodinámica del Ciclo Otto Ideal en unidades del Sistema Internacional."*
  2. **Mecanismo (señala las cotas `B` y `L`):** *"Tenemos una arquitectura cuadrada: calibre `B = 80 mm` igual a la carrera `L = 80 mm`, con biela de `130 mm`. El área del pistón de `50.27 cm²` barre una cilindrada `V_d = 402.12 cm³`."*
  3. **Cámara y ciclo de 2 vueltas:** *"El pistón nunca toca arriba: siempre queda un volumen muerto `V_c = 50.27 cm³`. Con `V_1 = 452.39 cm³` tenemos relación de compresión `r_c = 9`. Y como son cuatro tiempos de `180°`, un ciclo térmico completo toma dos vueltas del cigüeñal: `720°`."*
- **Transición (`→`):** *"Pero a simple vista ese sube y baja parece un resorte armónico simple... veamos por qué en realidad no lo es."*

---

### Estación 2 · Dinámica y Cinemática Real vs. M.A.S. (`1:15 – 2:45`)
- **En pantalla:** La cámara se desplaza para mostrar el trazador oscilográfico lateral (`Δs = s - s_MAS`), la flecha sobre el pistón `F_gas = ... kN` (que se vuelve roja al llegar a `38.89 kN` en `360°`) y las ecuaciones `Ec. (7)` y `Ec. (1)`.
- **Qué decir (Énfasis docente #1):**
  1. **Lo que se ve (señala el trazo lateral `Δs`):** *"Si comparamos la curva real de color con la línea senoidal del Movimiento Armónico Simple ideal, vemos un desfase claro `Δs`."*
  2. **Causa cinemática (biela finita):** *"Primero por geometría: la biela finita de `130 mm` se inclina en cada giro y distorsiona la simetría frente a una senoidal pura."*
  3. **Causa dinámica (Segunda Ley de Newton):** *"Pero la razón física más fuerte está en la Segunda Ley de Newton: un M.A.S. exige sin excepción una fuerza restauradora elástica lineal y simétrica `F = -kx`. Aquí pasa lo contrario: una fuerza externa periódica no armónica `F_gas = p(t) · A` golpea al pistón únicamente en la combustión a `360°`, alcanzando `7737.8 kPa` (`7.74 MPa`) sobre `50.27 cm²`, es decir `38.89 kN` —casi 4 toneladas— en una sola carrera."*
- **Tip visual:** Si quieres señalar el pico con calma, presiona **`P`** cuando veas la flecha roja grande arriba y luego **`P`** para reanudar.
- **Transición (`→`):** *"Ahora recorramos una a una las cuatro carreras del ciclo, empezando por el llenado."*

---

### Estación 3 · Fase 1: Admisión (`2:45 – 3:50`)
- **En pantalla:** Zoom al cabezal con bucle suave `0° → 180°`. Partículas azules entrando, cota `h_v = ... mm` (máximo `5.5 mm`) en la válvula izquierda y etiqueta `V(θ)` con `p_1 = 100 kPa · T_1 = 300 K`.
- **Qué decir:**
  1. **Gancho:** *"¿Cómo entra mezcla fresca al cilindro sin ninguna bomba que la empuje?"*
  2. **Qué ocurre y gracias a qué:** *"Entre `0°` y `180°`, la leva izquierda abre la válvula de admisión hasta `5.5 mm` mientras el pistón baja del PMS al PMI. El volumen crece de `50.27` a `452.39 cm³` y aspira mezcla fresca a presión atmosférica `p_1 = 100 kPa` y `T_1 = 300 K`."*
  3. **Moles atrapados (`Ec. 5`):** *"Al cerrarse la válvula en `180°`, la ley del gas ideal fija exactamente `n = 0.01814 mol` encerrados para el resto del ciclo."*
- **Transición (`→`):** *"Con esa mezcla atrapada, ambas válvulas se cierran y empieza la compresión."*

---

### Estación 4 · Fase 2: Compresión Adiabática y Límite de Knocking (`3:50 – 5:10`)
- **En pantalla:** Bucle `180° → 360°` con color pasando de azul a ámbar. Cota crítica `h_c = 10.0 mm`, etiqueta `T(θ)` acercándose a `722.5 K` y `Ec. (9)` + `Ec. (4)`.
- **Qué decir (Énfasis docente #2):**
  1. **Proceso adiabático:** *"Entre `180°` y `360°` las dos válvulas están selladas. A `3000 rpm` esta subida dura unos `10 ms`, tan rápido que no escapa calor por las paredes (`Q = 0`)."*
  2. **Trabajo a energía interna (`Ec. 9`):** *"Por Primera Ley (`ΔU = -W`), los `159.3 J` de trabajo que entrega el cigüeñal (`W_12 = -159.3 J`) se convierten en calor interno: la presión sube casi 22 veces hasta `2167.4 kPa` y la temperatura llega a `722.5 K`."*
  3. **Barrera contra el knocking (señala `h_c = 10.0 mm`):** *"¿Y por qué el pistón no sube más para sacar más eficiencia? Porque esa altura muerta `h_c = 10.0 mm` (`V_c = 50.27 cm³`) es un límite de seguridad térmica: si comprimimos demasiado (`r_c > 12`), `T_2` superaría la temperatura de autoignición del combustible y explotaría antes de la chispa —el fenómeno destructivo de detonación o knocking."*
- **Transición (`→`):** *"Justo en ese punto muerto superior de `360°` salta la chispa."*

---

### Estación 5 · Chispa e Ignición + Expansión (`5:10 – 6:40`)
- **En pantalla:** Al entrar, `θ` salta directo a `360°` mostrando el destello de la chispa, frente de llama, callout `Chispa Q_in = 700 J`, vector rojo descendente `Empuje ... kN` y el trabajo vivo `W₃₄(θ)` creciendo de `0.0` a `+568.6 J` durante `360° → 540°`.
- **Qué decir:**
  1. **Chispa isocórica (`Ec. 10`):** *"En `360°` el pistón está instantáneamente detenido en el PMS. Se liberan `Q_in = 700.0 J` a volumen constante (`W_23 = 0`): la temperatura se dispara de `722.5 K` a `2579.3 K` y la presión salta a `7737.8 kPa` (`7.74 MPa`)."*
  2. **Expansión motriz (`Ec. 11`):** *"Esos gases incandescentes empujan el pistón hacia abajo de `360°` a `540°` en una expansión adiabática (`Q_34 = 0`), produciendo `+568.6 J` de trabajo positivo."*
  3. **Idea clave:** *"De las cuatro carreras del motor, esta es la ÚNICA carrera motriz: el resto del ciclo se sostiene con la inercia que se acumula aquí."*
- **Transición (`→`):** *"Al llegar abajo en `540°`, todavía queda calor y presión residual que hay que evacuar."*

---

### Estación 6 · Fase 4: Escape (`6:40 – 7:55`)
- **En pantalla:** Bucle `540° → 720°` con gases grises saliendo por la derecha. Cota `h_v = ... mm`, callout `Relación 1:2 en levas (θ/2)` y callout `Q_out = 290.7 J`.
- **Qué decir:**
  1. **Calor residual (`Ec. 12`):** *"En `540°` se abre la válvula de escape. El salto súbito de presión y temperatura (`1071 K → 300 K`) cede `Q_out = 290.7 J` hacia el foco frío a volumen fijo `V_1`, y luego el pistón barre los gases quemados hasta `720°` regresando al estado inicial (`ΔU_ciclo = 0`)."*
  2. **Sincronización `1:2` (señala el árbol de levas arriba):** *"¿Cómo sabe la válvula abrirse solo una vez cada dos vueltas? Porque el árbol de levas está acoplado con relación `1:2`: cuando el cigüeñal gira `720°`, la leva gira `360°` (`θ_leva = θ / 2`), es decir a `1500 rpm` cuando el motor va a `3000 rpm`."*
- **Transición (`→`):** *"Si ya entraron `700 J` y se fueron `290.7 J`, pasemos al balance final del ciclo."*

---

### Estación 7 · El Veredicto Termodinámico: Balance y Rendimiento (`7:55 – 9:30`)
- **En pantalla:** Vista panorámica en rotación continua. En el cilindro aparecen las flechas radiales (`Choques a los lados · Q_out = 290.7 J`) y el empuje verde (`W_neto = +409.3 J · 10.23 kW`), y a la derecha aparece el **Diagrama `p–V` en vivo** con el área neta sombreada.
- **Qué decir:**
  1. **Balance en el lazo `p–V` (señala el área sombreada del diagrama):** *"El área encerrada por el ciclo `p–V` equivale exactamente a la integral cíclica `∮ p dV = W_12 + W_34 = -159.3 + 568.6 = +409.3 J`, igual a `Q_in - Q_out = 700.0 - 290.7 = +409.3 J`."*
  2. **Por qué no es 100 % (señala las partículas en el cilindro):** *"¿Por qué ni en un motor ideal se aprovechan los `700 J` completos? Porque en la explosión las partículas salen disparadas hacia todos lados sin una dirección única: muchas chocan lateralmente contra las paredes del cilindro y la culata sin empujar el pistón hacia abajo."*
  3. **Ideal vs. real:** *"Por eso nuestro techo termodinámico ideal es `η = 58.48 %`, que a `3000 rpm` (`25 ciclos/s`) entrega `P = 10.23 kW`. En un motor real, como esos choques laterales transfieren calor a las paredes refrigeradas y además hay fricción y combustión progresiva, el rendimiento efectivo baja al `25–35 %`."*

### Cierre (`9:30 – 10:00`)
- *"Con esto cerramos el recorrido completo desde la geometría y la Segunda Ley de Newton hasta el balance térmico en el diagrama `p–V`. Si tienen alguna pregunta o quieren probar otro valor de compresión o calor en vivo, podemos verlo directamente en el simulador."*
- Pulsa **`K`** o **`Esc`** para salir al Simulador Libre y quedar listo para las preguntas.

---

## 5. Playbook de Demostraciones en Vivo (Modo Libre · Q&A)

Si la profesora o un compañero pregunta *"¿y qué pasaría si...?"*, usa estas recetas de 10 segundos en el Simulador Libre:

1. **"¿Qué pasa si subimos o bajamos la relación de compresión `r_c`?"**
   - Haz clic en el preset **`Baja rc (rc=4)`** y luego en **`Máx (rc=14, 800J)`** (o mueve el slider `rc`).
   - **Qué señalar:** la culata 3D baja o sube físicamente (`h_c = 26.67 mm` con `rc=4` vs `h_c` mucho menor en `rc=14`), el **lazo fantasma** gris punteado en el diagrama `p–V` queda dibujado para comparar el ciclo anterior contra el nuevo, y la eficiencia `η` cambia (`42.57 %` con `rc=4` frente a `58.48 %` con `rc=9`).
   - *Limpieza:* pulsa **`G`** para ocultar el lazo fantasma cuando termines.

2. **"¿Cómo se ve exactamente el salto vertical de la chispa en `360°`?"**
   - Pulsa la tecla **`2`** (congela en `360°⁻`, Estado 2: `722.5 K`, `2167.4 kPa`, `50.27 cm³`) y luego la tecla **`3`** (salta a `360°`, Estado 3: `2579.3 K`, `7737.8 kPa`, mismo `50.27 cm³`).
   - Pulsa **`L`** para alternar el diagrama `p–V` a escala **`Fija 16 MPa`** o **`Log p`** si quieres resaltar las rectas verticales isocóricas.

3. **"¿Si acelero el motor (`N` en rpm) sube la eficiencia o el trabajo por ciclo?"**
   - Mueve el slider **`Velocidad de giro (N)`** de `3000` a `6000 rpm`.
   - **Qué señalar:** la potencia **`P`** se duplica porque hay más ciclos por segundo (`P = W_neto · (N / 120)`), pero el lazo **`p–V`**, `W_neto` y **`η`** no cambian en absoluto.

4. **Volver al estado limpio en cualquier momento:** pulsa **`R`** (`Restablecer`).

---

## 6. Banco de Preguntas Probables (Respuestas de 20 segundos)

1. **¿Por qué dicen que el pistón NO hace Movimiento Armónico Simple (M.A.S.)?**
   - *Respuesta:* Por dos razones: cinemáticamente la biela finita (`l_b = 130 mm`) introduce una asimetría respecto a una senoidal pura; y dinámicamente, por Segunda Ley de Newton, un M.A.S. requiere una fuerza restauradora lineal simétrica `F = -kx`, mientras que aquí actúa una fuerza externa periódica no armónica (`F_gas = p(t)·A`) concentrada en el pulso de `360°` (`38.89 kN`).
2. **¿Por qué no aumentar `r_c` hasta `20` para tener mucha más eficiencia en gasolina?**
   - *Respuesta:* Porque `T_2 = T_1 · r_c^(γ - 1)` sube con la compresión. En motores de gasolina, superar `r_c ≈ 12` eleva `T_2` por encima de la temperatura de autoignición de la mezcla y provoca detonación prematura (*knocking*), generando ondas de choque que dañan el pistón antes de la chispa. El volumen muerto `V_c = 50.27 cm³` (`h_c = 10 mm`) actúa como límite de seguridad.
3. **¿Por qué el árbol de levas gira a la mitad de velocidad (`1:2`) que el cigüeñal?**
   - *Respuesta:* Porque el ciclo de 4 tiempos dura `720°` (2 vueltas del cigüeñal), pero cada válvula solo debe abrirse una vez por ciclo (admisión en `0°–180°`, escape en `540°–720°`). Una vuelta completa de la leva (`360°`) debe corresponder a dos del cigüeñal (`720°`), es decir `θ_leva = θ / 2`.
4. **¿Qué pasa con el trabajo de admisión (`0°–180°`) y escape (`540°–720°`) en el ciclo ideal?**
   - *Respuesta:* Ambos ocurren de forma isobárica a `p_1 = 100 kPa`. En admisión el gas hace trabajo positivo (`+p_1 · V_d = +40.21 J`) y en escape el pistón hace el mismo trabajo negativo (`-40.21 J`) para barrer los gases; por eso en el ciclo ideal neto se cancelan exactamente (`0 J`) y en el diagrama `p–V` aparecen como la línea horizontal punteada inferior.
5. **¿Por qué la combustión y el escape se dibujan verticales en el diagrama `p–V`?**
   - *Respuesta:* Porque en el Ciclo Otto Ideal se aproximan como procesos isocóricos instantáneos (`ΔV = 0`, `W = 0`): en `360°` (PMS) la combustión ocurre tan rápido que el pistón casi no se mueve (`V = V_c` constante) y en `540°` (PMI) la despresurización inicial al abrir el escape se modela a volumen `V_1` constante.
6. **¿Por qué `η = 1 - 1 / r_c^(γ - 1)` solo depende de `r_c` y `γ` y no de `Q_in`?**
   - *Respuesta:* Porque al sustituir `T_2 = T_1 r_c^(γ-1)` y `T_4 = T_3 r_c^(1-γ)` en `η = 1 - Q_out/Q_in = 1 - (T_4 - T_1)/(T_3 - T_2)`, el factor `(T_3 - T_2)` se cancela algebraicamente. Si aumentas `Q_in`, aumenta el trabajo neto `W_neto`, pero también `Q_out` en la misma proporción y la eficiencia ideal `η` se mantiene constante.
7. **¿Por qué en el simulador `Q_in` y `Q_out` se calculan con `n · c_v · ΔT`?**
   - *Respuesta:* Porque en el ciclo de aire estándar cerrado la combustión (`2 → 3`) y el rechazo térmico (`4 → 1`) son a volumen constante (`W = 0`), así que por Primera Ley de la Termodinámica (`ΔU = Q - W`), todo el calor intercambiado equivale al cambio de energía interna `ΔU = n · c_v · ΔT` del gas ideal (`c_v = R / (γ - 1)`).
8. **¿Qué diferencias hacen que un motor real solo rinda entre `25 %` y `35 %` frente al `58.48 %` ideal?**
   - *Respuesta:* Las partículas en la explosión chocan contra las paredes cediendo calor (los procesos reales no son estrictamente adiabáticos), la combustión tarda algunos grados de giro (no es instantánea en `360°`), hay pérdidas de bombeo al entrar/salir gases y rozamiento mecánico en anillos, biela y cojinetes.
