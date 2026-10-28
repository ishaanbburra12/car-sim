import { BRANDS, BRAND_BY_SLUG, CARS, type Car } from "../catalog";
import { isAbsence, isFigure, type Absence, type Figure } from "../catalog/types";
import { MEASURES, type Measure } from "../catalog/compare";
import { CONCEPTS } from "../catalog/concepts";

// ---------------------------------------------------------------------------
// Questions, generated from the catalogue rather than written by hand.
//
// A hand-written question bank goes stale the moment a figure is corrected,
// and this catalogue corrects figures constantly -- nine 0-60 times turned out
// to be wrong in a single session. A question asserting the old number would
// then be teaching something the rest of the site contradicts, and nothing
// would catch it.
//
// So every question here is derived from the data at build time. If a figure
// changes, the question changes with it. If a figure is removed, questions
// about it stop being generated. The answer to every question is, by
// construction, whatever the sourced data says.
//
// The explanations matter more than the questions. Getting one wrong and
// being told "no" teaches nothing; being told what the two figures actually
// are, and which kind of figure each is, teaches the thing the site is for.
// ---------------------------------------------------------------------------

export type Choice = { id: string; label: string; sub?: string };

export type QuestionKind =
  | "bigger"
  | "whose-figure"
  | "which-sprint"
  | "reading-a-blank"
  | "which-maker"
  | "which-idea";

export type Question = {
  id: string;
  kind: QuestionKind;
  prompt: string;
  /** Smaller line under the prompt, for the figure being asked about. */
  context?: string;
  choices: Choice[];
  /** The id of the correct choice. */
  answer: string;
  /** Shown after answering, right or wrong. This is the teaching. */
  explain: string;
  /** Somewhere to go and read more. */
  link?: { href: string; label: string };
};

/* ------------------------------------------------------------------ random */

/** mulberry32: small, fast, and the same sequence for the same seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 61), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rand: () => number, xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];

function shuffle<T>(rand: () => number, xs: readonly T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ----------------------------------------------------------------- display */

const SPEC = Object.fromEntries(MEASURES.map((m) => [m.key, m])) as Record<
  Measure,
  (typeof MEASURES)[number]
>;

function fmt(measure: Measure, f: Figure): string {
  const m = SPEC[measure];
  const n = (v: number) =>
    v.toLocaleString("en-GB", {
      minimumFractionDigits: m.decimals,
      maximumFractionDigits: m.decimals,
    });
  const body = f.high !== undefined ? `${n(f.value)}-${n(f.high)}` : n(f.value);
  return `${body} ${m.unit}`;
}

/** The end of a range that flatters least, matching how the charts rank. */
function comparable(measure: Measure, f: Figure): number {
  return SPEC[measure].lowerIsBetter ? (f.high ?? f.value) : f.value;
}

const carLabel = (c: Car) => `${BRAND_BY_SLUG[c.brand]?.name ?? c.brand} ${c.name}`;
const sourceWords = (f: Figure) =>
  f.source === "manufacturer" ? "the maker's own figure" : "an independent test";

/* --------------------------------------------------------------- generators
 *
 * Each returns a Question or null. Null means "this draw did not produce a
 * good question", which is normal: the data is not uniform, and forcing a
 * question out of thin data is how you end up asking which of two cars with
 * a 1 hp difference is more powerful.
 */

/** Which of these two is more/less? The bread and butter. */
export function biggerQuestion(rand: () => number): Question | null {
  const measure = pick(rand, MEASURES);
  const category = pick(rand, ["hypercar", "sports", "everyday", "prototype"] as const);

  const pool = CARS.filter((c) => c.category === category && isFigure(c[measure.key]));
  if (pool.length < 2) return null;

  const [a, b] = shuffle(rand, pool).slice(0, 2);
  const fa = a[measure.key] as Figure;
  const fb = b[measure.key] as Figure;

  // A 0-60 question that pits a 0-100 km/h figure against a 0-60 mph one is
  // the exact mistake this site spends a page warning about. Do not set it.
  if (measure.key === "zeroTo60S") {
    const basis = (f: Figure) => {
      const n = (f.note ?? "").toLowerCase();
      if (n.includes("rollout")) return "rollout";
      if (n.includes("km/h")) return "kmh";
      if (n.includes("60 mph")) return "mph";
      return null;
    };
    if (basis(fa) === null || basis(fa) !== basis(fb)) return null;
  }

  const va = comparable(measure.key, fa);
  const vb = comparable(measure.key, fb);
  // Needs a gap worth asking about. A 2% difference is a coin toss dressed up.
  const gap = Math.abs(va - vb) / Math.max(va, vb);
  if (gap < 0.08) return null;

  const better = measure.lowerIsBetter ? (va < vb ? a : b) : va > vb ? a : b;
  const word = measure.lowerIsBetter
    ? measure.key === "weightKg"
      ? "is lighter"
      : "is quicker to 60"
    : measure.key === "topSpeedMph"
      ? "goes faster"
      : `makes more ${measure.label.toLowerCase()}`;

  return {
    id: `bigger:${measure.key}:${a.slug}:${b.slug}`,
    kind: "bigger",
    prompt: `Which ${word}?`,
    choices: shuffle(rand, [
      { id: a.slug, label: carLabel(a), sub: a.years },
      { id: b.slug, label: carLabel(b), sub: b.years },
    ]),
    answer: better.slug,
    explain:
      `${carLabel(a)}: ${fmt(measure.key, fa)} (${sourceWords(fa)}). ` +
      `${carLabel(b)}: ${fmt(measure.key, fb)} (${sourceWords(fb)}).`,
    link: { href: `/cars/${better.slug}`, label: `Read about the ${better.name}` },
  };
}

