import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* ===========================================================================
   INTEGRATION (replaces CarRig + buildCar, scene.ts lines 24-84)

   1. Add the two imports above.
   2. In createScene(), build the kit ONCE and share it:

        const carKit = createCarKit();
        const cars = {
          pessimistic: buildCar(CAR_COLORS.ghost, 0.42, carKit),
          optimistic:  buildCar(CAR_COLORS.ghost, 0.42, carKit),
          expected:    buildCar(CAR_COLORS.expected, 1, carKit),
        };

   3. render() needs NO change. It writes `.rotation.x` on rig.wheels, which
      are now bare Object3D spinners; the only type change is
      `wheels: THREE.Mesh[]` -> `wheels: THREE.Object3D[]`.

   4. dispose() MUST change. The existing scene.traverse() would dispose the
      SHARED kit geometries up to three times and would never reach the
      contact texture. Remove the car groups first:

        for (const rig of Object.values(cars)) { scene.remove(rig.group); rig.dispose(); }
        carKit.dispose();
        scene.traverse(...);   // now only reaches road / ground / posts
        renderer.dispose();

   5. The hero's meshes set receiveShadow, which they did not before. Curved
      car surfaces WILL shadow-acne at the current 80 m ortho span. Add:

        sun.shadow.normalBias = 0.03;
        sun.shadow.bias = -0.0005;

      and if you also take the reader's advice to shrink shadowSpan to ~18,
      normalBias can drop to 0.015 and the shadows get sharper, not blurrier.

   6. Call renderer.compile(scene, camera) once before the first frame. The
      hero paint is MeshPhysicalMaterial with clearcoat + envMap, which some
      drivers take 20-60 ms to compile; this moves that hitch to mount.

   7. HARD DEPENDENCY: the paint uses metalness 0.55 and metal has no diffuse
      response. With no scene.environment the hero renders nearly black. If
      the RoomEnvironment + PMREM work does not land, change the paint to
      metalness 0.25 / roughness 0.38.

   8. Emissive intensities assume the current NoToneMapping. Under ACES/AgX,
      raise tail to ~4.0 and head to ~2.6.
   ========================================================================= */

export const CAR_COLORS = {
  expected: 0xd97706, // the car you drive
  ghost: 0x3b82f6, // the two bounds
};

/* ===========================================================================
   CARS

   Everything below is procedural: no model file, no texture file, and no
   addon beyond BufferGeometryUtils, which ships inside three@0.170.

   Orientation, fixed by render(): the car drives toward -z, so -z is the NOSE
   and +z is the TAIL. The chase camera sits at +z. That is the single most
   important fact in this file -- we are looking at the back of these cars
   essentially 100% of the time, so the detail budget goes to the tail.
   ========================================================================= */

/** Tyre radius. MUST stay 0.33: render() derives wheel spin from `speed/0.33`. */
const WHEEL_R = 0.33;
const WHEEL_HALF_W = 0.1175;
const TRACK_X = 0.785; // centreline to wheel centre
const AXLE_F = -1.33;
const AXLE_R = 1.33;

/* ------------------------------------------------------------------ lofting */

/**
 * One cross-section of a lofted shell.
 *
 * The section is a superellipse that is allowed to be a different shape above
 * and below its own waist, which is what lets one primitive describe a tucked
 * underbody and a flat shoulder at the same time:
 *
 *   wTop / wBot   half width at the top / bottom of the section
 *   top  / bot    y of the crown / keel
 *   nTop / nBot   "squareness" above / below the waist
 *                 (2 = ellipse, 4 = soft box, 6 = nearly a slab)
 */
type Station = {
  z: number;
  wTop: number;
  wBot: number;
  top: number;
  bot: number;
  nTop: number;
  nBot: number;
};

type Ribbon = {
  /**
   * Angular span of the band, measured with 0 = +x side, PI/2 = crown.
   * A single number holds the edge at one angle for the whole sweep; an array
   * (one per station) lets the band open out as it travels, which is how the
   * roof rail grows into a C-pillar without a seam between the two.
   */
  theta0: number | number[];
  theta1: number | number[];
  /** Outward offset of the visible face, one per station (ramps are allowed). */
  outer: number[];
  /** Offset of the hidden face. Negative buries it inside the host shell. */
  inner: number;
};

const _v = new THREE.Vector3();

/**
 * The section curve itself, measured from the section's own centre. x is half
 * width, y is signed height either side of the waist.
 */
function sectionXY(s: Station, theta: number): { x: number; y: number } {
  const c = Math.cos(theta);
  const sn = Math.sin(theta);

  // Blend the lower half-width into the upper one across the waist. This is
  // the fender shoulder: a smooth step rather than a hard ledge, and it is
  // the crease that catches a highlight down the whole flank.
  let t = (sn + 0.18) / 0.5;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  t = t * t * (3 - 2 * t);

  const hw = s.wBot + (s.wTop - s.wBot) * t;
  const p = 2 / (sn >= 0 ? s.nTop : s.nBot);
  const hh = (s.top - s.bot) * 0.5;

  return {
    x: hw * Math.sign(c) * Math.pow(Math.abs(c), p),
    y: hh * Math.sign(sn) * Math.pow(Math.abs(sn), p),
  };
}

function sectionPoint(s: Station, theta: number, inflate: number, out: THREE.Vector3): void {
  const base = sectionXY(s, theta);
  let x = base.x;
  let y = base.y;

  if (inflate !== 0) {
    // Offset along the section's OWN outward normal, not along the radius out
    // of its centre. On a near-flat section those two directions are tens of
    // degrees apart, so a radial push of 12 mm bought barely 1 mm of real
    // clearance and the glass came back out through the painted C-pillar at
    // the tail. Taking the normal from a central difference of the curve costs
    // two extra evaluations and makes the offset mean what it says.
    const h = 1e-3;
    const a = sectionXY(s, theta - h);
    const b = sectionXY(s, theta + h);
    // Theta runs counter-clockwise, so rotating the tangent by -90 deg points
    // out of the section.
    let nx = b.y - a.y;
    let ny = -(b.x - a.x);
    const len = Math.hypot(nx, ny);
    if (len > 1e-9) {
      nx /= len;
      ny /= len;
    } else {
      const r = Math.hypot(x, y) || 1;
      nx = x / r;
      ny = y / r;
    }
    x += nx * inflate;
    y += ny * inflate;
  }
  out.set(x, (s.top + s.bot) * 0.5 + y, s.z);
}

