import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  easeInOutCubic,
  interpolateVector,
  createCameraAnimator
} from '../src/scene/cameraAnimator.js';

describe('cameraAnimator · Funciones matemáticas puras', () => {
  describe('easeInOutCubic', () => {
    it('retorna 0 para t <= 0 y 1 para t >= 1 (valores de frontera y clamping)', () => {
      expect(easeInOutCubic(0)).toBe(0);
      expect(easeInOutCubic(-0.1)).toBe(0);
      expect(easeInOutCubic(-10)).toBe(0);

      expect(easeInOutCubic(1)).toBe(1);
      expect(easeInOutCubic(1.05)).toBe(1);
      expect(easeInOutCubic(50)).toBe(1);
    });

    it('evalúa exactamente en t = 0.5 y satisface las fórmulas cúbicas en ambas mitades', () => {
      // Centro exacto
      expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);

      // t < 0.5: 4 * t^3
      // Para t = 0.25: 4 * (0.25)^3 = 4 * 0.015625 = 0.0625
      expect(easeInOutCubic(0.25)).toBeCloseTo(0.0625, 6);

      // t >= 0.5: 1 - (-2t + 2)^3 / 2
      // Para t = 0.75: 1 - (-2 * 0.75 + 2)^3 / 2 = 1 - (0.5)^3 / 2 = 1 - 0.0625 = 0.9375
      expect(easeInOutCubic(0.75)).toBeCloseTo(0.9375, 6);
    });

    it('cumple simetría puntual f(t) + f(1 - t) = 1 para todo t en [0, 1]', () => {
      const samples = [0.05, 0.1, 0.2, 0.33, 0.45, 0.5, 0.67, 0.85, 0.95];
      for (const t of samples) {
        const sum = easeInOutCubic(t) + easeInOutCubic(1 - t);
        expect(sum).toBeCloseTo(1.0, 9);
      }
    });

    it('es estrictamente monótona creciente en el intervalo abierto (0, 1)', () => {
      let prev = 0;
      for (let t = 0.05; t <= 0.95; t += 0.05) {
        const current = easeInOutCubic(t);
        expect(current).toBeGreaterThan(prev);
        prev = current;
      }
    });
  });

  describe('interpolateVector', () => {
    it('interpola exactamente a 0%, 50% y 100% entre origen y destino', () => {
      const start = { x: 0, y: 10, z: 20 };
      const end = { x: 10, y: 30, z: 50 };

      const at0 = interpolateVector(start, end, 0);
      expect(at0).toEqual({ x: 0, y: 10, z: 20 });

      const at50 = interpolateVector(start, end, 0.5);
      expect(at50.x).toBeCloseTo(5, 6);
      expect(at50.y).toBeCloseTo(20, 6);
      expect(at50.z).toBeCloseTo(35, 6);

      const at100 = interpolateVector(start, end, 1);
      expect(at100).toEqual({ x: 10, y: 30, z: 50 });
    });

    it('maneja arrays [x, y, z] como entradas', () => {
      const start = [1, 2, 3];
      const end = [5, 10, 15];
      const mid = interpolateVector(start, end, 0.5);
      expect(mid).toEqual({ x: 3, y: 6, z: 9 });
    });

    it('maneja instancias de THREE.Vector3 y actualiza el objeto out cuando se proporciona', () => {
      const vStart = new THREE.Vector3(0, 0, 0);
      const vEnd = new THREE.Vector3(100, 200, 300);
      const vOut = new THREE.Vector3();

      const result = interpolateVector(vStart, vEnd, 0.25, vOut);
      expect(result).toBe(vOut);
      expect(vOut.x).toBeCloseTo(25, 6);
      expect(vOut.y).toBeCloseTo(50, 6);
      expect(vOut.z).toBeCloseTo(75, 6);
    });
  });
});

