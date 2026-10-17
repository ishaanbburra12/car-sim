import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky.js";

/* ------------------------------------------------------------------ *
 * LIGHTING, SKY AND TONE
 *
 * One source of truth for the time of day. The sun direction below
 * drives the sky shader, the key light, the shadow frustum, the
 * environment map and the fog colour, so none of them can drift apart.
 *
 * INTEGRATION (see the block at the bottom of this file for the exact
 * edits to createScene / render / resize / dispose).
 * ------------------------------------------------------------------ */

/** 0 deg = sun directly behind the car, 180 deg = dead ahead. */
const SUN_AZIMUTH_DEG = -52;
const SUN_ELEVATION_DEG = 22;
/** How far up the key light sits. Only affects the shadow frustum depth. */
const SUN_DISTANCE_M = 60;

const SKY_TURBIDITY = 4.2;
const SKY_RAYLEIGH = 2.1;
const SKY_MIE_COEFFICIENT = 0.005;
const SKY_MIE_G = 0.82;

/**
 * Edge length of the sky cube. It is pinned to the camera and drawn with
 * depth testing off, so this only has to stay inside the far plane:
 * corner distance is SKY_BOX_SIZE * 0.866 = 346 m, against a 650 m far plane.
 */
const SKY_BOX_SIZE = 400;

/**
 * Exported so there is exactly one definition. near 0.8 is safe: nothing is
 * ever closer than the chase camera's 7.5 m standoff. Together these take the
 * depth ratio from 12000:1 to 813:1, which is what actually stops the
 * coplanar road markings at y=0.01/0.03/0.03 shimmering at distance.
 */
export const CAMERA_NEAR = 0.8;
export const CAMERA_FAR = 650;
/** 8.6% at 100 m, 30% at 200 m, 98% at the far plane: no pop at the clip. */
const FOG_DENSITY = 0.003;

const SUN_COLOR = 0xfff1dc;
const SUN_INTENSITY = 3.0;
/** Was 1.1. The environment map now supplies the ambient this was faking. */
const HEMI_INTENSITY = 0.35;
const GROUND_BOUNCE_COLOR = 0x23252a;
const ENVIRONMENT_INTENSITY = 0.65;

/**
 * Neutral (the Khronos PBR neutral curve) rather than ACES on purpose:
 * ACES pulls saturated orange towards yellow and saturated blue towards
 * violet, and the amber/blue split between the driven car and the two
 * ghosts is load bearing. Neutral still rolls highlights off, which is
 * what actually reads as photographic. Swap this one constant for
 * THREE.ACESFilmicToneMapping if you want the punchier, less faithful look.
 */
const TONE_MAPPING: THREE.ToneMapping = THREE.NeutralToneMapping;
const TONE_MAPPING_EXPOSURE = 1.0;

/** +/-18 m over 1024 texels = 3.52 cm/texel, vs 7.81 cm at the old +/-40. */
const SHADOW_SPAN_M = 18;
const SHADOW_MAP_SIZE = 1024;

/* ------------------------------------------------------------------ *
 * Disposal registry
 * ------------------------------------------------------------------ */

type Disposable = { dispose: () => void };

export type Disposer = {
  add: <T extends Disposable>(resource: T) => T;
  run: () => void;
};

/**
 * scene.traverse() finds objects, not resources. It cannot see textures
 * hanging off materials, scene.environment, scene.background or a light's
 * shadow map, and it visits shared geometry once per mesh that uses it.
 * A Set keyed on the resource itself fixes both halves of that.
 */
export function createDisposer(): Disposer {
  const seen = new Set<Disposable>();
  return {
    add<T extends Disposable>(resource: T): T {
      seen.add(resource);
      return resource;
    },
    run() {
      for (const resource of seen) {
        try {
          resource.dispose();
        } catch {
          // A resource that is already gone must not strand the rest.
        }
      }
      seen.clear();
    },
  };
}

/* ------------------------------------------------------------------ *
 * Renderer configuration
 * ------------------------------------------------------------------ */

