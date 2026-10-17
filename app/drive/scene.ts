import * as THREE from "three";

/**
 * The 3D world for drive mode.
 *
 * This file knows nothing about physics. It is handed three positions every
 * frame and draws them. All the numbers it uses are visual: road width, how
 * far apart the posts are, where the camera sits. None of them feed back into
 * the simulation, which is why they are not in the assumption ledger — they
 * describe a picture, not a car.
 */

const ROAD_HALF_WIDTH = 5;
const ROAD_LENGTH = 4000; // metres of road laid down ahead of the start line
const POST_SPACING_M = 12.5; // roadside posts, the main cue for how fast you are going
const POST_COUNT = 320;
const LANE_DASH_M = 6;

export const CAR_COLORS = {
  expected: 0xd97706, // the car you drive
  ghost: 0x3b82f6, // the two bounds
};

export type CarRig = {
  group: THREE.Group;
  wheels: THREE.Mesh[];
};

/** A deliberately simple car: readable at a glance, cheap to draw. */
function buildCar(color: number, opacity: number): CarRig {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.35,
    roughness: 0.45,
    transparent: opacity < 1,
    opacity,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 4.2), paint);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.5, 2.0), paint);
  cabin.position.set(0, 1.05, -0.15);
  cabin.castShadow = true;
  group.add(cabin);

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f14,
    metalness: 0.1,
    roughness: 0.15,
    transparent: true,
    opacity: Math.min(0.85, opacity),
  });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.34, 1.2), glassMat);
  glass.position.set(0, 1.12, -0.35);
  group.add(glass);

  const tyreMat = new THREE.MeshStandardMaterial({
    color: 0x14181d,
    roughness: 0.9,
    transparent: opacity < 1,
    opacity,
  });
  const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.25, 16);
  const wheels: THREE.Mesh[] = [];
  for (const [x, z] of [
    [-0.85, 1.35],
    [0.85, 1.35],
    [-0.85, -1.35],
    [0.85, -1.35],
  ]) {
    const wheel = new THREE.Mesh(wheelGeo, tyreMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.33, z);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
  }

  return { group, wheels };
}

export type Scene = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  cars: { expected: CarRig; pessimistic: CarRig; optimistic: CarRig };
  /** Move the world to match the simulation, then draw one frame. */
  render: (positions: { expected: number; pessimistic: number; optimistic: number }, speedMps: number, dtS: number) => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
};

