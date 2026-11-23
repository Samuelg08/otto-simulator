# Simulador 3D de Motor Monocilíndrico de 4 Tiempos — Ciclo Otto Ideal (Física 2)

Aplicación web interactiva en **Three.js + Canvas 2D + JavaScript ES Modules** que simula la cinemática biela-manivela-pistón y la termodinámica del **Ciclo Otto Ideal de aire estándar** en unidades del Sistema Internacional (SI). Funciona **100 % offline** tras la instalación inicial.

---

## 1. Instalación y ejecución (100 % offline)

### Requisitos previos
- **Node.js** 18+ y **npm**.

### Comandos principales
```bash
# 1. Instalar dependencias (solo requiere conexión la primera vez)
npm install

# 2. Ejecutar la suite completa de pruebas unitarias (Secciones 8 y 10 de la ficha)
npm test

# 3. Iniciar el servidor de desarrollo interactivo
npm run dev

# 4. Compilar versión de producción para defensa sin conexión
npm run build
npm run preview