export function configureRenderer(renderer: THREE.WebGLRenderer, width: number, height: number) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(width, height, false);

  // outputColorSpace is already SRGBColorSpace and ColorManagement is
  // already on by default in r170, so the only thing missing was a curve.
  renderer.toneMappingExposure = TONE_MAPPING_EXPOSURE;

  renderer.shadowMap.enabled = true;
  // At the tightened SHADOW_SPAN_M below each texel covers ~3.5 cm rather
  // than ~7.8 cm, which is the point at which the soft filter stops
  // blurring something that was already blurry from undersampling.
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // NOTE: tone mapping is deliberately NOT set here. The sky sample and
  // the PMREM bake both want scene-referred linear values, and both run
  // during construction. Turning the curve on afterwards costs one extra
  // shader compile instead of two. See createAtmosphere().
}

/* ------------------------------------------------------------------ *
 * Sun direction
 * ------------------------------------------------------------------ */

function makeSunDirection(): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - SUN_ELEVATION_DEG);
  const theta = THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG);
  // setFromSphericalCoords gives x = sin(phi)sin(theta), y = cos(phi),
  // z = sin(phi)cos(theta), so theta = 0 points at +z, which is behind
  // the car. Unit length matters: Sky's vertex shader normalises the
  // direction but derives its sun-fade term from the raw y.
  //
  // Up, left and BEHIND is chosen for the chase camera: a sun ahead would
  // backlight all three cars into silhouettes and destroy the amber/blue
  // read. From behind-left the camera sees the lit rear and left flank.
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}

/* ------------------------------------------------------------------ *
 * Sky
 * ------------------------------------------------------------------ */

function createSky(sunDirection: THREE.Vector3): Sky {
  const sky = new Sky();
  sky.scale.setScalar(SKY_BOX_SIZE);

  const uniforms = sky.material.uniforms;
  uniforms.turbidity.value = SKY_TURBIDITY;
  uniforms.rayleigh.value = SKY_RAYLEIGH;
  uniforms.mieCoefficient.value = SKY_MIE_COEFFICIENT;
  uniforms.mieDirectionalG.value = SKY_MIE_G;
  uniforms.sunPosition.value.copy(sunDirection);

  // The usual sky.scale.setScalar(450000) trick needs a far plane in the
  // millions, and this scene wants the opposite: a short far plane so the
  // coplanar road markings stop z-fighting. A cube cannot have every face
  // beyond the scene AND every corner inside a 650 m far plane, so the
  // depth test is turned off instead. renderOrder -1 puts it first, before
  // anything has written depth, and depthWrite was already false, so every
  // opaque object still draws over it correctly.
  sky.material.depthWrite = false;
  sky.material.depthTest = false;
  sky.renderOrder = -1;
  // It is pinned to the camera every frame, so the usual bounding-sphere
  // cull would be wrong on the frame the camera jumps.
  sky.frustumCulled = false;

  return sky;
}

/* ------------------------------------------------------------------ *
 * Reading the sky's own colours back
 * ------------------------------------------------------------------ */

type SkyColours = { horizon: THREE.Color; upper: THREE.Color };

/**
 * Renders a 64x32 strip of sky and reads it back so the fog and the
 * hemisphere light can be derived from the sky instead of hand-matched to
 * it. The old code hard-coded the fog to 0x44536a while the gradient's
 * horizon stop was 0x59687f, and the step where the road faded out was
 * visible. Sampling makes that class of mismatch impossible, and keeps
 * being correct if anyone later changes the sun elevation or turbidity.
 *
 * Costs one 2048-pixel render plus one synchronous readback, once, at
 * construction. Falls back to fixed colours if the read is refused.
 */