export function createScene(canvas: HTMLCanvasElement, width: number, height: number): Scene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  // Capped on purpose: the physics and the engine note share this frame
  // budget, and a retina display would otherwise quadruple the pixel count.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  // A gradient sky rather than a flat colour: without it the top half of the
  // frame reads as a void and the horizon ends in a hard line.
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 2;
  skyCanvas.height = 256;
  const sctx = skyCanvas.getContext("2d");
  if (sctx) {
    const grad = sctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#1b2838");
    grad.addColorStop(0.55, "#2c3b4e");
    grad.addColorStop(0.78, "#44536a");
    grad.addColorStop(1, "#59687f");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 2, 256);
  }
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  // Fog tinted to the horizon colour so the road dissolves into the sky
  // instead of into a black band.
  scene.fog = new THREE.Fog(0x44536a, 80, 420);

  const BASE_FOV = 60;
  const camera = new THREE.PerspectiveCamera(BASE_FOV, width / height, 0.1, 1200);

  // ---- Lighting: one key light casting shadows, plus sky bounce ----
  const hemi = new THREE.HemisphereLight(0x9fb6cc, 0x14181d, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.8);
  sun.position.set(-40, 60, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  const shadowSpan = 40;
  sun.shadow.camera.left = -shadowSpan;
  sun.shadow.camera.right = shadowSpan;
  sun.shadow.camera.top = shadowSpan;
  sun.shadow.camera.bottom = -shadowSpan;
  scene.add(sun);
  scene.add(sun.target);

  // ---- Ground and road ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, ROAD_LENGTH + 400),
    new THREE.MeshStandardMaterial({ color: 0x1d2630, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -ROAD_LENGTH / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, ROAD_LENGTH),
    new THREE.MeshStandardMaterial({ color: 0x23282f, roughness: 0.95 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, -ROAD_LENGTH / 2 + 60);
  road.receiveShadow = true;
  scene.add(road);

  // Lane dashes and edge lines, drawn as instanced boxes so the whole road is
  // one draw call each rather than hundreds.
  const dashGeo = new THREE.BoxGeometry(0.16, 0.02, LANE_DASH_M * 0.5);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0x55606c });
  const dashCount = Math.floor(ROAD_LENGTH / LANE_DASH_M);
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashCount);
  const m = new THREE.Matrix4();
  for (let i = 0; i < dashCount; i++) {
    m.setPosition(0, 0.03, 60 - i * LANE_DASH_M);
    dashes.setMatrixAt(i, m);
  }
  dashes.instanceMatrix.needsUpdate = true;
  scene.add(dashes);

  const edgeGeo = new THREE.BoxGeometry(0.2, 0.02, ROAD_LENGTH);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x3c4450 });
  for (const x of [-ROAD_HALF_WIDTH, ROAD_HALF_WIDTH]) {
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.set(x, 0.03, -ROAD_LENGTH / 2 + 60);
    scene.add(edge);
  }

  // ---- Roadside posts: the thing that actually sells speed ----
  const postGeo = new THREE.BoxGeometry(0.16, 1.1, 0.16);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x6b7482, roughness: 0.8 });
  const posts = new THREE.InstancedMesh(postGeo, postMat, POST_COUNT * 2);
  let n = 0;
  for (let i = 0; i < POST_COUNT; i++) {
    for (const x of [-ROAD_HALF_WIDTH - 1.6, ROAD_HALF_WIDTH + 1.6]) {
      m.setPosition(x, 0.55, 40 - i * POST_SPACING_M);
      posts.setMatrixAt(n++, m);
    }
  }
  posts.instanceMatrix.needsUpdate = true;
  // Deliberately not a shadow caster: 320 instances dominated the shadow pass
  // and the shadows themselves were invisible at speed.
  posts.castShadow = false;
  scene.add(posts);

  // Distance markers: a gate at 60 mph territory and one at the quarter mile,
  // so the road has landmarks rather than being an endless ribbon.
  const gateMat = new THREE.MeshBasicMaterial({ color: 0x55606c });
  for (const z of [-402.336]) {
    const gate = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF_WIDTH * 2, 0.04, 0.5), gateMat);
    gate.position.set(0, 0.04, z);
    scene.add(gate);
  }

  // ---- The three cars ----
  const cars = {
    pessimistic: buildCar(CAR_COLORS.ghost, 0.42),
    optimistic: buildCar(CAR_COLORS.ghost, 0.42),
    expected: buildCar(CAR_COLORS.expected, 1),
  };
  cars.pessimistic.group.position.x = -2.4;
  cars.optimistic.group.position.x = 2.4;
  for (const rig of Object.values(cars)) scene.add(rig.group);

  // ---- Per-frame update ----
  const camTarget = new THREE.Vector3();
  let wheelSpin = 0;

  function render(
    positions: { expected: number; pessimistic: number; optimistic: number },
    speedMps: number,
    dtS: number,
  ) {
    // The car drives INTO the scene, so travelling forward is -z.
    cars.expected.group.position.z = -positions.expected;
    cars.pessimistic.group.position.z = -positions.pessimistic;
    cars.optimistic.group.position.z = -positions.optimistic;

    // Wheels turn at road speed: 0.33 m radius.
    wheelSpin -= (speedMps / 0.33) * dtS;
    for (const rig of Object.values(cars)) {
      for (const wheel of rig.wheels) wheel.rotation.x = wheelSpin;
    }

    // Chase camera. It sits back and slightly up, and pulls further back as
    // the car speeds up, which is the oldest trick for conveying speed.
    const back = 7.5 + Math.min(speedMps * 0.11, 5);
    const high = 2.6 + Math.min(speedMps * 0.015, 1.1);
    camera.position.set(0, high, -positions.expected + back);
    camTarget.set(0, 1.0, -positions.expected - 12);
    camera.lookAt(camTarget);

    // Widening the field of view with speed is the oldest trick in racing
    // games: the edges of the frame sweep past faster than the middle, so the
    // car feels quicker without anything actually moving faster.
    const wantFov = BASE_FOV + Math.min(speedMps * 0.26, 16);
    if (Math.abs(camera.fov - wantFov) > 0.01) {
      camera.fov += (wantFov - camera.fov) * Math.min(1, dtS * 3);
      camera.updateProjectionMatrix();
    }

    // Keep the shadow frustum with the car instead of wasting it behind.
    sun.position.set(-40, 60, -positions.expected + 30);
    sun.target.position.set(0, 0, -positions.expected);
    sun.target.updateMatrixWorld();

    renderer.render(scene, camera);
  }

  function resize(w: number, h: number) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function dispose() {
    // Three.js does not free GPU memory on its own, and this component is
    // mounted and unmounted every time the car changes.
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh | THREE.InstancedMesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) (mat as THREE.Material).dispose();
    });
    renderer.dispose();
  }

  return { renderer, scene, camera, cars, render, resize, dispose };
}