/** Did the company print this number, or did somebody else measure it? */
export function whoseFigureQuestion(rand: () => number): Question | null {
  const measure = pick(rand, MEASURES);
  const pool = CARS.filter((c) => isFigure(c[measure.key]));
  if (pool.length === 0) return null;
  const car = pick(rand, pool);
  const f = car[measure.key] as Figure;

  return {
    id: `whose:${measure.key}:${car.slug}`,
    kind: "whose-figure",
    prompt: `Where does this number come from?`,
    context: `${carLabel(car)} — ${measure.label.toLowerCase()}, ${fmt(measure.key, f)}`,
    choices: shuffle(rand, [
      { id: "manufacturer", label: "The company that built it published it" },
      { id: "independent", label: "Somebody else measured it" },
    ]),
    answer: f.source,
    explain:
      f.source === "manufacturer"
        ? `A maker's figure. It is produced in good conditions and is usually a best case.${f.note ? ` This one notes: ${f.note}.` : ""}`
        : `An independent test. Normally a little slower than a maker's claim, because it is measured on an ordinary surface with a full tank.${f.note ? ` This one notes: ${f.note}.` : ""}`,
    link: { href: "/concepts/makers-figures-and-tests", label: "A maker's figure and a measured one" },
  };
}

/** Which sprint is this acceleration figure actually measuring? */
export function whichSprintQuestion(rand: () => number): Question | null {
  const pool = CARS.filter((c) => {
    const f = c.zeroTo60S;
    if (!isFigure(f)) return false;
    const n = (f.note ?? "").toLowerCase();
    return n.includes("km/h") || n.includes("60 mph") || n.includes("rollout");
  });
  if (pool.length === 0) return null;
  const car = pick(rand, pool);
  const f = car.zeroTo60S as Figure;
  const n = (f.note ?? "").toLowerCase();
  const answer = n.includes("rollout") ? "rollout" : n.includes("km/h") ? "kmh" : "mph";

  return {
    id: `sprint:${car.slug}`,
    kind: "which-sprint",
    prompt: "What was actually measured?",
    context: `${carLabel(car)} — ${fmt("zeroTo60S", f)}`,
    choices: shuffle(rand, [
      { id: "mph", label: "0-60 mph", sub: "the US convention" },
      { id: "kmh", label: "0-100 km/h", sub: "62 mph, the European convention" },
      { id: "rollout", label: "0-60 mph with a rollout", sub: "the first foot does not count" },
    ]),
    answer,
    explain: `${f.note}. The three are a tenth to three tenths apart, which is enough to reorder a chart.`,
    link: { href: "/concepts/measured-to-what-speed", label: "0-60 mph, 0-100 km/h, and rollout" },
  };
}

const ABSENCE_LABELS: Record<Absence["absent"], { label: string; sub: string }> = {
  unpublished: { label: "Nobody has published it", sub: "the people who would know have not said" },
  varies: { label: "There is no single figure", sub: "trim, market or a rulebook moves it" },
  disputed: { label: "The sources disagree", sub: "published figures contradict each other" },
};