function sampleSkyColours(renderer: THREE.WebGLRenderer, source: THREE.Scene): SkyColours {
  const W = 64;
  const H = 32;
  const result: SkyColours = {
    horizon: new THREE.Color(0x8ba3bd),
    upper: new THREE.Color(0x3f6ea8),
  };

  const target = new THREE.WebGLRenderTarget(W, H, {
    format: THREE.RGBAFormat,
    // readRenderTargetPixels rejects anything else (WebGLRenderer.js:2439).
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false,
  });

  const previousTarget = renderer.getRenderTarget();

  try {
    // Default camera orientation already looks down -z, the direction of
    // travel. Pitching +20 deg with a 40 deg vertical FOV makes the bottom
    // row of the image sit exactly on the horizon and the top row at 40 deg.
    const camera = new THREE.PerspectiveCamera(40, W / H, 1, SKY_BOX_SIZE);
    camera.rotation.set(THREE.MathUtils.degToRad(20), 0, 0);

    renderer.setRenderTarget(target);
    renderer.render(source, camera);

    const pixels = new Uint8Array(W * H * 4);
    renderer.readRenderTargetPixels(target, 0, 0, W, H, pixels);

    // readRenderTargetPixels hands back rows bottom-to-top, so row 0 is the
    // lowest elevation. Anything drawn into a non-XR render target is
    // written in LinearSRGBColorSpace regardless of the target's own
    // colorSpace tag (WebGLRenderer.js:1792), and renderer.toneMapping is
    // still NoToneMapping at this point, so these bytes are directly
    // comparable with the values scene.fog is mixed in at.
    const average = (rowStart: number, rowEnd: number, out: THREE.Color) => {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let y = rowStart; y < rowEnd; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          r += pixels[i];
          g += pixels[i + 1];
          b += pixels[i + 2];
          n++;
        }
      }
      if (n > 0) out.setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.LinearSRGBColorSpace);
    };

    average(0, 4, result.horizon);
    average(H - 4, H, result.upper);
  } catch {
    // Some drivers refuse readback on some formats. The fallbacks above
    // are close enough that nobody will notice.
  } finally {
    renderer.setRenderTarget(previousTarget);
    target.dispose();
  }

  return result;
}

/* ------------------------------------------------------------------ *
 * Environment map
 * ------------------------------------------------------------------ */

/**
 * The single biggest realism-per-millisecond item in the file. Car paint at
 * metalness 0.35 currently reflects nothing at all, which is exactly why
 * the cars read as flat plastic boxes.
 *
 * The probe scene is the real sky dome plus a dark ground disc and one
 * bright sun card. RoomEnvironment would also work and is one line, but it
 * is an interior: it would paint rectangular window reflections down the
 * flank of a car that is outdoors on a road. Using the actual sky means the
 * reflections and the background agree by construction, and the ground disc
 * is what stops the lower half of each car reflecting black.
 */
function bakeEnvironment(renderer: THREE.WebGLRenderer, probe: THREE.Scene): THREE.WebGLRenderTarget {
  const pmrem = new THREE.PMREMGenerator(renderer);
  try {
    // fromScene saves and restores toneMapping and autoClear itself
    // (PMREMGenerator.js:318-395), and forces NoToneMapping while it bakes,
    // so the cube holds scene-referred radiance. sigma 0 keeps the sun card
    // sharp, which is where the specular highlight on the paint comes from.
    return pmrem.fromScene(probe, 0, 1, 3000);
  } finally {
    pmrem.dispose();
  }
}


/* ------------------------------------------------------------------ *
 * The whole thing
 * ------------------------------------------------------------------ */

export type Atmosphere = {
  sun: THREE.DirectionalLight;
  environment: THREE.Texture;
  /** Call once per frame, AFTER the camera has been positioned. */
  update: (camera: THREE.Camera, playerZ: number) => void;
  /**
   * Gives a material a stronger reflection than the global
   * scene.environmentIntensity. Assigning envMap explicitly is the only way
   * to do this: when a MeshStandardMaterial has envMap === null the renderer
   * overwrites envMapIntensity with scene.environmentIntensity every frame
   * (WebGLRenderer.js:2110-2112), so setting it by hand silently does nothing.
   */
  applyTo: (material: THREE.MeshStandardMaterial, intensity: number) => void;
  dispose: () => void;
};