/**
 * Sweep a closed section along z.
 *
 * Two modes:
 *  - tube (default): a watertight solid, flat-capped at both ends.
 *  - ribbon: a thin panel spanning [theta0, theta1], offset off the host
 *    surface. Because the inner face is generated from the *same* section
 *    maths, a ribbon nests on its host by construction instead of by luck.
 *    This is how the roof skin and the ducktail lip are made.
 */
function loft(stations: Station[], segments: number, ribbon?: Ribbon): THREE.BufferGeometry {
  const rings = stations.length;
  // `frac` is where each sample sits across the band, 0 at theta0 and 1 at
  // theta1. The angle itself is resolved per station, further down.
  const frac: number[] = [];
  const isInner: boolean[] = [];

  if (ribbon) {
    for (let j = 0; j < segments; j++) {
      frac.push(j / (segments - 1));
      isInner.push(false);
    }
    for (let j = segments - 1; j >= 0; j--) {
      frac.push(j / (segments - 1));
      isInner.push(true);
    }
  } else {
    // Seam at the bottom centre, where nothing is ever seen.
    for (let j = 0; j < segments; j++) {
      frac.push(j / segments);
      isInner.push(false);
    }
  }

  const at = (v: number | number[], i: number) => (typeof v === "number" ? v : v[i]);
  const ringN = frac.length;
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i < rings; i++) {
    const outer = ribbon ? ribbon.outer[i] : 0;
    const t0 = ribbon ? at(ribbon.theta0, i) : 0;
    const t1 = ribbon ? at(ribbon.theta1, i) : 0;
    for (let j = 0; j < ringN; j++) {
      const theta = ribbon
        ? t0 + (t1 - t0) * frac[j]
        : -Math.PI / 2 + Math.PI * 2 * frac[j];
      sectionPoint(stations[i], theta, isInner[j] ? ribbon!.inner : outer, _v);
      pos.push(_v.x, _v.y, _v.z);
      uvs.push(j / ringN, rings > 1 ? i / (rings - 1) : 0);
    }
  }

  // Side wall. Winding is CCW seen from outside, given theta increases
  // counter-clockwise in xy and i increases toward +z.
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < ringN; j++) {
      const j2 = (j + 1) % ringN;
      const a = i * ringN + j;
      const b = i * ringN + j2;
      const c = (i + 1) * ringN + j2;
      const d = (i + 1) * ringN + j;
      idx.push(a, b, d, b, c, d);
    }
  }

  // Caps get their own copy of the ring so computeVertexNormals() creases the
  // rim instead of rounding it off.
  const addCap = (ringIndex: number, front: boolean) => {
    const src = ringIndex * ringN * 3;
    const base = pos.length / 3;
    for (let j = 0; j < ringN; j++) {
      pos.push(pos[src + j * 3], pos[src + j * 3 + 1], pos[src + j * 3 + 2]);
      uvs.push(j / ringN, front ? 0 : 1);
    }
    if (ribbon) {
      // Exact: stitch the outer arc to the inner arc. A centroid fan would
      // spill outside a thin curved band.
      const S = segments;
      for (let j = 0; j < S - 1; j++) {
        const o0 = base + j;
        const o1 = base + j + 1;
        const i0 = base + 2 * S - 1 - j;
        const i1 = base + 2 * S - 2 - j;
        if (front) idx.push(i0, i1, o1, i0, o1, o0);
        else idx.push(o0, o1, i1, o0, i1, i0);
      }
    } else {
      let cx = 0;
      let cy = 0;
      for (let j = 0; j < ringN; j++) {
        cx += pos[src + j * 3];
        cy += pos[src + j * 3 + 1];
      }
      const centre = pos.length / 3;
      pos.push(cx / ringN, cy / ringN, stations[ringIndex].z);
      uvs.push(0.5, 0.5);
      for (let j = 0; j < ringN; j++) {
        const j2 = (j + 1) % ringN;
        if (front) idx.push(centre, base + j2, base + j);
        else idx.push(centre, base + j, base + j2);
      }
    }
  };
  addCap(0, true);
  addCap(rings - 1, false);

  const g = new THREE.BufferGeometry();
  g.setIndex(idx);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

/** Linear blend between two stations, so a ribbon can land between them. */
function stationAt(list: Station[], z: number): Station {
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i];
    const b = list[i + 1];
    if (z >= a.z && z <= b.z) {
      const t = (z - a.z) / (b.z - a.z);
      const mix = (u: number, v: number) => u + (v - u) * t;
      return {
        z,
        wTop: mix(a.wTop, b.wTop),
        wBot: mix(a.wBot, b.wBot),
        top: mix(a.top, b.top),
        bot: mix(a.bot, b.bot),
        nTop: mix(a.nTop, b.nTop),
        nBot: mix(a.nBot, b.nBot),
      };
    }
  }
  return { ...list[z < list[0].z ? 0 : list.length - 1], z };
}

/**
 * Add rings at the given z values, in order, each one exactly what stationAt()
 * already reports there.
 *
 * This exists because of a bug worth remembering. A painted panel riding on
 * the greenhouse was drawn from its own list of stations while the glass under
 * it was drawn from the CABIN table, and between two CABIN stations the glass
 * is a straight line in z while the panel's extra stations sit on the curve.
 * Where the curve fell inside that line the glass came out THROUGH the paint,
 * as a ragged dark tear up the middle of the C-pillar. Measured at its worst:
 * 26 mm of paint swallowed, around z = 1.13.
 *
 * Lofting both from one ring list removes the disagreement at the source: the
 * panel is then the glass's own ring pushed outwards, which cannot sink into
 * it. The cost is that the glass gains the sliver of fullness the straight
 * line was cutting off, a little under 2 mm.
 */
function densify(list: Station[], extra: number[]): Station[] {
  const out = [...list];
  for (const z of extra) {
    if (out.some((o) => Math.abs(o.z - z) < 1e-9)) continue;
    const i = out.findIndex((o) => o.z > z);
    out.splice(i < 0 ? out.length : i, 0, stationAt(list, z));
  }
  return out;
}

/** Merge, then free the sources: they never enter the scene graph. */
function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (parts.length === 1) return parts[0];
  const merged = mergeGeometries(parts, false) as THREE.BufferGeometry | null;
  if (!merged) throw new Error("buildCar: geometry merge failed (attribute mismatch)");
  for (const p of parts) p.dispose();
  return merged;
}

