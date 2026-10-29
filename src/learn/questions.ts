import { BRANDS, BRAND_BY_SLUG, CARS, CATEGORY_LABELS, type Car } from "../catalog";
import { isAbsence, isFigure, type Absence, type Figure } from "../catalog/types";
import { MEASURES, type Measure } from "../catalog/compare";
import { CONCEPTS } from "../catalog/concepts";
import { LESSON_LENGTH, POOL_SIZE } from "./config";

export { LESSON_LENGTH, POOL_SIZE };

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
  | "which-idea"
  | "odd-one-out"
  | "which-era"
  | "how-many"
  | "which-engine";

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

/**
 * Which of these is the most/least? The bread and butter.
 *
 * Three or four cars rather than two. A two-way version is a coin toss, and
 * picking the heaviest of four is a genuinely different task from picking the
 * heavier of two: you have to hold the whole field in mind.
 */
export function biggerQuestion(rand: () => number): Question | null {
  const measure = pick(rand, MEASURES);
  const category = pick(rand, ["hypercar", "sports", "everyday", "prototype"] as const);
  const want = rand() < 0.5 ? 3 : 4;

  const pool = CARS.filter((c) => c.category === category && isFigure(c[measure.key]));
  if (pool.length < want) return null;

  const basis = (f: Figure) => {
    const n = (f.note ?? "").toLowerCase();
    if (n.includes("rollout")) return "rollout";
    if (n.includes("km/h")) return "kmh";
    if (n.includes("60 mph")) return "mph";
    return null;
  };

  let cars = shuffle(rand, pool).slice(0, want);

  // A 0-60 question that pits a 0-100 km/h figure against a 0-60 mph one is
  // the exact mistake this site spends a page warning about. Do not set it.
  if (measure.key === "zeroTo60S") {
    const want_basis = basis(cars[0][measure.key] as Figure);
    if (want_basis === null) return null;
    cars = cars.filter((c) => basis(c[measure.key] as Figure) === want_basis);
    if (cars.length < 3) return null;
  }

  const val = (c: Car) => comparable(measure.key, c[measure.key] as Figure);
  const sorted = [...cars].sort((a, b) =>
    measure.lowerIsBetter ? val(a) - val(b) : val(b) - val(a),
  );
  const winner = sorted[0];
  const runnerUp = sorted[1];

  // The winner has to be clear of the field, or this is a coin toss with
  // more options.
  const gap = Math.abs(val(winner) - val(runnerUp)) / Math.max(val(winner), val(runnerUp));
  if (gap < 0.08) return null;

  const word = measure.lowerIsBetter
    ? measure.key === "weightKg"
      ? "is the lightest"
      : "is the quickest to 60"
    : measure.key === "topSpeedMph"
      ? "goes the fastest"
      : `makes the most ${measure.label.toLowerCase()}`;

  return {
    id: `bigger:${measure.key}:${cars.map((c) => c.slug).sort().join("+")}`,
    kind: "bigger",
    prompt: `Which ${word}?`,
    choices: shuffle(
      rand,
      cars.map((c) => ({ id: c.slug, label: carLabel(c), sub: c.years })),
    ),
    answer: winner.slug,
    explain: sorted
      .map((c) => `${carLabel(c)}: ${fmt(measure.key, c[measure.key] as Figure)}`)
      .join(". ") + ".",
    link: { href: `/cars/${winner.slug}`, label: `Read about the ${winner.name}` },
  };
}

/**
 * Who produced this figure -- or did nobody?
 *
 * This was a two-way question, which made it a coin toss: showing a learner
 * "215 hp" and asking maker-or-magazine is guessable at 50% and rewards it.
 * It now withholds the number and offers a third real answer, drawn from the
 * figures nobody has published at all. You have to know the car.
 */