export function createAtmosphere(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  disposer: Disposer,
): Atmosphere {
  const sunDirection = makeSunDirection();

  // ---- Sky ----
  const sky = createSky(sunDirection);
  disposer.add(sky.geometry);
  disposer.add(sky.material);

  // ---- Probe scene for the sample and the bake ----
  const probe = new THREE.Scene();
  probe.add(sky);

  const groundGeo = new THREE.CircleGeometry(1000, 24);
  const groundMat = new THREE.MeshBasicMaterial({ color: GROUND_BOUNCE_COLOR });
  const groundDisc = new THREE.Mesh(groundGeo, groundMat);
  groundDisc.rotation.x = -Math.PI / 2;
  groundDisc.position.y = -2;
  probe.add(groundDisc);

  const sunCardGeo = new THREE.CircleGeometry(18, 20);
  const sunCardMat = new THREE.MeshBasicMaterial({
    // Deliberately above 1.0. PMREM bakes into a HalfFloat target, so the
    // overbright survives and becomes a crisp specular highlight on the
    // paint instead of a flat white smudge.
    color: new THREE.Color(1.0, 0.93, 0.82).multiplyScalar(8),
    toneMapped: false,
  });
  const sunCard = new THREE.Mesh(sunCardGeo, sunCardMat);
  sunCard.position.copy(sunDirection).multiplyScalar(150);
  sunCard.lookAt(0, 0, 0);
  probe.add(sunCard);

  // ---- Derive fog and sky bounce from the sky itself ----
  const colours = sampleSkyColours(renderer, probe);
  scene.fog = new THREE.FogExp2(colours.horizon.getHex(), FOG_DENSITY);

  // ---- Bake, then hand the sky over to the real scene ----
  const environmentTarget = disposer.add(bakeEnvironment(renderer, probe));
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = ENVIRONMENT_INTENSITY;

  scene.add(sky); // reparents out of the probe scene
  // The probe's own geometry and materials never enter the real scene, so
  // no traverse-based disposal would ever reach them.
  groundGeo.dispose();
  groundMat.dispose();
  sunCardGeo.dispose();
  sunCardMat.dispose();

  // Only now is the curve switched on, so the two passes above saw linear
  // values and the sky shader compiles exactly twice rather than three times.
  renderer.toneMapping = TONE_MAPPING;

  // ---- Lights ----
  const hemi = new THREE.HemisphereLight(colours.upper.getHex(), GROUND_BOUNCE_COLOR, HEMI_INTENSITY);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  sun.shadow.camera.left = -SHADOW_SPAN_M;
  sun.shadow.camera.right = SHADOW_SPAN_M;
  sun.shadow.camera.top = SHADOW_SPAN_M;
  sun.shadow.camera.bottom = -SHADOW_SPAN_M;
  // The light sits SUN_DISTANCE_M away along the sun direction and always
  // aims at the car, so the slab only has to be deep enough for the box.
  sun.shadow.camera.near = SUN_DISTANCE_M - SHADOW_SPAN_M - 10;
  sun.shadow.camera.far = SUN_DISTANCE_M + SHADOW_SPAN_M + 30;
  // WebGLShadowMap only calls updateProjectionMatrix() on the frame it
  // allocates the map (WebGLShadowMap.js:140-155). Changing the ortho
  // bounds at any other time is silently ignored, so do it here by hand.
  // If you ever make the span adapt to speed, call this again.
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0002;
  // ~3.5 cm per texel at this span, so a 2.5 cm normal offset removes the
  // acne without visible peter-panning.
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  scene.add(sun.target);

  // Contact shadows live with the car, not here: each rig carries a plane
  // textured to its own PLAN (see makeContactTexture in sceneCar.ts). This
  // module used to add a second, bigger radial blob on top of that one, so
  // every car sat on two stacked haloes, both wider than the car.

  // ---- Per frame ----
  function update(camera: THREE.Camera, playerZ: number) {
    // A small dome has to ride with the camera or the car drives out of it.
    sky.position.copy(camera.position);

    sun.position.set(
      sunDirection.x * SUN_DISTANCE_M,
      sunDirection.y * SUN_DISTANCE_M,
      playerZ + sunDirection.z * SUN_DISTANCE_M,
    );
    sun.target.position.set(0, 0, playerZ);
    sun.target.updateMatrixWorld();
  }

  function applyTo(material: THREE.MeshStandardMaterial, intensity: number) {
    material.envMap = environmentTarget.texture;
    material.envMapIntensity = intensity;
    material.needsUpdate = true;
  }

  function dispose() {
    scene.environment = null;
    scene.background = null;
    scene.fog = null;
    sun.shadow.dispose();
    // Everything else is in the disposer, including environmentTarget,
    // which is not reachable from scene.traverse().
  }

  return {
    sun,
    environment: environmentTarget.texture,
    update,
    applyTo,
    dispose,
  };
}

