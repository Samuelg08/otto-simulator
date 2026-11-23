import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  s,
  s_mas,
  toRadiansMod360,
  normalizeCycleAngle,
  getCyclePhase
} from '../model/geometry.js';

/**
 * Textura radial suave en memoria (100 % offline) para el halo de la chispa.
 */
function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Escala de color térmico del gas entre 300 K y 3200 K (Sección 9 de la ficha):
 * - 300 K: Azul fresco (#38bdf8)
 * - 750 K: Ámbar compresión (#f59e0b)
 * - 1500 K: Rojo expansión (#ef4444)
 * - 2400 K: Naranja-amarillo combustión (#fbbf24)
 * - 3200 K: Blanco-amarillo incandescente (#fef9c3)
 */
const THERMAL_STOPS = [
  { t: 300, color: new THREE.Color(0x38bdf8) },
  { t: 750, color: new THREE.Color(0xf59e0b) },
  { t: 1500, color: new THREE.Color(0xef4444) },
  { t: 2400, color: new THREE.Color(0xfbbf24) },
  { t: 3200, color: new THREE.Color(0xfef9c3) }
];

export function temperatureToColor(T, target = new THREE.Color()) {
  const clamped = Math.max(300, Math.min(3200, T));
  for (let i = 0; i < THERMAL_STOPS.length - 1; i++) {
    const a = THERMAL_STOPS[i];
    const b = THERMAL_STOPS[i + 1];
    if (clamped >= a.t && clamped <= b.t) {
      const u = (clamped - a.t) / (b.t - a.t);
      return target.copy(a.color).lerp(b.color, u);
    }
  }
  return target.copy(THERMAL_STOPS[THERMAL_STOPS.length - 1].color);
}

/**
 * Escena 3D PBR acoplada con el modelo termodinámico (Hito 3):
 * - Culata móvil según rc: y_culata = (a + lb) + hp + hc.
 * - Color del gas y partículas de la cámara gobernado por T(theta) (300 K a 3200 K).
 * - Válvulas y árboles de levas girando a media velocidad (theta / 2).
 * - Chispa eléctrica y frente de llama en 360° escalados según Qin.
 */
export function createEngineScene(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envInstance = new RoomEnvironment();
  scene.environment = pmremGenerator.fromScene(envInstance, 0.035).texture;
  envInstance.dispose();
  pmremGenerator.dispose();

  const frustumHeight = 0.35;
  const aspect = container.clientWidth / container.clientHeight;
  const camera = new THREE.OrthographicCamera(
    (-frustumHeight * aspect) / 2,
    (frustumHeight * aspect) / 2,
    frustumHeight / 2,
    -frustumHeight / 2,
    0.01,
    10
  );

  const defaultTarget = new THREE.Vector3(0.055, 0.102, 0);
  const defaultCamPos = new THREE.Vector3(0.055, 0.102, 0.85);
  camera.position.copy(defaultCamPos);
  camera.lookAt(defaultTarget);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(defaultTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.update();

  // Iluminación PBR
  const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
  keyLight.position.set(0.38, 0.55, 0.48);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 1.8;
  const d = 0.24;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.35);
  rimLight.position.set(-0.45, 0.28, -0.45);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.85);
  fillLight.position.set(-0.25, -0.35, 0.55);
  scene.add(fillLight);

  const chamberLight = new THREE.PointLight(0x38bdf8, 0.9, 0.25);
  chamberLight.position.set(0, 0.195, 0.02);
  scene.add(chamberLight);

  const sparkFlashLight = new THREE.PointLight(0xe0f2fe, 0, 0.32);
  sparkFlashLight.position.set(0, 0.208, 0.015);
  scene.add(sparkFlashLight);

  const glowTexture = createGlowTexture();

  // Materiales PBR
  const matBlockCastIron = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.78,
    roughness: 0.38,
    side: THREE.DoubleSide
  });
  const matHonedLiner = new THREE.MeshPhysicalMaterial({
    color: 0xcbd5e1,
    metalness: 0.92,
    roughness: 0.14,
    clearcoat: 0.4,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide
  });
  const matSectionBlock = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    metalness: 0.25,
    roughness: 0.6,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    side: THREE.DoubleSide
  });
  const matHeadAluminum = new THREE.MeshPhysicalMaterial({
    color: 0xd1d5db,
    metalness: 0.86,
    roughness: 0.22,
    clearcoat: 0.2,
    side: THREE.DoubleSide
  });
  const matSectionHead = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    metalness: 0.3,
    roughness: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    side: THREE.DoubleSide
  });
  const matCopperGasket = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.2,
    side: THREE.DoubleSide
  });
  const matCylinderGlass = new THREE.MeshPhysicalMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.13,
    metalness: 0.0,
    roughness: 0.06,
    ior: 1.48,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const matPiston = new THREE.MeshPhysicalMaterial({
    color: 0xf1f5f9,
    metalness: 0.92,
    roughness: 0.16,
    clearcoat: 0.3,
    clearcoatRoughness: 0.15
  });
  const matPistonSkirtPad = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.5,
    roughness: 0.45
  });
  const matPistonRingDark = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.18
  });
  const matPolishedSteel = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    metalness: 0.97,
    roughness: 0.08,
    clearcoat: 0.5
  });
  const matForgedRod = new THREE.MeshPhysicalMaterial({
    color: 0x94a3b8,
    metalness: 0.86,
    roughness: 0.25,
    clearcoat: 0.2
  });
  const matRodPocket = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.8,
    roughness: 0.38
  });
  const matCrankWeb = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.85,
    roughness: 0.28
  });
  const matCutOutline = new THREE.LineBasicMaterial({
    color: 0xf8fafc,
    transparent: true,
    opacity: 0.45
  });

  const B = 0.08;
  const radius = B / 2;
  const a = 0.04;
  const L = 0.08;
  const lb = 0.13;
  const hp = 0.03;
  const yPmsCrown = a + lb + hp;   // 0.200 m
  const yPmiCrown = yPmsCrown - L; // 0.120 m

  function createSectionCaps(profilePoints, material) {
    const group = new THREE.Group();
    const rightShape = new THREE.Shape(profilePoints);
    const rightGeo = new THREE.ShapeGeometry(rightShape);
    group.add(
      new THREE.Mesh(rightGeo, material),
      new THREE.LineSegments(new THREE.EdgesGeometry(rightGeo), matCutOutline)
    );
    const leftPoints = profilePoints.map((pt) => new THREE.Vector2(-pt.x, pt.y));
    const leftShape = new THREE.Shape(leftPoints);
    const leftGeo = new THREE.ShapeGeometry(leftShape);
    group.add(
      new THREE.Mesh(leftGeo, material),
      new THREE.LineSegments(new THREE.EdgesGeometry(leftGeo), matCutOutline)
    );
    return group;
  }

  // 1. Bloque del cilindro y cárter en corte CAD
  const cylinderGroup = new THREE.Group();
  const yBotLiner = 0.064;
  const yTopBlock = yPmsCrown;
  const rInner = radius;
  const rWall = radius + 0.0065;
  const rFin = radius + 0.016;

  const finCount = 8;
  const firstFinY = 0.191;
  const finPitch = 0.015;
  const finHalfBase = 0.0019;
  const finHalfTip = 0.0012;

  const blockProfile = [
    new THREE.Vector2(rInner, yBotLiner),
    new THREE.Vector2(rInner, yTopBlock),
    new THREE.Vector2(rWall + 0.004, yTopBlock),
    new THREE.Vector2(rWall + 0.004, firstFinY + finHalfBase + 0.002),
    new THREE.Vector2(rWall, firstFinY + finHalfBase + 0.002)
  ];
  for (let i = 0; i < finCount; i++) {
    const yc = firstFinY - i * finPitch;
    blockProfile.push(
      new THREE.Vector2(rWall, yc + finHalfBase),
      new THREE.Vector2(rFin, yc + finHalfTip),
      new THREE.Vector2(rFin, yc - finHalfTip),
      new THREE.Vector2(rWall, yc - finHalfBase)
    );
  }
  blockProfile.push(
    new THREE.Vector2(rWall, yBotLiner + 0.006),
    new THREE.Vector2(rWall + 0.006, yBotLiner + 0.006),
    new THREE.Vector2(rWall + 0.006, yBotLiner),
    new THREE.Vector2(rInner, yBotLiner)
  );

  const blockLatheMesh = new THREE.Mesh(
    new THREE.LatheGeometry(blockProfile, 64, Math.PI / 2, Math.PI),
    matBlockCastIron
  );
  blockLatheMesh.receiveShadow = true;
  cylinderGroup.add(blockLatheMesh, createSectionCaps(blockProfile, matSectionBlock));

  const linerHeight = yTopBlock - yBotLiner;
  const honedInnerMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      rInner - 0.0002,
      rInner - 0.0002,
      linerHeight,
      64,
      1,
      true,
      Math.PI / 2,
      Math.PI
    ),
    matHonedLiner
  );
  honedInnerMesh.position.y = (yBotLiner + yTopBlock) / 2;
  cylinderGroup.add(honedInnerMesh);

  const crankcaseProfile = [
    new THREE.Vector2(0.056, 0.064),
    new THREE.Vector2(0.062, 0.064),
    new THREE.Vector2(0.068, 0.032),
    new THREE.Vector2(0.068, -0.048),
    new THREE.Vector2(0.074, -0.048),
    new THREE.Vector2(0.074, -0.058),
    new THREE.Vector2(0.024, -0.058),
    new THREE.Vector2(0.024, -0.051),
    new THREE.Vector2(0.061, -0.051),
    new THREE.Vector2(0.061, 0.03),
    new THREE.Vector2(0.056, 0.06),
    new THREE.Vector2(0.056, 0.064)
  ];
  cylinderGroup.add(
    new THREE.Mesh(
      new THREE.LatheGeometry(crankcaseProfile, 64, Math.PI / 2, Math.PI),
      matBlockCastIron
    ),
    createSectionCaps(crankcaseProfile, matSectionBlock)
  );
  scene.add(cylinderGroup);

  // 2. Pared de la cámara de combustión escalable con hc (entre PMS y y_culata)
  const chamberSleeveGroup = new THREE.Group();
  chamberSleeveGroup.position.y = yTopBlock;
  const unitSleeveProfile = [
    new THREE.Vector2(rInner, 0),
    new THREE.Vector2(rInner, 1),
    new THREE.Vector2(rWall + 0.004, 1),
    new THREE.Vector2(rWall + 0.004, 0),
    new THREE.Vector2(rInner, 0)
  ];
  chamberSleeveGroup.add(
    new THREE.Mesh(
      new THREE.LatheGeometry(unitSleeveProfile, 64, Math.PI / 2, Math.PI),
      matHonedLiner
    ),
    createSectionCaps(unitSleeveProfile, matSectionBlock)
  );
  scene.add(chamberSleeveGroup);

  const glassMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      rInner + 0.0004,
      rInner + 0.0004,
      1,
      64,
      1,
      true,
      -Math.PI / 2,
      Math.PI
    ),
    matCylinderGlass
  );
  glassMesh.renderOrder = 30;
  scene.add(glassMesh);

  const pmsRingMesh = new THREE.Mesh(
    new THREE.TorusGeometry(rInner + 0.0006, 0.00045, 12, 64).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.45 })
  );
  pmsRingMesh.position.y = yTopBlock;
  scene.add(pmsRingMesh);

  // 3. Volumen de gas y 90 moléculas 3D coloreadas por T(theta)
  const gasGroup = new THREE.Group();
  const gasRadius = rInner * 0.992;
  const matGasBody = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.22,
    depthWrite: false
  });
  const matGasHighlight = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.68,
    depthWrite: false
  });
  const gasCylMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(gasRadius, gasRadius, 1, 56),
    matGasBody
  );
  gasCylMesh.position.y = 0.5;
  gasCylMesh.renderOrder = 5;
  gasGroup.add(gasCylMesh);

  const gasCapRingGeo = new THREE.RingGeometry(gasRadius * 0.72, gasRadius, 48).rotateX(
    Math.PI / 2
  );
  const topGasRing = new THREE.Mesh(gasCapRingGeo, matGasHighlight);
  topGasRing.position.y = 0.995;
  const botGasRing = new THREE.Mesh(gasCapRingGeo, matGasHighlight);
  botGasRing.position.y = 0.005;
  gasGroup.add(topGasRing, botGasRing);
  scene.add(gasGroup);

  const cylParticleCount = 90;
  const cylParticleSeeds = [];
  for (let i = 0; i < cylParticleCount; i++) {
    cylParticleSeeds.push({
      rNorm: Math.sqrt((i + 0.5) / cylParticleCount) * 0.88,
      angle0: i * 2.39996,
      vNorm: (i * 0.618034) % 1,
      speed: 0.85 + (i % 5) * 0.18
    });
  }

  const cylInstancedParticles = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.0022, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.94 }),
    cylParticleCount
  );
  cylInstancedParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cylInstancedParticles.renderOrder = 18;

  const dummy = new THREE.Object3D();
  const initColor = new THREE.Color(0x38bdf8);
  for (let i = 0; i < cylParticleCount; i++) {
    dummy.position.set(0, 0.18, 0);
    dummy.updateMatrix();
    cylInstancedParticles.setMatrixAt(i, dummy.matrix);
    cylInstancedParticles.setColorAt(i, initColor);
  }
  scene.add(cylInstancedParticles);

  // Frente de llama 3D
  const flameGroup = new THREE.Group();
  flameGroup.renderOrder = 22;
  const matFlameCore = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const matFlameOuter = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const matFlameShockRing = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const flameShockRing = new THREE.Mesh(
    new THREE.RingGeometry(0.012, 0.022, 40).rotateX(Math.PI / 2),
    matFlameShockRing
  );
  flameShockRing.position.y = -0.004;
  flameGroup.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 32, 20, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65),
      matFlameCore
    ),
    new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 32, 20, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.75),
      matFlameOuter
    ),
    flameShockRing
  );
  scene.add(flameGroup);

  // 4. Culata móvil según rc + conductos + flujo 3D + válvulas + bujía
  const headGroup = new THREE.Group();
  const headHeight = 0.038;

  const gasketProfile = [
    new THREE.Vector2(rInner, 0),
    new THREE.Vector2(rInner, 0.0018),
    new THREE.Vector2(rWall + 0.006, 0.0018),
    new THREE.Vector2(rWall + 0.006, 0),
    new THREE.Vector2(rInner, 0)
  ];
  headGroup.add(
    new THREE.Mesh(
      new THREE.LatheGeometry(gasketProfile, 64, Math.PI / 2, Math.PI),
      matCopperGasket
    ),
    createSectionCaps(gasketProfile, matCopperGasket)
  );

  const headOuterProfile = [
    new THREE.Vector2(rInner * 0.35, 0.0018),
    new THREE.Vector2(rInner, 0.0018),
    new THREE.Vector2(rFin + 0.002, 0.0018),
    new THREE.Vector2(rFin + 0.002, 0.006),
    new THREE.Vector2(rWall + 0.002, 0.006)
  ];
  for (let i = 0; i < 4; i++) {
    const yf = 0.01 + i * 0.0075;
    headOuterProfile.push(
      new THREE.Vector2(rWall + 0.002, yf - 0.0015),
      new THREE.Vector2(rFin + 0.002, yf - 0.001),
      new THREE.Vector2(rFin + 0.002, yf + 0.001),
      new THREE.Vector2(rWall + 0.002, yf + 0.0015)
    );
  }
  headOuterProfile.push(
    new THREE.Vector2(rWall + 0.002, headHeight),
    new THREE.Vector2(0.011, headHeight),
    new THREE.Vector2(0.011, 0.0018),
    new THREE.Vector2(rInner * 0.35, 0.0018)
  );
  headGroup.add(
    new THREE.Mesh(
      new THREE.LatheGeometry(headOuterProfile, 64, Math.PI / 2, Math.PI),
      matHeadAluminum
    ),
    createSectionCaps(headOuterProfile, matSectionHead)
  );

  const intakeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.074, 0.025, 0.004),
    new THREE.Vector3(-0.046, 0.023, 0.004),
    new THREE.Vector3(-0.023, 0.015, 0.004),
    new THREE.Vector3(-0.017, 0.002, 0.004)
  ]);
  const exhaustCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.017, 0.002, 0.004),
    new THREE.Vector3(0.023, 0.015, 0.004),
    new THREE.Vector3(0.046, 0.023, 0.004),
    new THREE.Vector3(0.074, 0.025, 0.004)
  ]);

  const matPortCavityIntake = new THREE.MeshStandardMaterial({
    color: 0x062038,
    emissive: 0x0284c7,
    emissiveIntensity: 0.25,
    roughness: 0.45
  });
  const matPortCavityExhaust = new THREE.MeshStandardMaterial({
    color: 0x241006,
    emissive: 0xc2410c,
    emissiveIntensity: 0.2,
    roughness: 0.5
  });

  const intakeDuctGeo = new THREE.TubeGeometry(intakeCurve, 32, 0.0072, 16, false);
  intakeDuctGeo.scale(1, 1, 0.28);
  headGroup.add(new THREE.Mesh(intakeDuctGeo, matPortCavityIntake));

  const intakeBellMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0105, 0.0075, 0.009, 24).rotateZ(Math.PI / 2),
    matPolishedSteel
  );
  intakeBellMesh.position.set(-0.074, 0.025, 0.004);
  headGroup.add(intakeBellMesh);

  const exhaustDuctGeo = new THREE.TubeGeometry(exhaustCurve, 32, 0.0072, 16, false);
  exhaustDuctGeo.scale(1, 1, 0.28);
  headGroup.add(new THREE.Mesh(exhaustDuctGeo, matPortCavityExhaust));

  const exhaustBellMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0075, 0.0105, 0.009, 24).rotateZ(Math.PI / 2),
    matCopperGasket
  );
  exhaustBellMesh.position.set(0.074, 0.025, 0.004);
  headGroup.add(exhaustBellMesh);

  // Flujo 3D de entrada y salida
  const intakeFlowCount = 48;
  const intakeFlowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.95
  });
  const intakeInstancedFlow = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.0024, 10, 10),
    intakeFlowMat,
    intakeFlowCount
  );
  intakeInstancedFlow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  intakeInstancedFlow.renderOrder = 20;
  for (let i = 0; i < intakeFlowCount; i++) {
    intakeInstancedFlow.setMatrixAt(i, dummy.matrix);
    intakeInstancedFlow.setColorAt(
      i,
      i % 2 === 0 ? new THREE.Color(0x38bdf8) : new THREE.Color(0xbae6fd)
    );
  }
  headGroup.add(intakeInstancedFlow);

  const exhaustFlowCount = 52;
  const exhaustFlowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9
  });
  const exhaustInstancedFlow = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.0028, 10, 10),
    exhaustFlowMat,
    exhaustFlowCount
  );
  exhaustInstancedFlow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  exhaustInstancedFlow.renderOrder = 20;
  for (let i = 0; i < exhaustFlowCount; i++) {
    exhaustInstancedFlow.setMatrixAt(i, dummy.matrix);
    exhaustInstancedFlow.setColorAt(i, new THREE.Color(0xf97316));
  }
  headGroup.add(exhaustInstancedFlow);

  // Válvulas y árboles de levas a media velocidad (theta / 2)
  const camBaseR = 0.0065;
  const camMaxR = 0.012;
  const camShape = new THREE.Shape();
  camShape.absarc(0, 0, camBaseR, 0, Math.PI, false);
  camShape.quadraticCurveTo(-camBaseR * 0.85, -camMaxR * 0.9, 0, -camMaxR);
  camShape.quadraticCurveTo(camBaseR * 0.85, -camMaxR * 0.9, camBaseR, 0);
  camShape.closePath();
  const camGeo = new THREE.ExtrudeGeometry(camShape, {
    depth: 0.008,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.0006,
    bevelThickness: 0.0006
  });
  camGeo.center();

  function createAnimatedValveAssembly(xPos) {
    const root = new THREE.Group();
    root.position.set(xPos, 0, 0);

    const seatRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.0092, 0.0011, 12, 32).rotateX(Math.PI / 2),
      matCopperGasket
    );
    seatRing.position.y = 0.0018;
    const guideMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0038, 0.0038, 0.019, 20),
      matCopperGasket
    );
    guideMesh.position.y = 0.0135;
    root.add(seatRing, guideMesh);

    const springBottomY = 0.019;
    const springFreeTopY = 0.035;
    const coils = [];
    for (let i = 0; i < 6; i++) {
      const coil = new THREE.Mesh(
        new THREE.TorusGeometry(0.0056, 0.00085, 10, 24).rotateX(Math.PI / 2),
        matCrankWeb
      );
      coil.position.y = springBottomY + ((i + 0.5) / 6) * (springFreeTopY - springBottomY);
      root.add(coil);
      coils.push(coil);
    }

    const movingValveGroup = new THREE.Group();
    const headDisk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0022, 0.0095, 0.0032, 32),
      matPolishedSteel
    );
    headDisk.position.y = 0.0016;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.002, 0.002, 0.036, 20),
      matPolishedSteel
    );
    stem.position.y = 0.019;
    const retainer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0068, 0.005, 0.0028, 24),
      matPolishedSteel
    );
    retainer.position.y = 0.0365;
    movingValveGroup.add(headDisk, stem, retainer);
    root.add(movingValveGroup);

    const camGroup = new THREE.Group();
    camGroup.position.set(0, 0.05, 0);
    const camIndexMark = new THREE.Mesh(
      new THREE.BoxGeometry(0.0012, 0.009, 0.0095),
      matCopperGasket
    );
    camIndexMark.position.y = -0.0055;
    camGroup.add(
      new THREE.Mesh(camGeo, matPolishedSteel),
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.022, 24).rotateX(Math.PI / 2),
        matCrankWeb
      ),
      camIndexMark
    );
    root.add(camGroup);

    function setLiftAndCam(liftMeters, camRotationRad) {
      movingValveGroup.position.y = -liftMeters;
      camGroup.rotation.z = camRotationRad;
      const currentTopY = springFreeTopY - liftMeters;
      for (let i = 0; i < 6; i++) {
        coils[i].position.y =
          springBottomY + ((i + 0.5) / 6) * (currentTopY - springBottomY);
      }
    }
    return { root, setLiftAndCam };
  }

  const intakeValveObj = createAnimatedValveAssembly(-0.017);
  const exhaustValveObj = createAnimatedValveAssembly(0.017);
  headGroup.add(intakeValveObj.root, exhaustValveObj.root);

  // Bujía y arco eléctrico 3D
  const sparkPlugGroup = new THREE.Group();
  const matCeramic = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.05,
    roughness: 0.15,
    clearcoat: 0.8
  });
  const plugThread = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.016, 24),
    matCrankWeb
  );
  plugThread.position.y = 0.009;
  const plugHex = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0075, 0.0075, 0.009, 6),
    matPolishedSteel
  );
  plugHex.position.y = headHeight + 0.003;
  const insulatorBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0046, 0.0046, 0.022, 24),
    matCeramic
  );
  insulatorBody.position.y = headHeight + 0.017;
  const terminalTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0018, 0.0018, 0.005, 16),
    matCopperGasket
  );
  terminalTop.position.y = headHeight + 0.03;
  const centerElectrode = new THREE.Mesh(
    new THREE.CylinderGeometry(0.001, 0.001, 0.0045, 16),
    matPolishedSteel
  );
  centerElectrode.position.y = -0.0008;
  const groundElectrode = new THREE.Mesh(
    new THREE.BoxGeometry(0.0044, 0.001, 0.0014),
    matPolishedSteel
  );
  groundElectrode.position.set(0.0016, -0.0042, 0);
  const groundLeg = new THREE.Mesh(
    new THREE.BoxGeometry(0.001, 0.005, 0.0014),
    matPolishedSteel
  );
  groundLeg.position.set(0.0034, -0.0018, 0);
  sparkPlugGroup.add(
    plugThread,
    plugHex,
    insulatorBody,
    terminalTop,
    centerElectrode,
    groundElectrode,
    groundLeg
  );

  const sparkArcGroup = new THREE.Group();
  sparkArcGroup.renderOrder = 25;
  const matSparkBolt = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0,
    depthTest: false
  });
  const boltMeshes = [];
  for (let i = 0; i < 6; i++) {
    const boltSeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.00085, 0.00085, 0.0035, 8),
      matSparkBolt
    );
    boltSeg.position.set(0.0005, -0.0025, 0.006);
    sparkArcGroup.add(boltSeg);
    boltMeshes.push(boltSeg);
  }
  const sparkCoreMat = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthTest: false
  });
  const sparkSprite = new THREE.Sprite(sparkCoreMat);
  sparkSprite.position.set(0.0005, -0.003, 0.007);
  sparkSprite.scale.set(0.028, 0.028, 1);
  sparkArcGroup.add(sparkSprite);
  sparkPlugGroup.add(sparkArcGroup);
  headGroup.add(sparkPlugGroup);
  scene.add(headGroup);

  // 5. Pistón
  const pistonGroup = new THREE.Group();
  const skirtDepth = 0.022;
  const rPiston = rInner * 0.988;
  const rLand = rInner * 0.955;
  const pistonProfile = [
    new THREE.Vector2(0, hp),
    new THREE.Vector2(rPiston - 0.001, hp),
    new THREE.Vector2(rPiston, hp - 0.001),
    new THREE.Vector2(rPiston, hp - 0.0035),
    new THREE.Vector2(rLand, hp - 0.0035),
    new THREE.Vector2(rLand, hp - 0.0053),
    new THREE.Vector2(rPiston, hp - 0.0053),
    new THREE.Vector2(rPiston, hp - 0.0078),
    new THREE.Vector2(rLand, hp - 0.0078),
    new THREE.Vector2(rLand, hp - 0.0096),
    new THREE.Vector2(rPiston, hp - 0.0096),
    new THREE.Vector2(rPiston, hp - 0.0121),
    new THREE.Vector2(rLand, hp - 0.0121),
    new THREE.Vector2(rLand, hp - 0.0145),
    new THREE.Vector2(rPiston, hp - 0.0145),
    new THREE.Vector2(rPiston, -skirtDepth),
    new THREE.Vector2(rPiston - 0.0035, -skirtDepth),
    new THREE.Vector2(rPiston - 0.005, hp - 0.016),
    new THREE.Vector2(0, hp - 0.016)
  ];
  const pistonMesh = new THREE.Mesh(new THREE.LatheGeometry(pistonProfile, 64), matPiston);
  pistonMesh.castShadow = true;
  pistonGroup.add(pistonMesh);

  for (const spec of [
    { y: hp - 0.0044, h: 0.0016, mat: matPolishedSteel },
    { y: hp - 0.0087, h: 0.0016, mat: matPistonRingDark },
    { y: hp - 0.0133, h: 0.0022, mat: matCopperGasket }
  ]) {
    const ringMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(rInner * 0.996, rInner * 0.996, spec.h, 64),
      spec.mat
    );
    ringMesh.position.y = spec.y;
    pistonGroup.add(ringMesh);
  }
  const padGeo = new THREE.CylinderGeometry(
    rPiston + 0.0002,
    rPiston + 0.0002,
    0.024,
    32,
    1,
    true,
    -0.45,
    0.9
  );
  const padRight = new THREE.Mesh(padGeo, matPistonSkirtPad);
  padRight.rotation.y = Math.PI / 2;
  padRight.position.y = -0.003;
  const padLeft = padRight.clone();
  padLeft.rotation.y = -Math.PI / 2;
  pistonGroup.add(
    padRight,
    padLeft,
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.0085, 0.0085, B * 0.8, 36).rotateX(Math.PI / 2),
      matPolishedSteel
    ),
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, B * 0.81, 24).rotateX(Math.PI / 2),
      matPistonRingDark
    )
  );
  scene.add(pistonGroup);

  // 6. Biela
  const rodGroup = new THREE.Group();
  const rodShape = new THREE.Shape();
  const yTopStem = -0.011;
  const yBotStem = -lb + 0.015;
  rodShape.moveTo(-0.0075, yTopStem);
  rodShape.lineTo(0.0075, yTopStem);
  rodShape.lineTo(0.0115, yBotStem);
  rodShape.lineTo(-0.0115, yBotStem);
  rodShape.closePath();
  const rodBeamGeo = new THREE.ExtrudeGeometry(rodShape, {
    depth: 0.011,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.0014,
    bevelThickness: 0.0014
  });
  rodBeamGeo.center();
  const rodBeamMesh = new THREE.Mesh(rodBeamGeo, matForgedRod);
  rodBeamMesh.position.y = (yTopStem + yBotStem) / 2;
  rodGroup.add(rodBeamMesh);

  const pocketShape = new THREE.Shape();
  pocketShape.moveTo(-0.0038, yTopStem - 0.008);
  pocketShape.lineTo(0.0038, yTopStem - 0.008);
  pocketShape.lineTo(0.0068, yBotStem + 0.008);
  pocketShape.lineTo(-0.0068, yBotStem + 0.008);
  pocketShape.closePath();
  const pocketGeo = new THREE.ExtrudeGeometry(pocketShape, {
    depth: 0.0145,
    bevelEnabled: false
  });
  pocketGeo.center();
  const pocketMesh = new THREE.Mesh(pocketGeo, matRodPocket);
  pocketMesh.position.y = (yTopStem + yBotStem) / 2;
  rodGroup.add(
    pocketMesh,
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 0.018, 36).rotateX(Math.PI / 2),
      matForgedRod
    ),
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.0098, 0.0098, 0.019, 36).rotateX(Math.PI / 2),
      matCopperGasket
    )
  );

  const bigEndMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0185, 0.0185, 0.02, 40).rotateX(Math.PI / 2),
    matForgedRod
  );
  bigEndMesh.position.y = -lb;
  const bigBushingMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0132, 0.0132, 0.021, 36).rotateX(Math.PI / 2),
    matCopperGasket
  );
  bigBushingMesh.position.y = -lb;
  const capFlangeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.046, 0.012, 0.016),
    matForgedRod
  );
  capFlangeMesh.position.y = -lb;
  rodGroup.add(bigEndMesh, bigBushingMesh, capFlangeMesh);
  scene.add(rodGroup);

  // 7. Cigüeñal
  const crankGroup = new THREE.Group();
  const webShape = new THREE.Shape();
  webShape.absarc(0, a, 0.017, 0, Math.PI, false);
  webShape.lineTo(-0.036, -0.006);
  webShape.absarc(0, -0.01, 0.0365, Math.PI, Math.PI * 2, false);
  webShape.lineTo(0.017, a);
  webShape.closePath();
  const webGeo = new THREE.ExtrudeGeometry(webShape, {
    depth: 0.009,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.0012,
    bevelThickness: 0.0012
  });
  webGeo.center();

  for (const zWeb of [-0.0165, 0.0165]) {
    const webUnit = new THREE.Group();
    webUnit.position.z = zWeb;
    const webMesh = new THREE.Mesh(webGeo, matCrankWeb);
    webMesh.position.y = 0.005;
    const pinBoss = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0145, 0.0145, 0.012, 32).rotateX(Math.PI / 2),
      matPolishedSteel
    );
    pinBoss.position.y = a;
    webUnit.add(
      webMesh,
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.0165, 0.0165, 0.012, 32).rotateX(Math.PI / 2),
        matPolishedSteel
      ),
      pinBoss
    );
    crankGroup.add(webUnit);
  }
  const mainJournalMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0135, 0.0135, 0.072, 36).rotateX(Math.PI / 2),
    matPolishedSteel
  );
  mainJournalMesh.position.z = -0.01;
  const crankpinMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0118, 0.0118, 0.046, 36).rotateX(Math.PI / 2),
    matPolishedSteel
  );
  crankpinMesh.position.set(0, a, 0);
  crankGroup.add(mainJournalMesh, crankpinMesh);
  scene.add(crankGroup);

  // 8. Regla en metros y marcas de referencia del recorrido de la culata (rc = 4 a rc = 14)
  const scaleGroup = new THREE.Group();
  const ruleLineMaterial = new THREE.LineBasicMaterial({ color: 0x64748b });
  scaleGroup.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.078, 0, 0),
        new THREE.Vector3(-0.078, 0.23, 0)
      ]),
      ruleLineMaterial
    )
  );
  for (let yTick = 0; yTick <= 0.201; yTick += 0.05) {
    scaleGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.082, yTick, 0),
          new THREE.Vector3(-0.074, yTick, 0)
        ]),
        ruleLineMaterial
      )
    );
  }
  scene.add(scaleGroup);

  // 9. Trazador senoidal conectado a la corona del pistón
  const waveGroup = new THREE.Group();
  const waveXStart = 0.072;
  const waveWidth = 0.16;
  const waveXEnd = waveXStart + waveWidth;
  const maxSampleCount = 241;
  const boardCenterY = (yPmsCrown + yPmiCrown) / 2;

  const boardMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(waveWidth + 0.012, L + 0.024),
    new THREE.MeshBasicMaterial({
      color: 0x090d16,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  boardMesh.position.set(waveXStart + waveWidth / 2, boardCenterY, -0.002);
  waveGroup.add(boardMesh);

  const guidePoints = [];
  for (const yGuide of [yPmsCrown, boardCenterY, yPmiCrown]) {
    guidePoints.push(
      new THREE.Vector3(waveXStart, yGuide, -0.001),
      new THREE.Vector3(waveXEnd, yGuide, -0.001)
    );
  }
  for (let i = 0; i <= 4; i++) {
    const xDiv = waveXStart + (i / 4) * waveWidth;
    guidePoints.push(
      new THREE.Vector3(xDiv, yPmiCrown - 0.006, -0.001),
      new THREE.Vector3(xDiv, yPmsCrown + 0.006, -0.001)
    );
  }
  waveGroup.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(guidePoints),
      new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.45 })
    )
  );

  const pointerGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(rPiston, yPmsCrown, 0.002),
    new THREE.Vector3(waveXStart, yPmsCrown, 0.002)
  ]);
  const pointerMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.9
  });
  waveGroup.add(new THREE.Line(pointerGeo, pointerMat));

  const penTipMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const penTipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 16, 16), penTipMat);
  penTipMesh.position.set(waveXStart, yPmsCrown, 0.003);
  waveGroup.add(penTipMesh);

  const masGeo = new THREE.BufferGeometry();
  masGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(maxSampleCount * 3), 3)
  );
  masGeo.setDrawRange(0, 0);
  waveGroup.add(
    new THREE.Line(
      masGeo,
      new THREE.LineBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.38 })
    )
  );

  const realGeo = new THREE.BufferGeometry();
  realGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(maxSampleCount * 3), 3)
  );
  realGeo.setAttribute(
    'color',
    new THREE.BufferAttribute(new Float32Array(maxSampleCount * 3), 3)
  );
  realGeo.setDrawRange(0, 0);
  waveGroup.add(new THREE.Line(realGeo, new THREE.LineBasicMaterial({ vertexColors: true })));
  scene.add(waveGroup);

  let tracedSpanDeg = 0;
  let prevCycleAngle = null;
  const tempColor = new THREE.Color();
  const gasThermalColor = new THREE.Color();
  const cBurn = new THREE.Color(0xef4444);
  const cSmoke = new THREE.Color(0x94a3b8);
  const curvePt = new THREE.Vector3();

  // =========================================================================
  // ACTUALIZACIÓN ACOPLADA CON EL ESTADO TERMODINÁMICO (Hito 3)
  // =========================================================================
  function update(geoState) {
    const t = toRadiansMod360(geoState.theta);
    const curAngle = normalizeCycleAngle(geoState.theta);
    const phase = getCyclePhase(geoState.theta);
    const { valves } = geoState;
    const thermo = geoState.thermo;

    // Temperatura real T(theta) y calor Qin (con fallback seguro si solo se pasa geometría)
    const currentT = thermo ? thermo.T : 300;
    const currentQin = thermo ? thermo.Qin : 700;
    const qinScale = 0.65 + ((currentQin - 200) / 600) * 0.7;

    // Color del gas determinado directamente por T(theta) según la escala 300 K – 3200 K
    temperatureToColor(currentT, gasThermalColor);

    // 1. Tren alternativo y culata móvil según rc
    crankGroup.rotation.z = -t;
    pistonGroup.position.set(0, geoState.y, 0);
    rodGroup.position.set(0, geoState.y, 0);
    rodGroup.rotation.z = geoState.phi;

    headGroup.position.set(0, geoState.y_culata, 0);
    chamberSleeveGroup.scale.set(1, Math.max(0.0001, geoState.hc), 1);

    // 2. Válvulas y árboles de levas a media velocidad (theta / 2)
    const intakeCamRot = -(valves.camAngleRad - Math.PI * 0.25);
    const exhaustCamRot = -(valves.camAngleRad - Math.PI * 1.75);
    intakeValveObj.setLiftAndCam(valves.intakeLift, intakeCamRot);
    exhaustValveObj.setLiftAndCam(valves.exhaustLift, exhaustCamRot);

    matPortCavityIntake.emissiveIntensity = 0.2 + 1.3 * valves.intakeLiftRatio;
    matPortCavityExhaust.emissiveIntensity = 0.15 + 1.3 * valves.exhaustLiftRatio;

    // 3. Envolvente de cristal y volumen de gas coloreado por T(theta)
    const totalGlassHeight = geoState.y_culata - yBotLiner;
    glassMesh.scale.set(1, totalGlassHeight, 1);
    glassMesh.position.set(0, yBotLiner + totalGlassHeight / 2, 0);

    const gasHeight = Math.max(0.0002, geoState.y_culata - geoState.y_corona);
    gasGroup.position.set(0, geoState.y_corona, 0);
    gasGroup.scale.set(1, gasHeight, 1);

    matGasBody.color.copy(gasThermalColor);
    matGasHighlight.color.copy(gasThermalColor);
    chamberLight.color.copy(gasThermalColor);

    // 4. Flujo 3D de entrada en Admisión (0° a 180°)
    if (valves.intakeOpen) {
      intakeInstancedFlow.visible = true;
      intakeFlowMat.opacity = Math.min(1, 0.35 + valves.intakeLiftRatio * 0.9);
      const progress = curAngle / 180;

      for (let i = 0; i < intakeFlowCount; i++) {
        const u = ((i / intakeFlowCount) + progress * 3.2) % 1;
        const spread = ((i % 5) - 2) * 0.0014;

        if (u < 0.18) {
          const extU = u / 0.18;
          dummy.position.set(-0.098 + extU * 0.024, 0.025 + spread * 1.4, 0.009);
          dummy.scale.set(1.2, 0.85, 1);
        } else if (u < 0.65) {
          intakeCurve.getPoint((u - 0.18) / 0.47, curvePt);
          dummy.position.set(curvePt.x, curvePt.y + spread, 0.009);
          dummy.scale.set(1.15, 0.9, 1);
        } else {
          const cylU = (u - 0.65) / 0.35;
          const swirlX = -0.017 + cylU * 0.03 * Math.sin(cylU * Math.PI * 1.3 + i * 0.6);
          const dropY = -valves.intakeLift - cylU * (gasHeight * 0.88);
          dummy.position.set(swirlX + spread, dropY, 0.009);
          dummy.scale.set(1.0, 1.15, 1);
        }
        dummy.updateMatrix();
        intakeInstancedFlow.setMatrixAt(i, dummy.matrix);
      }
      intakeInstancedFlow.instanceMatrix.needsUpdate = true;
    } else {
      intakeInstancedFlow.visible = false;
    }

    // 5. Chispa eléctrica en 360° y frente de llama escalado con Qin
    const distFrom360 = Math.abs(curAngle - 360);
    if (curAngle >= 352 && curAngle <= 398) {
      const sparkIntensity = Math.max(0, 1 - distFrom360 / 24) * qinScale;
      matSparkBolt.opacity = Math.min(1, sparkIntensity);
      sparkCoreMat.opacity = Math.min(1, sparkIntensity);
      sparkFlashLight.intensity = sparkIntensity * 6.5;
      sparkFlashLight.position.set(0, geoState.y_culata - 0.003, 0.012);

      for (let i = 0; i < boltMeshes.length; i++) {
        const mesh = boltMeshes[i];
        const angleJitter = Math.sin(curAngle * 23 + i * 2.1) * 0.65;
        const xJit = Math.cos(curAngle * 17 + i * 3.4) * 0.0018;
        mesh.position.set(0.0008 + xJit, -0.0022 - (i % 3) * 0.0012, 0.008);
        mesh.rotation.z = 0.4 + angleJitter;
        mesh.scale.set(1, (0.8 + (i % 2) * 0.6) * qinScale, 1);
      }
    } else {
      matSparkBolt.opacity = 0;
      sparkCoreMat.opacity = 0;
      sparkFlashLight.intensity = 0;
    }

    if (curAngle >= 358 && curAngle <= 445) {
      flameGroup.visible = true;
      const flameProg = (curAngle - 358) / (445 - 358);
      const fade = Math.sin(flameProg * Math.PI);
      flameGroup.position.set(0, geoState.y_culata - 0.002, 0.006);
      const scaleXZ = (0.25 + flameProg * 1.55) * qinScale;
      const scaleY = 0.22 + flameProg * (gasHeight / 0.02);
      flameGroup.scale.set(scaleXZ, scaleY, scaleXZ);
      matFlameCore.opacity = Math.min(1, fade * 0.95 * qinScale);
      matFlameOuter.opacity = Math.min(1, fade * 0.78 * qinScale);
      matFlameShockRing.opacity = Math.min(1, fade * 0.85 * qinScale);
    } else {
      flameGroup.visible = false;
    }

    // 6. Moléculas 3D dentro del cilindro coloreadas por T(theta)
    const tNorm = Math.max(0, Math.min(1, (currentT - 300) / (3200 - 300)));
    const pScale = 1.0 + tNorm * 0.45;
    const isExplosionStroke = curAngle >= 360 && curAngle < 540;
    const exhaustBlendOut = curAngle >= 525 ? Math.max(0, (540 - curAngle) / 15) : 1;
    const combustDispersion = isExplosionStroke
      ? (0.55 + 0.45 * tNorm) * exhaustBlendOut
      : 0;

    for (let i = 0; i < cylParticleCount; i++) {
      const seed = cylParticleSeeds[i];
      const swirlAngle = seed.angle0 + (curAngle * Math.PI * seed.speed) / 180;
      let rx = Math.cos(swirlAngle) * seed.rNorm * (rInner * 0.86);
      const rz = Math.sin(swirlAngle) * 0.008;
      let vFrac = (seed.vNorm + Math.sin(swirlAngle * 0.7) * 0.12 + 1) % 1;

      // En la explosión las partículas salen disparadas sin dirección única y chocan contra las paredes
      if (combustDispersion > 0) {
        const dirAngle = seed.angle0 * 3.7 + i * 0.41;
        const bouncePhase = (curAngle - 360) * 0.14 * seed.speed + seed.vNorm * Math.PI * 2;
        const scatterSpan = Math.sin(bouncePhase);
        const scatterX = Math.cos(dirAngle) * scatterSpan * (rInner * 0.95);
        const scatterV =
          (((seed.vNorm + 0.5 + 0.46 * Math.sin(bouncePhase + seed.angle0) * Math.sin(dirAngle)) %
            1) +
            1) %
          1;
        rx = rx * (1 - combustDispersion) + scatterX * combustDispersion;
        vFrac = vFrac * (1 - combustDispersion) + scatterV * combustDispersion;
      }

      if (curAngle >= 540) {
        const exhProg = (curAngle - 540) / 180;
        rx = rx * (1 - exhProg * 0.5) + 0.015 * exhProg;
        vFrac = Math.min(0.95, vFrac + exhProg * 0.3);
      }

      const py = geoState.y_corona + (0.07 + 0.86 * vFrac) * gasHeight;
      dummy.position.set(rx, py, rz + 0.005);
      dummy.scale.set(pScale, pScale, pScale);
      dummy.updateMatrix();
      cylInstancedParticles.setMatrixAt(i, dummy.matrix);

      // En el escape las partículas se mezclan con gris ceniza al ser barridas a p1, T1
      if (curAngle >= 540) {
        const exhFrac = (curAngle - 540) / 180;
        tempColor.copy(gasThermalColor).lerp(cSmoke, Math.min(0.75, exhFrac));
        cylInstancedParticles.setColorAt(i, tempColor);
      } else {
        cylInstancedParticles.setColorAt(i, gasThermalColor);
      }
    }
    cylInstancedParticles.instanceMatrix.needsUpdate = true;
    cylInstancedParticles.instanceColor.needsUpdate = true;

    // 7. Flujo 3D de salida en Escape (540° a 720°)
    if (valves.exhaustOpen) {
      exhaustInstancedFlow.visible = true;
      const exhProgress = (curAngle - 540) / 180;
      exhaustFlowMat.opacity = Math.min(0.95, 0.35 + valves.exhaustLiftRatio * 0.85);

      for (let i = 0; i < exhaustFlowCount; i++) {
        const u = ((i / exhaustFlowCount) + exhProgress * 3.2) % 1;
        const spread = ((i % 5) - 2) * 0.0015;

        if (u < 0.22) {
          const throatU = u / 0.22;
          dummy.position.set(
            0.017 + spread * 1.4,
            -valves.exhaustLift * (1 - throatU),
            0.009
          );
          dummy.scale.set(1.0, 1.0, 1.0);
        } else if (u < 0.72) {
          const ductU = (u - 0.22) / 0.5;
          exhaustCurve.getPoint(ductU, curvePt);
          dummy.position.set(curvePt.x, curvePt.y + spread, 0.009);
          const sDuct = 1.0 + ductU * 0.4;
          dummy.scale.set(sDuct, sDuct, 1.0);
        } else {
          const plumeU = (u - 0.72) / 0.28;
          const px = 0.074 + plumeU * 0.036;
          const py = 0.025 + plumeU * 0.012 + spread * (1 + plumeU * 3.2);
          dummy.position.set(px, py, 0.009);
          const puffScale = 1.4 + plumeU * 1.5;
          dummy.scale.set(puffScale, puffScale, 1.0);
        }

        dummy.updateMatrix();
        exhaustInstancedFlow.setMatrixAt(i, dummy.matrix);
        tempColor.copy(cBurn).lerp(cSmoke, Math.min(1, u * 1.15));
        exhaustInstancedFlow.setColorAt(i, tempColor);
      }
      exhaustInstancedFlow.instanceMatrix.needsUpdate = true;
      exhaustInstancedFlow.instanceColor.needsUpdate = true;
    } else {
      exhaustInstancedFlow.visible = false;
    }

    // 8. Actualizar trazo senoidal del pistón
    if (prevCycleAngle !== null) {
      let delta = curAngle - prevCycleAngle;
      if (delta < -360) delta += 720;
      if (delta > 360) delta -= 720;
      tracedSpanDeg = Math.min(720, Math.max(0, tracedSpanDeg + Math.abs(delta)));
    }
    prevCycleAngle = curAngle;

    const ptrAttr = pointerGeo.getAttribute('position');
    ptrAttr.setXYZ(0, rPiston, geoState.y_corona, 0.002);
    ptrAttr.setXYZ(1, waveXStart, geoState.y_corona, 0.002);
    ptrAttr.needsUpdate = true;
    pointerMat.color.set(phase.color);

    penTipMesh.position.set(waveXStart, geoState.y_corona, 0.003);
    penTipMat.color.set(phase.color);

    const stepDeg = 3;
    const activePoints = Math.min(maxSampleCount, Math.floor(tracedSpanDeg / stepDeg) + 1);
    const posAttr = realGeo.getAttribute('position');
    const colAttr = realGeo.getAttribute('color');
    const masAttr = masGeo.getAttribute('position');

    for (let i = 0; i < activePoints; i++) {
      const ageDeg = i * stepDeg;
      const sampleTheta = geoState.theta - ageDeg;
      const xPos = waveXStart + (ageDeg / 720) * waveWidth;

      const yCrownSample = yPmsCrown - s(sampleTheta, geoState);
      const yMasSample = yPmsCrown - s_mas(sampleTheta, geoState);
      const samplePhase = getCyclePhase(sampleTheta);
      tempColor.set(samplePhase.color);

      posAttr.setXYZ(i, xPos, yCrownSample, 0.001);
      colAttr.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
      masAttr.setXYZ(i, xPos, yMasSample, 0.0);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    masAttr.needsUpdate = true;
    realGeo.setDrawRange(0, activePoints);
    masGeo.setDrawRange(0, activePoints);

    controls.update();
    renderer.render(scene, camera);
  }

  function resetCamera() {
    camera.position.copy(defaultCamPos);
    camera.up.set(0, 1, 0);
    controls.target.copy(defaultTarget);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
  }

  function handleResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    const newAspect = width / height;
    camera.left = (-frustumHeight * newAspect) / 2;
    camera.right = (frustumHeight * newAspect) / 2;
    camera.top = frustumHeight / 2;
    camera.bottom = -frustumHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  const _projVec = new THREE.Vector3();

  /**
   * Proyecta coordenadas 3D del mundo (metros) a píxeles de pantalla dentro del viewport.
   */
  function projectWorldToScreen(x, y, z = 0, widthOverride, heightOverride) {
    const width = widthOverride ?? container.clientWidth;
    const height = heightOverride ?? container.clientHeight;
    if (!camera || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return { x: 0, y: 0, visible: false };
    }

    _projVec.set(x, y, z).project(camera);
    const px = (_projVec.x * 0.5 + 0.5) * width;
    const py = (-_projVec.y * 0.5 + 0.5) * height;
    const visible =
      Number.isFinite(px) &&
      Number.isFinite(py) &&
      Number.isFinite(_projVec.z) &&
      _projVec.z >= -1 &&
      _projVec.z <= 1;

    return { x: px, y: py, visible };
  }

  window.addEventListener('resize', handleResize);
  const resizeObserver =
    typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => handleResize()) : null;
  if (resizeObserver && container) {
    resizeObserver.observe(container);
  }

  return {
    update,
    resetCamera,
    resize: handleResize,
    projectWorldToScreen,
    camera,
    controls
  };
}