describe('cameraAnimator · Gestor createCameraAnimator', () => {
  function createMocks() {
    const camera = {
      position: { x: 0, y: 0, z: 1, set: vi.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; }) },
      lookAt: vi.fn()
    };
    const controls = {
      target: { x: 0, y: 0, z: 0, set: vi.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; }) },
      update: vi.fn()
    };
    return { camera, controls };
  }

  it('inicia en estado inactivo y update(dt) retorna false cuando no hay animación', () => {
    const { camera, controls } = createMocks();
    const animator = createCameraAnimator(camera, controls);

    expect(animator.isAnimating()).toBe(false);
    expect(animator.update(0.016)).toBe(false);
    expect(controls.update).not.toHaveBeenCalled();
    expect(camera.lookAt).not.toHaveBeenCalled();
  });

  it('ejecuta transición suave de posición y target usando easeInOutCubic', () => {
    const { camera, controls } = createMocks();
    const animator = createCameraAnimator(camera, controls);

    const targetPos = { x: 10, y: 20, z: 30 };
    const targetLookAt = { x: 2, y: 4, z: 6 };

    animator.transitionTo(targetPos, targetLookAt, 1.0);
    expect(animator.isAnimating()).toBe(true);

    // Paso a la mitad del tiempo (0.5s de 1.0s)
    const stillRunning = animator.update(0.5);
    expect(stillRunning).toBe(true);
    expect(animator.isAnimating()).toBe(true);

    // En t = 0.5, easeInOutCubic(0.5) = 0.5 exactamente
    // Posición esperada: (0, 0, 1) + 0.5 * ((10, 20, 30) - (0, 0, 1)) = (5, 10, 15.5)
    expect(camera.position.x).toBeCloseTo(5, 5);
    expect(camera.position.y).toBeCloseTo(10, 5);
    expect(camera.position.z).toBeCloseTo(15.5, 5);

    // Target esperado: (0, 0, 0) + 0.5 * (2, 4, 6) = (1, 2, 3)
    expect(controls.target.x).toBeCloseTo(1, 5);
    expect(controls.target.y).toBeCloseTo(2, 5);
    expect(controls.target.z).toBeCloseTo(3, 5);

    expect(controls.update).toHaveBeenCalled();
    expect(camera.lookAt).toHaveBeenCalledWith(1, 2, 3);

    // Paso final (0.5s restantes): debe alcanzar el 100% y finalizar
    const stillRunningAtEnd = animator.update(0.5);
    expect(stillRunningAtEnd).toBe(false);
    expect(animator.isAnimating()).toBe(false);

    expect(camera.position.x).toBeCloseTo(10, 5);
    expect(camera.position.y).toBeCloseTo(20, 5);
    expect(camera.position.z).toBeCloseTo(30, 5);

    expect(controls.target.x).toBeCloseTo(2, 5);
    expect(controls.target.y).toBeCloseTo(4, 5);
    expect(controls.target.z).toBeCloseTo(6, 5);

    // Actualizaciones posteriores no deben reactivarse
    expect(animator.update(0.1)).toBe(false);
  });

  it('opera correctamente cuando controls es null (target inicial por defecto en 0, 0, 0)', () => {
    const camera = {
      position: { x: 1, y: 1, z: 1, set: vi.fn(function(x, y, z) { this.x = x; this.y = y; this.z = z; }) },
      lookAt: vi.fn()
    };
    const animator = createCameraAnimator(camera, null);

    animator.transitionTo({ x: 3, y: 5, z: 7 }, { x: 0, y: 2, z: 4 }, 2.0);
    expect(animator.isAnimating()).toBe(true);

    // Avanza 1.0s (50% de 2.0s)
    expect(animator.update(1.0)).toBe(true);
    expect(camera.position.x).toBeCloseTo(2, 5); // 1 + 0.5*(3-1)
    expect(camera.position.y).toBeCloseTo(3, 5); // 1 + 0.5*(5-1)
    expect(camera.position.z).toBeCloseTo(4, 5); // 1 + 0.5*(7-1)

    // lookAt inicial era (0, 0, 0), final (0, 2, 4) -> a 50% es (0, 1, 2)
    expect(camera.lookAt).toHaveBeenCalledWith(0, 1, 2);

    // Completa la animación
    expect(animator.update(1.0)).toBe(false);
    expect(animator.isAnimating()).toBe(false);
    expect(camera.position.x).toBeCloseTo(3, 5);
    expect(camera.lookAt).toHaveBeenCalledWith(0, 2, 4);
  });

  it('permite cancelar una animación activa en cualquier momento con cancel()', () => {
    const { camera, controls } = createMocks();
    const animator = createCameraAnimator(camera, controls);

    animator.transitionTo({ x: 10, y: 10, z: 10 }, { x: 5, y: 5, z: 5 }, 1.0);
    expect(animator.isAnimating()).toBe(true);

    animator.update(0.25);
    expect(animator.isAnimating()).toBe(true);
    const stoppedPosX = camera.position.x;

    animator.cancel();
    expect(animator.isAnimating()).toBe(false);

    // Llamadas subsecuentes a update no avanzan ni modifican la posición
    expect(animator.update(0.5)).toBe(false);
    expect(camera.position.x).toBe(stoppedPosX);
  });

  it('maneja duración de 0 segundos completando inmediatamente', () => {
    const { camera, controls } = createMocks();
    const animator = createCameraAnimator(camera, controls);

    animator.transitionTo({ x: 50, y: 60, z: 70 }, { x: 1, y: 2, z: 3 }, 0);
    expect(animator.isAnimating()).toBe(false);
    expect(camera.position.x).toBe(50);
    expect(camera.position.y).toBe(60);
    expect(camera.position.z).toBe(70);
    expect(controls.target.x).toBe(1);
    expect(controls.target.y).toBe(2);
    expect(controls.target.z).toBe(3);
    expect(controls.update).toHaveBeenCalled();
    expect(camera.lookAt).toHaveBeenCalledWith(1, 2, 3);
  });

  it('permite encadenar una nueva transición en pleno vuelo sin discontinuidades', () => {
    const { camera, controls } = createMocks();
    const animator = createCameraAnimator(camera, controls);

    // Transición 1 hacia (10, 10, 10)
    animator.transitionTo({ x: 10, y: 10, z: 10 }, { x: 0, y: 0, z: 0 }, 1.0);
    animator.update(0.5); // Ahora está en mitad de camino (~5, 5, 5.5)
    const midX = camera.position.x;

    // En pleno vuelo, redirigir hacia (20, 20, 20)
    animator.transitionTo({ x: 20, y: 20, z: 20 }, { x: 2, y: 2, z: 2 }, 1.0);
    expect(animator.isAnimating()).toBe(true);

    // En dt = 0, la posición no debe saltar bruscamente
    animator.update(0.0001);
    expect(camera.position.x).toBeCloseTo(midX, 2);

    // Al completar, llega al nuevo objetivo
    animator.update(1.0);
    expect(camera.position.x).toBeCloseTo(20, 5);
    expect(controls.target.x).toBeCloseTo(2, 5);
  });
});