/* ==================================================================== *
 * INTEGRATION INTO createScene() — the exact edits.
 * This block compiles; it was typechecked as a mock createScene against
 * the project's real tsconfig.
 * ====================================================================
 *
 * 1. DELETE scene.ts lines 106-147 entirely: the skyCanvas/skyTex gradient,
 *    scene.background, the THREE.Fog, the HemisphereLight and the
 *    DirectionalLight with its shadow setup. All of it is replaced.
 *
 * 2. At the top of createScene:
 *
 *      const disposer = createDisposer();
 *      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
 *      configureRenderer(renderer, width, height);
 *      const scene = new THREE.Scene();
 *      const BASE_FOV = 60;
 *      const camera = new THREE.PerspectiveCamera(
 *        BASE_FOV, width / height, CAMERA_NEAR, CAMERA_FAR,
 *      );
 *      const atmosphere = createAtmosphere(renderer, scene, disposer);
 *
 *    createAtmosphere must run BEFORE anything reads scene.environment, and
 *    it needs the renderer, so it cannot move earlier than the renderer.
 *
 * 3. Register every geometry/material/texture you create with
 *    disposer.add(...) as you create it, e.g.
 *      const edgeGeo = disposer.add(new THREE.BoxGeometry(0.2, 0.02, 4000));
 *    and additionally disposer.add(dashes) / disposer.add(posts) so the
 *    InstancedMesh instance attributes are released too.
 *
 * 4. Car materials. In buildCar, raise metalness now that there is
 *    something to reflect (0.35 -> ~0.55, roughness 0.45 -> ~0.32), and for
 *    the PLAYER car only:
 *      atmosphere.applyTo(paint, 1.5);
 *    Leave the ghosts on the global scene.environmentIntensity so they stay
 *    flatter and more obviously ghostly than the car you drive.
 *
 * 5. Ghost shadows and self-shading. In buildCar, take castShadow from the
 *    ghost rigs (opacity is NOT consulted by the depth pass, so they
 *    currently throw hard black shadows), and set receiveShadow = true on
 *    body, cabin and wheels for all three so the cars self-shade:
 *      const solid = opacity >= 1;
 *      body.castShadow = solid;  body.receiveShadow = true;
 *      cabin.castShadow = solid; cabin.receiveShadow = true;
 *      wheel.castShadow = solid; wheel.receiveShadow = true;
 *
 * 6. In render(), REPLACE the three sun.position / sun.target lines
 *    (scene.ts:264-266) with a single call placed AFTER the camera has been
 *    positioned and the FOV eased, and BEFORE renderer.render:
 *      atmosphere.update(camera, -positions.expected);
 *
 * 7. In resize(), re-apply the pixel ratio — it is currently captured once
 *    at construction and never updated when the window moves to a monitor
 *    with a different DPR:
 *      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
 *
 * 8. REPLACE dispose() wholesale. The traverse cannot see textures,
 *    scene.environment or the shadow map, and it double-disposes shared
 *    geometry:
 *      function dispose() {
 *        atmosphere.dispose();
 *        disposer.run();
 *        renderer.dispose();
 *        renderer.forceContextLoss();  // see disposalNotes first
 *      }
 *
 * 9. Unrelated to lighting but free while you are in render(): wrap the
 *     unbounded wheelSpin accumulator, wheelSpin %= Math.PI * 2.
 * ==================================================================== */
