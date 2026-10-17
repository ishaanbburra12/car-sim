import * as THREE from "three";
import {
  CAMERA_FAR,
  CAMERA_NEAR,
  configureRenderer,
  createAtmosphere,
  createDisposer,
  type Atmosphere,
} from "./sceneLighting";
import { CAR_COLORS, buildCar, createCarKit, type CarRig } from "./sceneCar";

export { CAR_COLORS };
export type { CarRig };

/**
 * The 3D world for drive mode.
 *
 * This file knows nothing about physics. It is handed three positions every
 * frame and draws them. All the numbers it uses are visual: road width, how
 * far apart the posts are, where the camera sits. None of them feed back into
 * the simulation, which is why they are not in the assumption ledger — they
 * describe a picture, not a car.
 *
 * The sky, lighting and environment map live in sceneLighting.ts; the car
 * geometry lives in sceneCar.ts. This file owns the road, the scenery and the
 * camera.
 */

const ROAD_HALF_WIDTH = 5;
const ROAD_LENGTH = 4000; // metres of road laid down ahead of the start line
const SHOULDER_WIDTH = 2.4;
const POST_SPACING_M = 12.5; // roadside posts, the main cue for how fast you are going
const POST_COUNT = 320;
const LANE_DASH_M = 12;
const QUARTER_MILE_M = 402.336;

/* ------------------------------------------------------------------ *
 * Procedural asphalt
 *
 * The single biggest thing separating "a grey plane" from "a road" is that
 * real tarmac has grain. One 256x256 canvas, tiled hundreds of times down
 * the road with anisotropic filtering, costs ~256 KB and one texture fetch.
 * ------------------------------------------------------------------ */
function makeAsphaltTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const S = 256;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#2a2e34";
  ctx.fillRect(0, 0, S, S);

  // Aggregate: thousands of tiny stones of varying lightness. Drawn as
  // rectangles rather than circles because at this size nobody can tell and
  // fillRect is far cheaper.
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const r = Math.random();
    const shade = r < 0.5 ? 28 + r * 40 : 52 + r * 46;
    ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 5})`;
    const size = 0.7 + Math.random() * 1.9;
    ctx.fillRect(x, y, size, size);
  }
  // A few darker patches: tar repairs and oil. Breaks up the regularity that
  // otherwise makes a tiled texture read as a tiled texture.
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const rad = 6 + Math.random() * 26;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, "rgba(18,20,24,0.55)");
    grad.addColorStop(1, "rgba(18,20,24,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  // Anisotropy is what stops the road turning to mush in the distance, and
  // it is close to free on any GPU made this decade.
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export type Scene = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  cars: { expected: CarRig; pessimistic: CarRig; optimistic: CarRig };
  /** Move the world to match the simulation, then draw one frame. */
  render: (
    positions: { expected: number; pessimistic: number; optimistic: number },
    speedMps: number,
    dtS: number,
  ) => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
};

export function createScene(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Scene {
  const disposer = createDisposer();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  configureRenderer(renderer, width, height);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, width / height, CAMERA_NEAR, CAMERA_FAR);
  const BASE_FOV = 60;

  // Sky, sun, environment map and fog, all derived from one another so the
  // reflections match the world the car is actually standing in.
  const atmosphere: Atmosphere = createAtmosphere(renderer, scene, disposer);

  /* ---- Terrain ---------------------------------------------------- */
  // Not a flat plane: a gentle roll either side of the road so the horizon
  // has shape. The road corridor itself stays dead flat.
  const groundGeo = disposer.add(new THREE.PlaneGeometry(900, ROAD_LENGTH + 600, 24, 90));
  {
    const pos = groundGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const edge = Math.max(0, Math.abs(x) - (ROAD_HALF_WIDTH + SHOULDER_WIDTH + 6));
      const roll =
        Math.sin(y * 0.0055) * 2.2 + Math.sin(y * 0.0017 + x * 0.004) * 3.4;
      pos.setZ(i, -Math.min(edge * 0.06, 3) + roll * Math.min(1, edge / 60));
    }
    groundGeo.computeVertexNormals();
  }
  const groundMat = disposer.add(
    new THREE.MeshStandardMaterial({ color: 0x2b2f26, roughness: 1, metalness: 0 }),
  );
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -ROAD_LENGTH / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---- Road ------------------------------------------------------- */
  const asphalt = disposer.add(makeAsphaltTexture(renderer));
  asphalt.repeat.set(3, ROAD_LENGTH / 8);

  const roadGeo = disposer.add(new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, ROAD_LENGTH));
  const roadMat = disposer.add(
    new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.92, metalness: 0 }),
  );
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, -ROAD_LENGTH / 2 + 60);
  road.receiveShadow = true;
  scene.add(road);

  // Shoulder: a lighter, rougher strip either side so the road has an edge
  // rather than just stopping.
  const shoulderGeo = disposer.add(new THREE.PlaneGeometry(SHOULDER_WIDTH, ROAD_LENGTH));
  const shoulderMat = disposer.add(
    new THREE.MeshStandardMaterial({ color: 0x3a3b35, roughness: 1 }),
  );
  for (const sx of [-1, 1]) {
    const shoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulder.rotation.x = -Math.PI / 2;
    shoulder.position.set(
      sx * (ROAD_HALF_WIDTH + SHOULDER_WIDTH / 2),
      0.008,
      -ROAD_LENGTH / 2 + 60,
    );
    shoulder.receiveShadow = true;
    scene.add(shoulder);
  }

  /* ---- Markings --------------------------------------------------- */
  const paintMat = disposer.add(
    new THREE.MeshStandardMaterial({ color: 0xcfd4da, roughness: 0.65 }),
  );
  const dashGeo = disposer.add(new THREE.BoxGeometry(0.16, 0.02, LANE_DASH_M * 0.45));
  const dashCount = Math.floor(ROAD_LENGTH / LANE_DASH_M);
  const dashes = new THREE.InstancedMesh(dashGeo, paintMat, dashCount);
  const m = new THREE.Matrix4();
  for (let i = 0; i < dashCount; i++) {
    m.setPosition(0, 0.035, 60 - i * LANE_DASH_M);
    dashes.setMatrixAt(i, m);
  }
  dashes.instanceMatrix.needsUpdate = true;
  scene.add(dashes);

  const edgeGeo = disposer.add(new THREE.BoxGeometry(0.18, 0.02, ROAD_LENGTH));
  for (const x of [-ROAD_HALF_WIDTH + 0.25, ROAD_HALF_WIDTH - 0.25]) {
    const edge = new THREE.Mesh(edgeGeo, paintMat);
    edge.position.set(x, 0.035, -ROAD_LENGTH / 2 + 60);
    scene.add(edge);
  }

  // Start line and the quarter-mile gate: landmarks, so the road is a place
  // rather than an endless ribbon.
  const gateGeo = disposer.add(new THREE.BoxGeometry(ROAD_HALF_WIDTH * 2, 0.02, 0.45));
  for (const z of [0, -QUARTER_MILE_M]) {
    const gate = new THREE.Mesh(gateGeo, paintMat);
    gate.position.set(0, 0.04, z);
    scene.add(gate);
  }

  /* ---- Barrier and posts ------------------------------------------ */
  // One long extruded rail each side. Two draw calls for the whole length.
  const railGeo = disposer.add(new THREE.BoxGeometry(0.12, 0.34, ROAD_LENGTH));
  const railMat = disposer.add(
    new THREE.MeshStandardMaterial({ color: 0x8d949c, metalness: 0.85, roughness: 0.42 }),
  );
  atmosphere.applyTo(railMat, 1.0);
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(
      sx * (ROAD_HALF_WIDTH + SHOULDER_WIDTH + 0.4),
      0.72,
      -ROAD_LENGTH / 2 + 60,
    );
    scene.add(rail);
  }

  const postGeo = disposer.add(new THREE.BoxGeometry(0.14, 0.95, 0.14));
  const postMat = disposer.add(
    new THREE.MeshStandardMaterial({ color: 0x6b7482, roughness: 0.8 }),
  );
  const posts = new THREE.InstancedMesh(postGeo, postMat, POST_COUNT * 2);
  let n = 0;
  for (let i = 0; i < POST_COUNT; i++) {
    for (const sx of [-1, 1]) {
      m.setPosition(sx * (ROAD_HALF_WIDTH + SHOULDER_WIDTH + 0.4), 0.47, 40 - i * POST_SPACING_M);
      posts.setMatrixAt(n++, m);
    }
  }
  posts.instanceMatrix.needsUpdate = true;
  // Deliberately not a shadow caster: 640 instances dominated the shadow
  // pass and the shadows were invisible at speed.
  posts.castShadow = false;
  scene.add(posts);

  /* ---- Distant scenery -------------------------------------------- */
  // Instanced cones as conifers, scattered well back from the road. One draw
  // call for several hundred, and they give the horizon something to be.
  const treeGeo = disposer.add(new THREE.ConeGeometry(2.4, 9, 6));
  const treeMat = disposer.add(
    new THREE.MeshStandardMaterial({ color: 0x1f3326, roughness: 1, flatShading: true }),
  );
  const TREES = 420;
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, TREES);
  const q = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const pos = new THREE.Vector3();
  // A fixed pseudo-random sequence rather than Math.random, so the scenery
  // is identical on every run and nothing can look different between two
  // sessions of what is meant to be the same road.
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < TREES; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const off = 22 + rnd() * 160;
    const s = 0.65 + rnd() * 1.5;
    pos.set(side * off, 9 * s * 0.5 - 1.5, 40 - rnd() * ROAD_LENGTH);
    scl.set(s, s * (0.8 + rnd() * 0.6), s);
    m.compose(pos, q, scl);
    trees.setMatrixAt(i, m);
  }
  trees.instanceMatrix.needsUpdate = true;
  scene.add(trees);

  /* ---- The three cars --------------------------------------------- */
  // One shared geometry kit: the three cars differ in material, not mesh.
  const kit = createCarKit();
  const cars = {
    pessimistic: buildCar(CAR_COLORS.ghost, 0.42, kit),
    optimistic: buildCar(CAR_COLORS.ghost, 0.42, kit),
    expected: buildCar(CAR_COLORS.expected, 1, kit, atmosphere.environment),
  };
  cars.pessimistic.group.position.x = -2.6;
  cars.optimistic.group.position.x = 2.6;
  for (const rig of Object.values(cars)) scene.add(rig.group);
  // No contact shadow is added here any more. Every car already carries its
  // own, inside buildCar: a plane textured to the car's PLAN, dark at the four
  // contact patches. Adding the atmosphere's radial blob on top of that put
  // two stacked haloes under each car, both wider than the car itself and both
  // darkest in the middle where nothing touches the ground.

  /* ---- Per-frame --------------------------------------------------- */
  const camTarget = new THREE.Vector3();
  let wheelSpin = 0;

  // ---- Adaptive resolution ----
  // The physics runs 200 steps a second and the engine note updates every
  // frame, both on this thread. If the GPU cannot keep up, the honest thing
  // is to render fewer pixels rather than let the simulation fall behind:
  // the drive loop's catch-up clamp DISCARDS time it cannot simulate, so a
  // slow renderer literally makes the car travel less far in the same real
  // seconds. Dropping resolution is invisible next to that.
  const BASE_PIXEL_RATIO = Math.min(window.devicePixelRatio, 1.75);
  const MIN_SCALE = 0.55;
  let renderScale = 1;
  let frameAvgMs = 16;
  let sinceAdjust = 0;

  function adaptResolution(dtS: number) {
    // A long rolling average, so one slow frame while a texture uploads does
    // not drop the resolution for everyone.
    frameAvgMs += (dtS * 1000 - frameAvgMs) * 0.05;
    sinceAdjust += dtS;
    if (sinceAdjust < 0.75) return;
    sinceAdjust = 0;
    const before = renderScale;
    if (frameAvgMs > 22 && renderScale > MIN_SCALE) renderScale = Math.max(MIN_SCALE, renderScale - 0.15);
    else if (frameAvgMs < 13 && renderScale < 1) renderScale = Math.min(1, renderScale + 0.1);
    if (renderScale !== before) renderer.setPixelRatio(BASE_PIXEL_RATIO * renderScale);
  }
  let lastSpeed = 0;
  let pitch = 0; // body squat under power, dive under braking
  let shakeT = 0;

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

    // Squat and dive. The simulation gives us speed; acceleration is just
    // how fast that is changing, so the body can lean without the physics
    // having to tell us anything extra.
    const accel = dtS > 0 ? (speedMps - lastSpeed) / dtS : 0;
    lastSpeed = speedMps;
    const wantPitch = Math.max(-0.045, Math.min(0.05, -accel * 0.006));
    pitch += (wantPitch - pitch) * Math.min(1, dtS * 6);
    cars.expected.group.rotation.x = pitch;

    // Camera shake, scaled by speed. Two sine waves at unrelated frequencies
    // read as road surface rather than as a wobble.
    shakeT += dtS;
    const shake = Math.min(speedMps / 70, 1) * 0.035;
    const shakeY = Math.sin(shakeT * 37) * shake + Math.sin(shakeT * 19.7) * shake * 0.6;
    const shakeX = Math.sin(shakeT * 23.3) * shake * 0.7;

    // Chase camera. It sits back and slightly up, and pulls further back as
    // the car speeds up, which is the oldest trick for conveying speed.
    const back = 7.5 + Math.min(speedMps * 0.11, 5);
    const high = 2.5 + Math.min(speedMps * 0.015, 1.1);
    camera.position.set(shakeX, high + shakeY, -positions.expected + back);
    camTarget.set(0, 1.0 + shakeY * 0.5, -positions.expected - 12);
    camera.lookAt(camTarget);

    // Widening the field of view with speed is the oldest trick in racing
    // games: the edges of the frame sweep past faster than the middle, so the
    // car feels quicker without anything actually moving faster.
    const wantFov = BASE_FOV + Math.min(speedMps * 0.26, 16);
    if (Math.abs(camera.fov - wantFov) > 0.01) {
      camera.fov += (wantFov - camera.fov) * Math.min(1, dtS * 3);
      camera.updateProjectionMatrix();
    }

    // Keeps the sun's shadow frustum and the sky centred on the car instead
    // of wasting both behind it.
    atmosphere.update(camera, -positions.expected);

    if (dtS > 0) adaptResolution(dtS);
    renderer.render(scene, camera);
  }

  function resize(w: number, h: number) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function dispose() {
    // Three.js frees nothing on its own, and this component is mounted and
    // unmounted every time the car changes. scene.traverse() cannot see
    // textures, render targets or shadow maps, which is why everything goes
    // through the disposer instead.
    for (const rig of Object.values(cars)) rig.dispose();
    kit.dispose();
    atmosphere.dispose();
    disposer.run();
    renderer.dispose();
  }

  return { renderer, scene, camera, cars, render, resize, dispose };
}