/** A blank in the table: whose gap is it, and why? */
export function readingABlankQuestion(rand: () => number): Question | null {
  const options: { car: Car; measure: Measure; a: Absence }[] = [];
  for (const car of CARS) {
    for (const m of MEASURES) {
      const f = car[m.key];
      if (isAbsence(f)) options.push({ car, measure: m.key, a: f });
    }
  }
  if (options.length === 0) return null;
  const { car, measure, a } = pick(rand, options);

  return {
    id: `blank:${car.slug}:${measure}`,
    kind: "reading-a-blank",
    prompt: "This figure is missing. Why?",
    context: `${carLabel(car)} — ${SPEC[measure].label.toLowerCase()}`,
    choices: shuffle(
      rand,
      (Object.keys(ABSENCE_LABELS) as Absence["absent"][]).map((k) => ({
        id: k,
        ...ABSENCE_LABELS[k],
      })),
    ),
    answer: a.absent,
    explain: a.why,
    link: { href: `/cars/${car.slug}`, label: `See the ${car.name}'s figures` },
  };
}

/** Who built it? */
export function whichMakerQuestion(rand: () => number): Question | null {
  const car = pick(rand, CARS);
  const right = BRAND_BY_SLUG[car.brand];
  if (!right) return null;
  const others = shuffle(
    rand,
    BRANDS.filter((b) => b.slug !== car.brand),
  ).slice(0, 3);
  if (others.length < 3) return null;

  return {
    id: `maker:${car.slug}`,
    kind: "which-maker",
    prompt: `Who built the ${car.name}?`,
    context: car.years,
    choices: shuffle(rand, [right, ...others]).map((b) => ({ id: b.slug, label: b.name })),
    answer: right.slug,
    explain: `${right.name}, of ${right.country}, founded ${right.founded}. ${car.blurb}`,
    link: { href: `/brands/${right.slug}`, label: `More from ${right.name}` },
  };
}

/** Name the idea from a description of it. */
export function whichIdeaQuestion(rand: () => number): Question | null {
  if (CONCEPTS.length < 4) return null;
  const concept = pick(rand, CONCEPTS);
  const example = pick(rand, concept.examples);
  const others = shuffle(
    rand,
    CONCEPTS.filter((c) => c.slug !== concept.slug),
  ).slice(0, 3);

  return {
    id: `idea:${concept.slug}:${example.car}`,
    kind: "which-idea",
    prompt: "Which idea is this an example of?",
    context: example.why,
    choices: shuffle(rand, [concept, ...others]).map((c) => ({ id: c.slug, label: c.term })),
    answer: concept.slug,
    explain: concept.short,
    link: { href: `/concepts/${concept.slug}`, label: `Read: ${concept.term}` },
  };
}

/* -------------------------------------------------------------------- units */

export type UnitId = "numbers" | "cars" | "ideas" | "mixed";

type Generator = (rand: () => number) => Question | null;

export const UNITS: {
  id: UnitId;
  title: string;
  blurb: string;
  generators: Generator[];
}[] = [
  {
    id: "numbers",
    title: "Reading the numbers",
    blurb:
      "Where a figure came from, which sprint it measures, and what a blank in the table is telling you.",
    generators: [whoseFigureQuestion, whichSprintQuestion, readingABlankQuestion],
  },
  {
    id: "cars",
    title: "Knowing the cars",
    blurb: "Who built what, and which of two cars is the heavier, quicker or more powerful.",
    generators: [biggerQuestion, whichMakerQuestion],
  },
  {
    id: "ideas",
    title: "The ideas",
    blurb:
      "Balance of Performance, published bounds, kerb against dry weight, and the rest of the ideas behind the figures.",
    generators: [whichIdeaQuestion, readingABlankQuestion],
  },
  {
    id: "mixed",
    title: "Everything",
    blurb: "A mixed set drawn from all of the above.",
    generators: [
      biggerQuestion,
      whoseFigureQuestion,
      whichSprintQuestion,
      readingABlankQuestion,
      whichMakerQuestion,
      whichIdeaQuestion,
    ],
  },
];

export const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u]));

export const LESSON_LENGTH = 8;

/**
 * Build one lesson.
 *
 * Generators are allowed to decline a draw, so this keeps asking until it has
 * enough, with a hard attempt limit so a thin unit cannot spin forever. It
 * also refuses to repeat a question inside one lesson, which matters more
 * than it sounds: the same two cars coming round twice makes the whole thing
 * feel broken even when the second one is a different measure.
 */
export function buildLesson(unitId: UnitId, seed: number, length = LESSON_LENGTH): Question[] {
  const unit = UNIT_BY_ID[unitId];
  if (!unit) return [];
  const rand = rng(seed);
  const out: Question[] = [];
  const seen = new Set<string>();

  for (let attempt = 0; attempt < length * 60 && out.length < length; attempt++) {
    const gen = unit.generators[attempt % unit.generators.length];
    const q = gen(rand);
    if (!q || seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
  }
  return out;
}