export function whoseFigureQuestion(rand: () => number): Question | null {
  const measure = pick(rand, MEASURES);

  const published = CARS.filter((c) => isFigure(c[measure.key]));
  const missing = CARS.filter((c) => {
    const f = c[measure.key];
    return isAbsence(f) && f.absent === "unpublished";
  });

  // Draw from the unpublished side about a third of the time, where there is
  // one, so "nobody has published one" is a live answer rather than scenery.
  const useMissing = missing.length > 0 && rand() < 0.34;
  const pool = useMissing ? missing : published;
  if (pool.length === 0) return null;
  const car = pick(rand, pool);
  const f = car[measure.key] as Figure | Absence;

  const answer = isAbsence(f) ? "none" : f.source;

  return {
    id: `whose:${measure.key}:${car.slug}`,
    kind: "whose-figure",
    prompt: `Who produced this car's ${measure.label.toLowerCase()} figure?`,
    context: `${carLabel(car)}, ${car.years}`,
    choices: shuffle(rand, [
      { id: "manufacturer", label: "The company that built it published it" },
      { id: "independent", label: "Somebody else measured it" },
      { id: "none", label: "Nobody has published one" },
    ]),
    answer,
    explain: isAbsence(f)
      ? `There is no figure. ${f.why}`
      : f.source === "manufacturer"
        ? `${fmt(measure.key, f)}, the maker's own figure \u2014 produced in good conditions and usually a best case.${f.note ? ` It notes: ${f.note}.` : ""}`
        : `${fmt(measure.key, f)}, an independent test \u2014 normally a little slower than a maker's claim, being measured on an ordinary surface with a full tank.${f.note ? ` It notes: ${f.note}.` : ""}`,
    link: isAbsence(f)
      ? { href: "/concepts/why-a-blank-is-not-always-a-gap", label: "Reading a blank" }
      : {
          href: "/concepts/makers-figures-and-tests",
          label: "A maker's figure and a measured one",
        },
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

/**
 * Three of these have something in common. Which one does not?
 *
 * A different task from picking the biggest: instead of reading one number
 * off four cars, you have to work out what the set is before you can answer.
 */
export function oddOneOutQuestion(rand: () => number): Question | null {
  const byBrand = rand() < 0.5;

  if (byBrand) {
    const brands = BRANDS.filter((b) => CARS.filter((c) => c.brand === b.slug).length >= 3);
    if (brands.length === 0) return null;
    const brand = pick(rand, brands);
    const theirs = shuffle(rand, CARS.filter((c) => c.brand === brand.slug)).slice(0, 3);
    const others = CARS.filter((c) => c.brand !== brand.slug);
    if (others.length === 0) return null;
    const odd = pick(rand, others);
    const oddBrand = BRAND_BY_SLUG[odd.brand];

    return {
      id: `odd:brand:${[...theirs.map((c) => c.slug), odd.slug].sort().join("+")}`,
      kind: "odd-one-out",
      prompt: "Three of these were built by the same company. Which is the odd one out?",
      choices: shuffle(
        rand,
        [...theirs, odd].map((c) => ({ id: c.slug, label: c.name, sub: c.years })),
      ),
      answer: odd.slug,
      explain: `${theirs.map((c) => c.name).join(", ")} are all ${brand.name}. The ${odd.name} is ${oddBrand?.name ?? odd.brand}.`,
      link: { href: `/brands/${brand.slug}`, label: `Everything by ${brand.name}` },
    };
  }

  const cats = ["hypercar", "sports", "everyday", "prototype"] as const;
  const cat = pick(rand, cats);
  const inCat = CARS.filter((c) => c.category === cat);
  const outCat = CARS.filter((c) => c.category !== cat);
  if (inCat.length < 3 || outCat.length === 0) return null;
  const theirs = shuffle(rand, inCat).slice(0, 3);
  const odd = pick(rand, outCat);

  return {
    id: `odd:cat:${[...theirs.map((c) => c.slug), odd.slug].sort().join("+")}`,
    kind: "odd-one-out",
    prompt: `Three of these are in the same class. Which is the odd one out?`,
    choices: shuffle(
      rand,
      [...theirs, odd].map((c) => ({ id: c.slug, label: carLabel(c), sub: c.years })),
    ),
    answer: odd.slug,
    explain: `${theirs.map((c) => c.name).join(", ")} are all ${CATEGORY_LABELS[cat].toLowerCase()}. The ${odd.name} is ${CATEGORY_LABELS[odd.category].toLowerCase()}.`,
    link: { href: `/cars?category=${cat}`, label: `See the ${CATEGORY_LABELS[cat].toLowerCase()}` },
  };
}

/** When was it built? */
export function whichEraQuestion(rand: () => number): Question | null {
  const car = pick(rand, CARS);
  const others = shuffle(rand, CARS.filter((c) => c.years !== car.years));
  const distinct: string[] = [];
  for (const o of others) {
    if (distinct.length === 3) break;
    if (!distinct.includes(o.years)) distinct.push(o.years);
  }
  if (distinct.length < 3) return null;

  return {
    id: `era:${car.slug}`,
    kind: "which-era",
    prompt: `When was the ${car.name} built?`,
    context: carLabel(car),
    choices: shuffle(rand, [car.years, ...distinct]).map((y) => ({ id: y, label: y })),
    answer: car.years,
    explain: `${carLabel(car)}, ${car.years}. ${car.blurb}`,
    link: { href: `/cars/${car.slug}`, label: `Read about the ${car.name}` },
  };
}

/** How many were made? Only where the catalogue actually knows. */
export function howManyQuestion(rand: () => number): Question | null {
  const known = CARS.filter((c) => c.produced !== null);
  if (known.length < 4) return null;
  const car = pick(rand, known);
  const right = car.produced!.count;

  // Distractors are other real production runs from the catalogue, so every
  // option on screen is a number somebody actually built to.
  const pool = known
    .map((c) => c.produced!.count)
    .filter((n) => n !== right);
  const distinct: number[] = [];
  for (const n of shuffle(rand, pool)) {
    if (distinct.length === 3) break;
    if (!distinct.includes(n)) distinct.push(n);
  }
  if (distinct.length < 3) return null;

  return {
    id: `made:${car.slug}`,
    kind: "how-many",
    prompt: `How many ${car.name} were built?`,
    context: carLabel(car) + ", " + car.years,
    choices: shuffle(rand, [right, ...distinct]).map((n) => ({
      id: String(n),
      label: n.toLocaleString("en-GB"),
    })),
    answer: String(right),
    explain: `${right.toLocaleString("en-GB")}.${car.produced!.note ? ` ${car.produced!.note}.` : ""} Every other number offered is a real production run from somewhere else in the catalogue.`,
    link: { href: `/cars/${car.slug}`, label: `Read about the ${car.name}` },
  };
}

/** Which car has this engine? */
export function whichEngineQuestion(rand: () => number): Question | null {
  const car = pick(rand, CARS);
  // Only ask where the engine description is unique, or the question has more
  // than one right answer.
  if (CARS.filter((c) => c.engine === car.engine).length > 1) return null;

  const others = shuffle(rand, CARS.filter((c) => c.slug !== car.slug && c.name !== car.name)).slice(
    0,
    3,
  );
  if (others.length < 3) return null;

  return {
    id: `engine:${car.slug}`,
    kind: "which-engine",
    prompt: "Which car has this engine?",
    context: car.engine,
    choices: shuffle(
      rand,
      [car, ...others].map((c) => ({ id: c.slug, label: carLabel(c), sub: c.years })),
    ),
    answer: car.slug,
    explain: `The ${car.name}: ${car.engine}. ${car.layout}.`,
    link: { href: `/cars/${car.slug}`, label: `Read about the ${car.name}` },
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
    blurb:
      "Who built what, when it was made, how many exist, and which of four cars is the heaviest, quickest or most powerful.",
    generators: [
      biggerQuestion,
      whichMakerQuestion,
      oddOneOutQuestion,
      whichEraQuestion,
      howManyQuestion,
      whichEngineQuestion,
    ],
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
      oddOneOutQuestion,
      whichEraQuestion,
      howManyQuestion,
      whichEngineQuestion,
    ],
  },
];

export const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u]));