/**
 * Outline hull for the ghosts: weld the shell (dropping the crease-split
 * normals), re-smooth, then push every vertex along its own normal. Welding
 * first is what stops the hull splitting open at every cap rim.
 */
function makeHull(src: THREE.BufferGeometry, d: number): THREE.BufferGeometry {
  const stripped = src.clone();
  stripped.deleteAttribute("normal");
  stripped.deleteAttribute("uv");
  const g = mergeVertices(stripped, 1e-4);
  stripped.dispose();
  g.computeVertexNormals();
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  const n = g.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d);
  }
  p.needsUpdate = true;
  return g;
}

/* ------------------------------------------------------------ the body shape */

/**
 * Lower body. Narrow enough (max half-width 0.634 at the axle) to clear the
 * inside face of the tyres at 0.667, so it reads as the floorpan and rocker
 * between the wheels.
 */
const TUB: Station[] = [
  { z: -2.14, wTop: 0.46, wBot: 0.4, top: 0.62, bot: 0.33, nTop: 2.8, nBot: 2.6 },
  { z: -1.85, wTop: 0.615, wBot: 0.545, top: 0.7, bot: 0.215, nTop: 3.4, nBot: 3.0 },
  { z: -1.2, wTop: 0.655, wBot: 0.585, top: 0.745, bot: 0.185, nTop: 4.4, nBot: 4.0 },
  { z: -0.4, wTop: 0.662, wBot: 0.605, top: 0.755, bot: 0.175, nTop: 5.0, nBot: 4.4 },
  { z: 0.4, wTop: 0.662, wBot: 0.605, top: 0.755, bot: 0.175, nTop: 5.0, nBot: 4.4 },
  { z: 1.2, wTop: 0.655, wBot: 0.585, top: 0.745, bot: 0.185, nTop: 4.4, nBot: 4.0 },
  { z: 1.8, wTop: 0.62, wBot: 0.55, top: 0.74, bot: 0.225, nTop: 3.6, nBot: 3.0 },
  { z: 2.13, wTop: 0.56, wBot: 0.5, top: 0.725, bot: 0.32, nTop: 3.0, nBot: 2.6 },
];

/**
 * Outer skin. Its KEEL (`bot`) rises to 0.70 over each axle, which is what
 * carves the wheel arches: between the tub and this shell there is a real
 * opening with the tyre inside it.
 *
 * Verified by sweeping z at 10 mm steps: minimum clearance over the tyre
 * 40 mm; tub/shoulder interpenetration sealed at every z; tyre outer face
 * 8-12 mm INBOARD of the fender (flush, no poke-out); 60 mm of visible arch
 * opening above the tread. If you retune these numbers, `bot` at the four
 * axle stations must stay >= 0.70 or the tyre pierces the fender.
 */
const SHOULDER: Station[] = [
  { z: -2.17, wTop: 0.5, wBot: 0.47, top: 0.605, bot: 0.355, nTop: 2.6, nBot: 2.6 },
  { z: -2.04, wTop: 0.76, wBot: 0.7, top: 0.665, bot: 0.28, nTop: 3.0, nBot: 2.8 },
  { z: -1.88, wTop: 0.86, wBot: 0.79, top: 0.705, bot: 0.33, nTop: 3.4, nBot: 3.0 },
  { z: -1.7, wTop: 0.91, wBot: 0.82, top: 0.745, bot: 0.56, nTop: 3.8, nBot: 3.2 },
  { z: -1.45, wTop: 0.93, wBot: 0.83, top: 0.78, bot: 0.7, nTop: 4.2, nBot: 3.4 },
  { z: -1.21, wTop: 0.93, wBot: 0.83, top: 0.788, bot: 0.7, nTop: 4.2, nBot: 3.4 },
  { z: -0.97, wTop: 0.912, wBot: 0.82, top: 0.795, bot: 0.56, nTop: 4.2, nBot: 3.2 },
  { z: -0.6, wTop: 0.888, wBot: 0.8, top: 0.812, bot: 0.455, nTop: 4.8, nBot: 3.4 },
  { z: 0.1, wTop: 0.886, wBot: 0.8, top: 0.818, bot: 0.45, nTop: 5.0, nBot: 3.6 },
  { z: 0.72, wTop: 0.9, wBot: 0.81, top: 0.812, bot: 0.47, nTop: 4.8, nBot: 3.4 },
  { z: 0.98, wTop: 0.918, wBot: 0.825, top: 0.802, bot: 0.57, nTop: 4.4, nBot: 3.2 },
  { z: 1.21, wTop: 0.934, wBot: 0.835, top: 0.794, bot: 0.7, nTop: 4.2, nBot: 3.4 },
  { z: 1.45, wTop: 0.934, wBot: 0.835, top: 0.79, bot: 0.7, nTop: 4.2, nBot: 3.4 },
  { z: 1.67, wTop: 0.908, wBot: 0.82, top: 0.788, bot: 0.56, nTop: 3.9, nBot: 3.2 },
  { z: 1.86, wTop: 0.868, wBot: 0.79, top: 0.784, bot: 0.33, nTop: 3.5, nBot: 2.9 },
  { z: 2.16, wTop: 0.766, wBot: 0.7, top: 0.764, bot: 0.345, nTop: 3.0, nBot: 2.6 },
];

/**
 * Greenhouse. Note wTop < wBot: that is tumblehome, the inward lean that stops
 * a cabin looking like a box. The keel sits at 0.70, 70-116 mm inside the
 * shoulder, so the glass never shows a seam where it meets the body. Centred
 * at z = +0.43, i.e. it sits back.
 */
