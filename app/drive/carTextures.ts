import * as THREE from "three";

/**
 * Procedurally generated maps for the car.
 *
 * This project ships no binary assets -- no downloaded images, no HDRIs, no
 * models -- so every texture here is DRAWN at runtime into a 2D canvas and
 * handed to three.js as a CanvasTexture. That is not a compromise: a tread
 * pattern or a noise field is cheaper to describe in code than to store as a
 * PNG, and it costs one canvas each at startup.
 *
 * Why bother at all: a surface with a single roughness value over its whole
 * area is one of the strongest "this is CG" cues there is. Real paint has
 * orange peel, real rubber has a tread and moulding seams, real brake discs
 * have a turned face. None of that needs to be legible -- it needs to break up
 * the perfect, uniform highlight.
 *
 * Every map is built once and shared by all three cars (see CarKit).
 */

/**
 * Deterministic noise source. Math.random would make every reload render a
 * slightly different car, which makes before/after screenshots useless for
 * judging a change. A tiny LCG gives the same grain every time.
 */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (!g) throw new Error("carTextures: no 2d context");
  return [c, g];
}

function finish(c: HTMLCanvasElement, repeatX: number, repeatY: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  // These are all roughness/bump data, not colour. Tagging them sRGB would
  // push every value through the transfer function and wash the effect out.
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * Orange peel. Real paint is sprayed, and it dries with a fine ripple that you
 * only notice in a reflection -- which is exactly where it matters, because a
 * mirror-flat clearcoat is what makes rendered paint look like plastic.
 *
 * Fed to clearcoatRoughnessMap, so it perturbs the gloss coat only and leaves
 * the colour alone. The contrast is deliberately tiny: values stay inside
 * roughly 0.75-1.0 of the material's clearcoatRoughness, which at this scale
 * is a shimmer rather than a texture.
 */
export function makeOrangePeelMap(): THREE.CanvasTexture {
  const size = 256;
  const [c, g] = canvas(size);
  const rand = rng(0x51ce);
  const img = g.createImageData(size, size);

  // Two octaves of value noise, bilinearly sampled. Coarse sets the lazy
  // undulation, fine sets the grain.
  const field = (cells: number, seed: number) => {
    const r = rng(seed);
    const grid: number[] = [];
    for (let i = 0; i < cells * cells; i++) grid.push(r());
    return (x: number, y: number) => {
      const fx = (x / size) * cells;
      const fy = (y / size) * cells;
      const x0 = Math.floor(fx) % cells;
      const y0 = Math.floor(fy) % cells;
      const x1 = (x0 + 1) % cells;
      const y1 = (y0 + 1) % cells;
      let tx = fx - Math.floor(fx);
      let ty = fy - Math.floor(fy);
      tx = tx * tx * (3 - 2 * tx);
      ty = ty * ty * (3 - 2 * ty);
      const a = grid[y0 * cells + x0] + (grid[y0 * cells + x1] - grid[y0 * cells + x0]) * tx;
      const b = grid[y1 * cells + x0] + (grid[y1 * cells + x1] - grid[y1 * cells + x0]) * tx;
      return a + (b - a) * ty;
    };
  };
  const coarse = field(8, 0x1234);
  const fine = field(32, 0x9abc);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = coarse(x, y) * 0.6 + fine(x, y) * 0.3 + rand() * 0.1;
      // 192-255: the clearcoat never gets rougher than it was, only smoother
      // in patches, so the paint cannot go dull.
      const v = 192 + n * 63;
      const i = (y * size + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return finish(c, 3, 2);
}

/**
 * Tyre tread and sidewall.
 *
 * The tyre is a LatheGeometry, so u runs around the circumference and v runs
 * across the profile from one bead to the other. That makes the layout easy:
 * v in the middle band is tread and gets grooves, v at either end is sidewall
 * and gets a faint concentric relief, and the two shoulders get the blocks
 * that catch the light along the edge of a real tyre.
 *
 * Returned as a bumpMap rather than a normalMap on purpose: a bump map needs
 * no tangents, and LatheGeometry does not generate any.
 */
export function makeTyreTreadMap(): THREE.CanvasTexture {
  const size = 256;
  const [c, g] = canvas(size);

  // Mid grey is "no displacement"; lighter stands proud, darker is a groove.
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);

  const TREAD0 = 0.3 * size; // where the tread band starts across the profile
  const TREAD1 = 0.7 * size;

  // Sidewall: shallow concentric bands, plus the ridge a real tyre carries
  // around its widest point.
  for (const [a, b] of [
    [0, TREAD0],
    [TREAD1, size],
  ] as const) {
    for (let y = a; y < b; y++) {
      const t = (y - a) / (b - a);
      const ridge = Math.sin(t * Math.PI * 7) * 5;
      g.fillStyle = `rgb(${128 + ridge | 0},${128 + ridge | 0},${128 + ridge | 0})`;
      g.fillRect(0, y, size, 1);
    }
  }

  // Tread: four circumferential grooves, then angled lateral slots between
  // them. Four is what most performance tyres run, and at any distance where
  // you can count them it reads immediately as rubber.
  g.fillStyle = "#4a4a4a";
  const GROOVES = 4;
  for (let k = 0; k < GROOVES; k++) {
    const y = TREAD0 + ((k + 0.5) * (TREAD1 - TREAD0)) / GROOVES;
    g.fillRect(0, y - 4, size, 8);
  }

  // Lateral slots, angled so the tread has a direction like a real one.
  g.strokeStyle = "#5a5a5a";
  g.lineWidth = 5;
  const SLOTS = 26;
  for (let k = 0; k < SLOTS; k++) {
    const x = (k * size) / SLOTS;
    g.beginPath();
    g.moveTo(x, TREAD0);
    g.lineTo(x + 18, TREAD1);
    g.stroke();
  }

  // Shoulder blocks: the chunky edge pattern, which is the part actually
  // visible from outside the car rather than from underneath it.
  g.fillStyle = "#9a9a9a";
  for (let k = 0; k < SLOTS; k++) {
    const x = (k * size) / SLOTS + 3;
    g.fillRect(x, TREAD0 - 14, 9, 12);
    g.fillRect(x + 4, TREAD1 + 2, 9, 12);
  }

  // One texture repeat is one revolution's worth of pattern; repeating it
  // around keeps the blocks a believable size against a 0.66 m tyre.
  return finish(c, 7, 1);
}

/**
 * Turned finish for the brake disc, and the drilling a performance disc has.
 * Applied as a bumpMap, so the face catches light in rings instead of reading
 * as a flat grey coin through the spokes.
 */
export function makeDiscMap(): THREE.CanvasTexture {
  const size = 256;
  const [c, g] = canvas(size);
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);

  // The disc is a CylinderGeometry cap: u runs around, v runs across. Fine
  // circumferential lines are the machining marks.
  for (let y = 0; y < size; y += 2) {
    const v = 128 + (y % 4 === 0 ? 7 : -7);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, y, size, 1);
  }
  // Cross-drilled holes, in two staggered rows.
  g.fillStyle = "#3c3c3c";
  for (let k = 0; k < 10; k++) {
    const x = (k * size) / 10 + 6;
    g.beginPath();
    g.arc(x, size * 0.38, 7, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(x + size / 20, size * 0.62, 7, 0, Math.PI * 2);
    g.fill();
  }
  return finish(c, 1, 1);
}

/** Everything above, built once. */
export type CarTextures = {
  orangePeel: THREE.CanvasTexture;
  tread: THREE.CanvasTexture;
  disc: THREE.CanvasTexture;
  dispose: () => void;
};

export function createCarTextures(): CarTextures {
  const orangePeel = makeOrangePeelMap();
  const tread = makeTyreTreadMap();
  const disc = makeDiscMap();
  return {
    orangePeel,
    tread,
    disc,
    dispose: () => {
      orangePeel.dispose();
      tread.dispose();
      disc.dispose();
    },
  };
}