/**
 * Build one lesson, or a pool to choose one from.
 *
 * Generators are allowed to decline a draw -- the data is not uniform, and
 * forcing a question out of thin data is how you get "which of these two
 * cars with a 1 hp difference is more powerful". But declining has a cost
 * that is easy to miss.
 *
 * This loop used to advance the generator on every ATTEMPT, which quietly
 * starved the harder ones. `biggerQuestion` needs three or four cars in one
 * category that all published the same measure, so it declines well over half
 * its draws; the easier generators filled the pool before it got going. The
 * result was one comparison question in a pool of twenty-eight, never inside
 * the first eight, so a new learner never saw one at all. Nothing failed. The
 * lesson just quietly lost a whole kind of question.
 *
 * Now each slot belongs to a generator in rotation, and that generator gets
 * several goes at filling it before the next one is asked, so the mix comes
 * out roughly even whatever the individual success rates are.
 */
const TRIES_PER_SLOT = 10;

export function buildLesson(unitId: UnitId, seed: number, length = LESSON_LENGTH): Question[] {
  const unit = UNIT_BY_ID[unitId];
  if (!unit) return [];
  const rand = rng(seed);
  const out: Question[] = [];
  const seen = new Set<string>();

  for (let slot = 0; slot < length; slot++) {
    let placed = false;
    // Start at this slot's generator, then fall through the others, so a
    // generator that genuinely cannot draw anything does not stall the lesson.
    for (let k = 0; k < unit.generators.length && !placed; k++) {
      const gen = unit.generators[(slot + k) % unit.generators.length];
      for (let t = 0; t < TRIES_PER_SLOT && !placed; t++) {
        const q = gen(rand);
        if (!q || seen.has(q.id)) continue;
        seen.add(q.id);
        out.push(q);
        placed = true;
      }
    }
    if (!placed) break;
  }
  return out;
}

/**
 * A larger set to choose a lesson from.
 *
 * The server cannot know what a given learner keeps getting wrong -- that
 * lives in their browser and never leaves it -- so it cannot pick the lesson.
 * Instead it sends a pool and the client chooses from it against its own
 * history. A pool of POOL_SIZE is enough for the spacing to have something to
 * work with while staying small on the wire: a question is a prompt, a few
 * short choices and a sentence of explanation.
 */


export function buildPool(unitId: UnitId, seed: number, size = POOL_SIZE): Question[] {
  return buildLesson(unitId, seed, size);
}