const CABIN: Station[] = [
  // Same trick as the tail, at the other end: the windscreen keeps falling
  // past the cowl and dies under the bonnet, so its base is a shutline rather
  // than a flat pane of glass facing the oncoming road. `top` at the first
  // station is below the shoulder crown (0.797 here), which buries the cap.
  { z: -0.92, wTop: 0.26, wBot: 0.43, top: 0.788, bot: 0.74, nTop: 2.2, nBot: 2.2 },
  { z: -0.8, wTop: 0.34, wBot: 0.47, top: 0.88, bot: 0.72, nTop: 2.3, nBot: 2.4 },
  { z: -0.66, wTop: 0.41, wBot: 0.5, top: 1.0, bot: 0.7, nTop: 2.4, nBot: 2.6 },
  { z: -0.4, wTop: 0.56, wBot: 0.66, top: 1.14, bot: 0.7, nTop: 2.8, nBot: 2.8 },
  { z: -0.1, wTop: 0.68, wBot: 0.76, top: 1.25, bot: 0.7, nTop: 3.4, nBot: 3.0 },
  { z: 0.22, wTop: 0.735, wBot: 0.805, top: 1.3, bot: 0.7, nTop: 4.2, nBot: 3.2 },
  { z: 0.58, wTop: 0.735, wBot: 0.8, top: 1.3, bot: 0.7, nTop: 4.4, nBot: 3.2 },
  { z: 0.92, wTop: 0.69, wBot: 0.785, top: 1.27, bot: 0.7, nTop: 4.0, nBot: 3.0 },
  { z: 1.26, wTop: 0.58, wBot: 0.74, top: 1.165, bot: 0.7, nTop: 3.2, nBot: 2.8 },
  { z: 1.52, wTop: 0.43, wBot: 0.66, top: 1.0, bot: 0.72, nTop: 2.6, nBot: 2.6 },
  // The backlight keeps falling after the cabin proper ends, so the glass
  // runs out under the decklid instead of stopping in a flat wall facing the
  // car behind. `top` at the last station is below the shoulder crown (0.786
  // at this z), which is what buries the end cap.
  { z: 1.66, wTop: 0.35, wBot: 0.57, top: 0.9, bot: 0.73, nTop: 2.4, nBot: 2.4 },
  { z: 1.78, wTop: 0.27, wBot: 0.46, top: 0.775, bot: 0.74, nTop: 2.2, nBot: 2.2 },
];

/**
 * Where the painted roof skin stops and glass begins, measured the same way
 * `loft` measures theta (0 = +x flank, PI/2 = crown). The roof panel and the
 * C-pillars both read it, which is what keeps the pillar welded to the roof
 * edge rather than floating somewhere near it.
 */
const ROOF_EDGE = Math.PI / 2 - 0.95;

/** Lower edge of the C-pillar. Buried inside the shoulder at every z it spans. */
const SAIL_KEEL = -0.8;

/**
 * The rings the greenhouse and everything riding on it are actually lofted
 * from. The extra z values are where the painted side skin needs to change
 * shape; putting them in the shared list is what keeps the two surfaces from
 * cutting through each other. See densify().
 */
const CABIN_RINGS: Station[] = densify(
  CABIN,
  [-0.78, -0.7, -0.62, -0.5, -0.38, -0.26, -0.18, 1.0, 1.08, 1.16, 1.24, 1.32, 1.42],
);

/** Stations of the roof skin, by z rather than by index into the ring list. */
const ROOF_Z = [-0.1, 0.22, 0.58, 0.92];

const MIRROR_POD: Station[] = [
  { z: -0.63, wTop: 0.03, wBot: 0.028, top: 0.03, bot: -0.03, nTop: 2.2, nBot: 2.2 },
  { z: -0.55, wTop: 0.07, wBot: 0.066, top: 0.055, bot: -0.055, nTop: 2.6, nBot: 2.6 },
  { z: -0.47, wTop: 0.06, wBot: 0.056, top: 0.048, bot: -0.048, nTop: 2.4, nBot: 2.4 },
];

/* ------------------------------------------------------------- the parts kit */

export type CarKit = {
  paint: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  trim: THREE.BufferGeometry;
  chrome: THREE.BufferGeometry;
  tail: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  disc: THREE.BufferGeometry;
  caliper: THREE.BufferGeometry;
  tyre: THREE.BufferGeometry;
  rim: THREE.BufferGeometry;
  pool: THREE.BufferGeometry;
  poolTex: THREE.Texture;
  /** Everything above the wheels, welded into one geometry, for the ghosts. */
  ghostShell: THREE.BufferGeometry;
  ghostHull: THREE.BufferGeometry;
  ghostWheel: THREE.BufferGeometry;
  dispose: () => void;
};

function wheelPositions(): [number, number, number][] {
  return [
    [-TRACK_X, WHEEL_R, AXLE_F],
    [TRACK_X, WHEEL_R, AXLE_F],
    [-TRACK_X, WHEEL_R, AXLE_R],
    [TRACK_X, WHEEL_R, AXLE_R],
  ];
}

function makeContactTexture(): THREE.CanvasTexture {
  const size = 96;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (g) {
    const r = size / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.42, "rgba(255,255,255,0.78)");
    grad.addColorStop(0.76, "rgba(255,255,255,0.2)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Lathed tyre carcass with a real sidewall bulge and rounded shoulders. */
function makeTyre(): THREE.BufferGeometry {
  const w = WHEEL_HALF_W;
  // Beads at 0.212 tuck BEHIND the rim flange at 0.222, so the open ends of
  // the lathe are never visible as a see-through gap.
  const profile = [
    new THREE.Vector2(0.212, -w),
    new THREE.Vector2(0.272, -w * 0.96),
    new THREE.Vector2(0.308, -w * 0.82),
    new THREE.Vector2(0.325, -w * 0.58),
    new THREE.Vector2(WHEEL_R, -w * 0.3),
    new THREE.Vector2(WHEEL_R, w * 0.3),
    new THREE.Vector2(0.325, w * 0.58),
    new THREE.Vector2(0.308, w * 0.82),
    new THREE.Vector2(0.272, w * 0.96),
    new THREE.Vector2(0.212, w),
  ];
  const g = new THREE.LatheGeometry(profile, 20);
  g.rotateZ(-Math.PI / 2); // lathe axis Y -> axle along +x, outboard face at +x
  return g;
}

/** Five-spoke rim: lathed barrel, flange and dished face, plus spokes. */
function makeRim(): THREE.BufferGeometry {
  // The outboard face is OPEN. The old profile ran all the way back to the
  // centre, which made the wheel a closed dish with five little blocks raised
  // on it: no gaps, so the brake disc behind was never visible and the wheel
  // read as a hubcap. A real alloy is mostly hole. The lip rolls inward and
  // stops at 0.196, just inside the 0.195 disc, so the disc fills the opening
  // from straight on and the barrel's own interior fills it from an angle.
  const profile = [
    new THREE.Vector2(0.0, -0.105), // closed inboard end
    new THREE.Vector2(0.1, -0.105),
    new THREE.Vector2(0.212, -0.1),
    new THREE.Vector2(0.222, -0.08), // inner flange
    new THREE.Vector2(0.206, -0.04), // barrel well
    new THREE.Vector2(0.206, 0.04),
    new THREE.Vector2(0.222, 0.085), // outer flange
    new THREE.Vector2(0.212, 0.108),
    new THREE.Vector2(0.196, 0.1), // lip rolls in, and the face stops here
  ];
  const parts: THREE.BufferGeometry[] = [new THREE.LatheGeometry(profile, 20)];
  // Hub, with its cap: without this the spokes would meet at nothing.
  const hub = new THREE.CylinderGeometry(0.062, 0.056, 0.062, 14);
  hub.translate(0, 0.062, 0);
  parts.push(hub);
  for (let k = 0; k < 5; k++) {
    // Reaches from the hub (r 0.05) out to the lip (r 0.206), so each spoke
    // lands on both and the gap between them is genuinely open.
    const spoke = new THREE.BoxGeometry(0.156, 0.026, 0.05);
    spoke.translate(0.128, 0.082, 0);
    spoke.rotateY((k * Math.PI * 2) / 5);
    parts.push(spoke);
  }
  const g = mergeParts(parts);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/**
 * Build every geometry once. Measured: ~6 ms. Share it across all three cars
 * (passing it to buildCar) or you pay it three times.
 */
export function createCarKit(): CarKit {
  /* ---- paint: tub + outer skin + roof panel + ducktail + mirrors ---- */
  const paintParts: THREE.BufferGeometry[] = [loft(TUB, 20), loft(SHOULDER, 24)];

  // Roof skin: a ribbon riding 16-20 mm proud of the greenhouse crown. Its two
  // end caps become the windscreen header and the roof edge over the backlight,
  // so painted pillars fall out of the construction for free.
  paintParts.push(
    loft(
      ROOF_Z.map((z) => stationAt(CABIN_RINGS, z)),
      12,
      {
        theta0: ROOF_EDGE,
        theta1: Math.PI - ROOF_EDGE,
        outer: [0.016, 0.02, 0.02, 0.016],
        inner: -0.006,
      },
    ),
  );

  // Ducktail: same trick on the shoulder, offset ramping to 55 mm so the lip
  // grows out of the decklid. Its stations are interpolated to z = 2.10 rather
  // than taken from SHOULDER, because a cap at z = 2.16 would be exactly
  // coplanar with the body's tail panel and would z-fight.
  paintParts.push(
    loft(
      [1.45, 1.7, 1.92, 2.1].map((z) => stationAt(SHOULDER, z)),
      10,
      {
        theta0: Math.PI / 2 - 0.8,
        theta1: Math.PI / 2 + 0.8,
        outer: [0.002, 0.01, 0.03, 0.055],
        inner: -0.004,
      },
    ),
  );

  // Painted side skin: roof rail at the front, C-pillar at the back, one
  // ribbon. Three earlier attempts cut the pillar out as its own patch with a
  // guessed sweep angle, and every one of them left a bare panel edge lying on
  // the glass, which reads as a crack rather than as structure. This band has
  // no such edge, because both of its long sides are defined by something real:
  //
  //   upper  ROOF_EDGE at every station - the same constant the roof skin
  //          starts from, so the two panels share one boundary exactly and the
  //          pillar cannot drift off the roof.
  //   lower  SIDE_SKIN_LOWER: tucked just under the roof rail while there is a
  //          side window to leave alone, then swung down past SAIL_KEEL over
  //          the rear 40 cm. That swing IS the C-pillar's leading edge, and
  //          because it is a boundary of the band rather than a cut through it,
  //          it costs no cap.
  //
  // Below SAIL_KEEL the edge is inside the bodywork at every z it reaches, so
  // the panel dies in the quarter instead of stopping in mid-air.
  const SIDE_SKIN_Z = [
    -0.78, -0.7, -0.62, -0.5, -0.38, -0.26, -0.18, -0.1, 0.22, 0.58, 0.92, 1.0, 1.08, 1.16,
    1.24, 1.32, 1.42, 1.52, 1.66,
  ];
  // The lower edge may not turn more than about 0.2 rad between two stations.
  // It is a polyline, and a longer step cuts a chord across the greenhouse
  // instead of following it round - which is what let the glass out through
  // the paint the first time this was built. At 0.2 rad the chord sits ~4 mm
  // inside the surface, against a paint offset of 12-16 mm.
  const SIDE_SKIN_LOWER = [
    // A-pillar. It opens downward going forward exactly as the C-pillar opens
    // going back, but it must stay NARROW: a real A-pillar is a strut, and the
    // first version of this swung the edge down so early that the windscreen
    // and the door glass were separated by a buttress half a metre across.
    // So the edge hugs the roof rail through the door opening and only drops
    // away under the bonnet, where it is buried and nobody sees it go.
    -0.45,
    -0.2,
    0.02,
    0.22,
    0.36,
    0.45,
    0.49,
    ROOF_EDGE - 0.1,
    ROOF_EDGE - 0.13,
    ROOF_EDGE - 0.13,
    ROOF_EDGE - 0.15,
    0.33,
    0.14,
    -0.06,
    -0.26,
    -0.45,
    -0.62,
    -0.75,
    SAIL_KEEL,
  ];
  // Matches the roof skin's offsets at the four stations they share, so the
  // seam between roof and side is flush rather than stepped.
  const SIDE_SKIN_OUTER = [
    0.012, 0.013, 0.014, 0.015, 0.016, 0.016, 0.016, 0.016, 0.02, 0.02, 0.016, 0.016, 0.016,
    0.015, 0.015, 0.014, 0.014, 0.013, 0.012,
  ];
  const sideStations = SIDE_SKIN_Z.map((z) => stationAt(CABIN_RINGS, z));
  for (const sx of [1, -1]) {
    // Mirrored by theta -> PI - theta, never by scale(-1, 1, 1): a negative
    // scale reverses the winding order and the panel renders inside out.
    // Reflecting reverses orientation and swapping the two edges reverses it
    // back, so the sweep stays low-to-high on both sides.
    const flip = (t: number) => Math.PI - t;
    paintParts.push(
      loft(sideStations, 14, {
        theta0: sx > 0 ? SIDE_SKIN_LOWER : flip(ROOF_EDGE),
        theta1: sx > 0 ? ROOF_EDGE : SIDE_SKIN_LOWER.map(flip),
        outer: SIDE_SKIN_OUTER,
        inner: -0.006,
      }),
    );
  }

  for (const sx of [-1, 1]) {
    const pod = loft(MIRROR_POD, 10);
    pod.translate(sx * 0.955, 0.822, 0);
    paintParts.push(pod);
    const stalk = new THREE.BoxGeometry(0.115, 0.03, 0.05);
    stalk.translate(sx * 0.862, 0.798, -0.585);
    paintParts.push(stalk);
  }
  const paint = mergeParts(paintParts);

  /* ---- glass ---- */
  const glass = loft(CABIN_RINGS, 18);

  /* ---- matte black trim ---- */
  const trimParts: THREE.BufferGeometry[] = [];
  for (const [wx, , wz] of wheelPositions()) {
    // Arch liner: an open half tube seen through the arch opening. Sized to
    // span |x| 0.665..0.905 so it stays inboard of the 0.911 fender and never
    // pokes through the paint.
    //
    // The arc used to be 189 deg, which put its two ends at y 0.299 while the
    // body's keel at that z is around 0.49: the liner hung below the car as a
    // pair of dark flaps. At 112 deg the ends sit at y 0.57, within a centimetre
    // or two of the keel above them, and the part of the arch anyone can
    // actually see into is still lined.
    const arc = Math.PI * 0.62;
    const liner = new THREE.CylinderGeometry(0.4, 0.4, 0.24, 12, 1, true, Math.PI / 2 - arc / 2, arc);
    liner.rotateZ(Math.PI / 2);
    liner.translate(wx, WHEEL_R, wz);
    trimParts.push(liner);
  }
  const diffuser = new THREE.BoxGeometry(1.16, 0.14, 0.34);
  diffuser.translate(0, 0.255, 1.98);
  trimParts.push(diffuser);

  // Number plate recess: a dark inset for the plate to sit in, so the plate
  // reads as set into the bodywork rather than stuck on it.
  const plateRecess = new THREE.BoxGeometry(0.56, 0.17, 0.02);
  plateRecess.translate(0, 0.475, 2.14);
  trimParts.push(plateRecess);

  // Recessed dark panel behind the tail lamps. Without it the lenses look
  // painted onto the bodywork instead of set into it, which is most of what
  // made the old tail read as two stickers.
  // Three widths have to agree here, and the first attempt got all three
  // wrong. The tail is a flat face and the body is 1.337 m across it at lamp
  // height (0.7): a bezel wider than that hangs its corners in open air, and a
  // bezel the same width as the lamps leaves them no dark surround to sit in.
  // 1.30 fits the face with 90 mm of margin either side of the 1.12 m lamp.
  const tailBezel = new THREE.BoxGeometry(1.3, 0.19, 0.02);
  tailBezel.translate(0, 0.7, 2.158);
  trimParts.push(tailBezel);
  for (let k = -2; k <= 2; k++) {
    const fin = new THREE.BoxGeometry(0.022, 0.13, 0.32);
    fin.translate(k * 0.22, 0.3, 1.98);
    trimParts.push(fin);
  }
  // Shutlines. A car without panel gaps reads as a bar of soap, and these are
  // the cheapest way to say "this is made of pressed panels".
  //
  // Each one is a ribbon only 1.5 mm proud of the body, which is far less than
  // the body's own tessellation error - so why does it not sink in and come
  // out dashed? Because a ribbon's vertices sit on the TRUE surface while the
  // body is a polygon inscribed in it. The strip is at worst flush and usually
  // a few mm proud, never swallowed. The same holds along z, as long as a
  // strip stays between two neighbouring SHOULDER stations, which is why the
  // z values below are what they are.
  const shutline = (z0: number, z1: number, t0: number, t1: number) =>
    loft(
      [stationAt(SHOULDER, z0), stationAt(SHOULDER, z1)],
      22,
      { theta0: t0, theta1: t1, outer: [0.0015, 0.0015], inner: -0.012 },
    );
  // Door, front and rear cuts, both sides (theta -> PI - theta to mirror).
  for (const [za, zb] of [
    [-0.87, -0.862],
    [0.952, 0.96],
  ] as const) {
    trimParts.push(shutline(za, zb, -0.9, 0.95));
    trimParts.push(shutline(za, zb, Math.PI - 0.95, Math.PI + 0.9));
  }
  // Bonnet, where it meets the base of the windscreen. The cabin's first ring
  // is at z = -0.92, so the cut goes just ahead of it.
  trimParts.push(shutline(-1.0, -0.992, 0.55, Math.PI - 0.55));

  const splitter = new THREE.BoxGeometry(1.1, 0.03, 0.26);
  splitter.translate(0, 0.27, -2.0);
  trimParts.push(splitter);
  const grille = new THREE.BoxGeometry(0.85, 0.16, 0.06);
  grille.translate(0, 0.47, -2.13);
  trimParts.push(grille);
  for (const sx of [-1, 1]) {
    // Dark disc at the BACK of the exhaust tip: this is what seals the open
    // tube so you see a recessed bore instead of straight through the car.
    const bore = new THREE.CircleGeometry(0.052, 12);
    bore.translate(sx * 0.42, 0.37, 2.06);
    trimParts.push(bore);
  }
  const trim = mergeParts(trimParts);

  /* ---- chrome: exhaust tips ---- */
  const chromeParts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    const tip = new THREE.CylinderGeometry(0.058, 0.05, 0.15, 12, 1, true);
    tip.rotateX(Math.PI / 2);
    tip.translate(sx * 0.42, 0.37, 2.12);
    chromeParts.push(tip);
    const lip = new THREE.TorusGeometry(0.056, 0.01, 4, 12);
    lip.translate(sx * 0.42, 0.37, 2.19);
    chromeParts.push(lip);
  }
  const chrome = mergeParts(chromeParts);

  /* ---- lamps: the tail is the hero view, so it gets the signature ----
     We look at the back of this car essentially 100% of the time, and at
     chase-camera distance two separate lenses read as two floating pink
     smudges. A single full-width bar is both more modern and far more
     legible at the size it is actually seen. ---- */
  const tailParts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    const lens = new THREE.BoxGeometry(0.38, 0.105, 0.042);
    lens.translate(sx * 0.37, 0.7, 2.168);
    tailParts.push(lens);
  }
  // Full-width connector, not a stub: it ties the two clusters into one light
  // bar across the whole tail. It overlaps both lenses, so the bar is
  // continuous rather than three pieces with seams.
  const bar = new THREE.BoxGeometry(0.78, 0.095, 0.04);
  bar.translate(0, 0.7, 2.17);
  tailParts.push(bar);
  const thirdBrake = new THREE.BoxGeometry(0.24, 0.022, 0.025);
  thirdBrake.translate(0, 1.295, 0.94);
  tailParts.push(thirdBrake);
  const tail = mergeParts(tailParts);

  const headParts: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    const lens = new THREE.BoxGeometry(0.26, 0.08, 0.045);
    lens.translate(sx * 0.44, 0.61, -2.09);
    headParts.push(lens);
    const drl = new THREE.BoxGeometry(0.3, 0.02, 0.03);
    drl.translate(sx * 0.45, 0.545, -2.095);
    headParts.push(drl);
  }
  // The plate itself. It rides in the headlamp material: pale and very
  // slightly self-lit, which is what a retroreflective plate looks like, and
  // it costs no extra material or draw call.
  const plate = new THREE.BoxGeometry(0.52, 0.13, 0.012);
  plate.translate(0, 0.475, 2.152);
  headParts.push(plate);
  const head = mergeParts(headParts);

  /* ---- brakes: all four corners merged, and deliberately NOT spinning ---- */
  const discParts: THREE.BufferGeometry[] = [];
  const caliperParts: THREE.BufferGeometry[] = [];
  for (const [wx, wy, wz] of wheelPositions()) {
    const d = new THREE.CylinderGeometry(0.195, 0.195, 0.02, 18);
    d.rotateZ(Math.PI / 2);
    d.translate(wx, wy, wz);
    discParts.push(d);
    const cal = new THREE.BoxGeometry(0.04, 0.1, 0.14);
    cal.rotateX(0.69); // sit tangentially on the disc
    cal.translate(wx - Math.sign(wx) * 0.03, wy + 0.115, wz + 0.095);
    caliperParts.push(cal);
  }
  const disc = mergeParts(discParts);
  const caliper = mergeParts(caliperParts);

  /* ---- wheels ---- */
  const tyre = makeTyre();
  const rim = makeRim();

  /* ---- contact patch ---- */
  const pool = new THREE.PlaneGeometry(2.6, 5.0);
  pool.rotateX(-Math.PI / 2);
  const poolTex = makeContactTexture();

  /* ---- ghost: one welded shell, so there is nothing left to self-sort ---- */
  const ghostShell = mergeParts([
    paint.clone(),
    glass.clone(),
    trim.clone(),
    chrome.clone(),
    tail.clone(),
    head.clone(),
    disc.clone(),
    caliper.clone(),
  ]);
  // Hull from body + glass only: inflating the tiny lamp blocks by 22 mm would
  // turn them inside out, and they contribute nothing to the silhouette.
  const hullSrc = mergeParts([paint.clone(), glass.clone()]);
  const ghostHull = makeHull(hullSrc, 0.022);
  hullSrc.dispose(); // intermediate: never reaches the scene graph
  const ghostWheel = mergeParts([tyre.clone(), rim.clone()]);

  const all = [
    paint,
    glass,
    trim,
    chrome,
    tail,
    head,
    disc,
    caliper,
    tyre,
    rim,
    pool,
    ghostShell,
    ghostHull,
    ghostWheel,
  ];

  return {
    paint,
    glass,
    trim,
    chrome,
    tail,
    head,
    disc,
    caliper,
    tyre,
    rim,
    pool,
    poolTex,
    ghostShell,
    ghostHull,
    ghostWheel,
    dispose: () => {
      for (const g of all) g.dispose();
      poolTex.dispose();
    },
  };
}

/* ----------------------------------------------------------------- the rigs */

export type CarRig = {
  group: THREE.Group;
  /**
   * The four spinners. render() writes `.rotation.x` on each, exactly as
   * before. Type widened from THREE.Mesh[] because these are now bare
   * Object3Ds holding a tyre mesh and a rim mesh.
   */
  wheels: THREE.Object3D[];
  /** Frees every material this rig owns (and the kit, if it made its own). */
  dispose: () => void;
};

export function buildCar(color: number, opacity: number, sharedKit?: CarKit): CarRig {
  const kit = sharedKit ?? createCarKit();
  const ownsKit = sharedKit === undefined;
  const group = new THREE.Group();
  const materials: THREE.Material[] = [];
  const keep = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const base = new THREE.Color(color);

  if (opacity >= 1) {
    /* ============================ HERO ============================ */
    const paintMat = keep(
      new THREE.MeshPhysicalMaterial({
        color: base,
        // Car paint is a DIELECTRIC with a clear lacquer over it, not a metal.
        // At metalness 0.55 the albedo was being tinted by the environment and
        // a vivid amber came out as mud. The gloss comes from the clearcoat.
        metalness: 0.08,
        roughness: 0.38,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.35,
      }),
    );
    const glassMat = keep(
      new THREE.MeshStandardMaterial({
        name: "glass",
        color: 0x080b10,
        metalness: 0.1,
        roughness: 0.05,
        // Insurance: without an env map this stops the glass being a void.
        emissive: 0x0a1420,
        emissiveIntensity: 0.6,
        envMapIntensity: 1.8,
      }),
    );
    const trimMat = keep(
      new THREE.MeshStandardMaterial({
        color: 0x14171b,
        roughness: 0.78,
        metalness: 0.0,
        side: THREE.DoubleSide, // the arch liners are seen from inside
      }),
    );
    const chromeMat = keep(
      new THREE.MeshStandardMaterial({
        color: 0xb8bcc2,
        metalness: 1.0,
        roughness: 0.22,
        side: THREE.DoubleSide, // the exhaust tips are open tubes
      }),
    );
    const tailMat = keep(
      new THREE.MeshStandardMaterial({
        color: 0x2a0406,
        emissive: 0xff2a16,
        emissiveIntensity: 2.4, // raise to ~4.0 under ACES/AgX
        roughness: 0.3,
      }),
    );
    const headMat = keep(
      new THREE.MeshStandardMaterial({
        color: 0x202830,
        emissive: 0xcfe0ff,
        emissiveIntensity: 1.6, // raise to ~2.6 under ACES/AgX
        roughness: 0.2,
      }),
    );
    const tyreMat = keep(
      // Real rubber in daylight is a dark grey, not black. At 0x0c0e11 the
      // tyres disappeared into the shadow under the car and it read as
      // floating rather than standing on four wheels.
      new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.95, metalness: 0.0 }),
    );
    const rimMat = keep(
      new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.95, roughness: 0.28 }),
    );
    const discMat = keep(
      new THREE.MeshStandardMaterial({ color: 0x5c6066, metalness: 0.8, roughness: 0.45 }),
    );
    const calMat = keep(
      new THREE.MeshStandardMaterial({ color: 0xb3261e, metalness: 0.3, roughness: 0.5 }),
    );

    const solid: [THREE.BufferGeometry, THREE.Material][] = [
      [kit.paint, paintMat],
      [kit.glass, glassMat],
      [kit.trim, trimMat],
      [kit.chrome, chromeMat],
      [kit.tail, tailMat],
      [kit.head, headMat],
      [kit.disc, discMat],
      [kit.caliper, calMat],
    ];
    for (const [g, m] of solid) {
      const mesh = new THREE.Mesh(g, m);
      mesh.castShadow = true;
      // New: the car now shades itself. Needs sun.shadow.normalBias -- note 5.
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    // The sun is off to one side, so the real shadow does not sit under the
    // car. Without this the hero floats.
    const poolMat = keep(
      new THREE.MeshBasicMaterial({
        map: kit.poolTex,
        color: 0x000000,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    );
    const pool = new THREE.Mesh(kit.pool, poolMat);
    pool.position.y = 0.038; // above the lane dashes at 0.03
    pool.renderOrder = 0;
    group.add(pool);

    const wheels: THREE.Object3D[] = [];
    for (const [wx, wy, wz] of wheelPositions()) {
      const spinner = new THREE.Object3D();
      spinner.position.set(wx, wy, wz);
      const t = new THREE.Mesh(kit.tyre, tyreMat);
      const r = new THREE.Mesh(kit.rim, rimMat);
      // Mirror INSIDE the spinner, not on a parent, so both sides still turn
      // the same way in world space.
      if (wx < 0) r.rotation.y = Math.PI;
      t.castShadow = true;
      r.castShadow = true;
      spinner.add(t, r);
      group.add(spinner);
      wheels.push(spinner);
    }

    return {
      group,
      wheels,
      dispose: () => {
        for (const m of materials) m.dispose();
        if (ownsKit) kit.dispose();
      },
    };
  }

  /* ============================ GHOST ============================
     Not "the hero at 42% alpha". One welded shell (no per-object transparent
     sorting, so no shimmer), a sheen rim, an inner glow, an additive outline
     hull, no cast shadow, no lamps, no chrome, no red calipers. Same
     silhouette, completely different material language.                     */
  // Keep the ghost's colour close to its real hue. Crushing it to 30% and
  // then adding emissive on top was what made it read as a light source
  // rather than as a car.
  const shellCol = base.clone().multiplyScalar(0.85);
  const glowCol = base.clone().multiplyScalar(0.35);
  const rimCol = base.clone().lerp(new THREE.Color(0xffffff), 0.3);

  const shellMat = keep(
    new THREE.MeshPhysicalMaterial({
      color: shellCol,
      roughness: 0.42,
      metalness: 0.0,
      emissive: glowCol,
      emissiveIntensity: 0.12,
      // A little grazing-angle lift so the silhouette still reads against the
      // road, but nowhere near enough to glow.
      sheen: 0.45,
      sheenColor: rimCol,
      sheenRoughness: 0.4,
      transparent: true,
      opacity: Math.min(0.46, opacity + 0.06),
      // Safe: WebGLRenderer renders opaque -> transmissive -> transparent, so
      // the opaque hero is already in the depth buffer and can never be hidden
      // by a ghost. This is what lets the outline hull work.
      depthWrite: true,
      envMapIntensity: 0.6,
    }),
  );
  // The outline hull: a THIN back-side rim, not a glow. At 0.4 additive over
  // the whole silhouette it swallowed the car's shape and the ghosts stopped
  // looking like the same model as the hero, which is the one thing they must
  // never stop looking like.
  const hullMat = keep(
    new THREE.MeshBasicMaterial({
      color: rimCol,
      transparent: true,
      opacity: 0.1,
      blending: THREE.NormalBlending,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  const wheelMat = keep(
    new THREE.MeshStandardMaterial({
      color: shellCol,
      emissive: glowCol,
      emissiveIntensity: 0.1,
      roughness: 0.6,
      metalness: 0.0,
      transparent: true,
      opacity: Math.min(0.5, opacity + 0.12),
      depthWrite: false,
    }),
  );
  // A ghost casts light instead of shadow.
  const poolMat = keep(
    new THREE.MeshBasicMaterial({
      map: kit.poolTex,
      color: rimCol,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );

  // renderOrder is pinned because painterSortStable sorts on it before depth.
  // Wheels must precede the shell so the shell's depth write does not hide
  // them: you should see a ghost's wheels through its own bodywork.
  const pool = new THREE.Mesh(kit.pool, poolMat);
  pool.position.y = 0.038;
  pool.renderOrder = 0;
  group.add(pool);

  const wheels: THREE.Object3D[] = [];
  for (const [wx, wy, wz] of wheelPositions()) {
    const spinner = new THREE.Object3D();
    spinner.position.set(wx, wy, wz);
    const w = new THREE.Mesh(kit.ghostWheel, wheelMat);
    if (wx < 0) w.rotation.y = Math.PI;
    w.renderOrder = 1;
    spinner.add(w);
    group.add(spinner);
    wheels.push(spinner);
  }

  const shell = new THREE.Mesh(kit.ghostShell, shellMat);
  shell.renderOrder = 2;
  group.add(shell);

  const hull = new THREE.Mesh(kit.ghostHull, hullMat);
  hull.renderOrder = 3;
  group.add(hull);

  // A ghost is a maybe. It must not throw a hard black shadow on the tarmac --
  // that was the most solid-looking thing about the old ones.
  group.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });

  return {
    group,
    wheels,
    dispose: () => {
      for (const m of materials) m.dispose();
      if (ownsKit) kit.dispose();
    },
  };
}