import { CARS } from "./index";
import { isAbsence, isFigure, type Car, type Figure } from "./types";

// ---------------------------------------------------------------------------
// Where does this car sit among its own kind?
//
// A bar showing "700 hp" on its own teaches nothing: the reader has no idea
// whether that is a lot. The useful thing is context, so every figure here is
// placed against the other cars IN THE SAME CATEGORY. Comparing a Corolla with
// a Le Mans prototype would be a category error dressed up as a chart.
//
// Two rules keep this honest:
//
//   - Only cars that actually have the figure are counted. A rank of "3rd of
//     10" when only four of the ten published a weight would be a lie.
//   - A measure needs at least MIN_PEERS cars to compare against, or it is
//     left out altogether. "2nd of 2" is not information.
// ---------------------------------------------------------------------------

const MIN_PEERS = 3;

/**
 * Which sprint a 0-60 figure actually is.
 *
 * Europe mostly publishes 0-100 km/h, which is 62 mph; the United States
 * publishes 0-60 mph; and a drag-strip number may have a one-foot rollout
 * subtracted. At these speeds the three differ by one to three tenths, so a
 * row that mixes them is not quite ranking one thing.
 *
 * Read from the note rather than a field of its own, which is only safe
 * because a test forbids a 0-60 figure whose note does not say which it is.
 */
export type Basis = "0-60 mph" | "0-100 km/h" | "rollout-adjusted";

export function basisOf(f: Figure): Basis | null {
  const n = (f.note ?? "").toLowerCase();
  if (n.includes("rollout")) return "rollout-adjusted";
  if (n.includes("km/h")) return "0-100 km/h";
  if (n.includes("60 mph")) return "0-60 mph";
  return null;
}

/**
 * How far clear of the next car the top figure has to be before the axis is
 * clipped at the runner-up instead. 1.4 is a judgement call, not a law: low
 * enough to catch the cases that actually flatten a chart, high enough that an
 * ordinary spread of fast cars is left alone.
 */
const OUTLIER_RATIO = 1.4;

export type Measure = "powerHp" | "torqueLbFt" | "weightKg" | "zeroTo60S" | "topSpeedMph";

type MeasureSpec = {
  key: Measure;
  label: string;
  unit: string;
  decimals: number;
  /** True where a smaller number is the better one: weight, and 0-60 time. */
  lowerIsBetter: boolean;
};

export const MEASURES: MeasureSpec[] = [
  { key: "powerHp", label: "Power", unit: "hp", decimals: 0, lowerIsBetter: false },
  { key: "torqueLbFt", label: "Torque", unit: "lb-ft", decimals: 0, lowerIsBetter: false },
  { key: "weightKg", label: "Weight", unit: "kg", decimals: 0, lowerIsBetter: true },
  { key: "zeroTo60S", label: "0-60 mph", unit: "s", decimals: 1, lowerIsBetter: true },
  { key: "topSpeedMph", label: "Top speed", unit: "mph", decimals: 0, lowerIsBetter: false },
];

export type Comparison = MeasureSpec & {
  value: number;
  /** Smallest and largest among the peers, which set the track's extent. */
  min: number;
  max: number;
  median: number;
  /** 1 is the best of its kind by this measure, taking lowerIsBetter into account. */
  rank: number;
  /** How many cars in this category published this figure, this one included. */
  of: number;
  /** Fraction along the track, 0 at min and 1 at max. */
  fraction: number;
  /** Where the median sits on the same track, for the context tick. */
  medianFraction: number;
  /**
   * The top of the bar chart's track. Normally the category's highest figure,
   * but when one car is far clear of the rest the track stops at the SECOND
   * highest instead, and anything beyond runs off the end.
   *
   * Without this, one extreme value flattens everybody else. The live case is
   * the everyday rows: a pickup's 400 lb-ft against a next-highest of 186
   * means scaling to the maximum pushes every hatchback into the left third of
   * the track, where none of them can be told apart. Clipping the axis and
   * marking what ran off it is the standard answer, and it stays honest only
   * as long as the running-off is visible, which is what `overScale` is for.
   *
   * This comment named hypercar torque until the Regera was added at 1,475
   * lb-ft and the gap to the Nevera's 1,741 stopped qualifying. Which rows
   * clip is a property of the data and moves as cars are added, so the example
   * above is an illustration, not a fixture — the tests use their own pools.
   */
  scaleMax: number;
  /** True when this car's own figure is past the end of the track. */
  overScale: boolean;
  /**
   * True when the cars being ranked did not all publish the same KIND of
   * figure — some a maker's claim, some an independent test. A manufacturer's
   * 0-60 and a magazine's are not the same measurement, so a ranking across
   * both is a little softer than it looks and the page should say so.
   */
  mixedSources: boolean;
  /**
   * The distinct measurement bases among the peers in this row, where the
   * measure has one. More than one means the ranking spans 0-60 mph and
   * 0-100 km/h figures, which are not the same sprint.
   */
  bases: string[];
};

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Build one comparison per measure this car has a figure for, against the other
 * cars in its category. Measures with too few peers are omitted, so the result
 * can legitimately be empty — a car with nothing to compare gets no chart.
 */
export function compareWithinCategory(car: Car, pool: Car[] = CARS): Comparison[] {
  const peers = pool.filter((c) => c.category === car.category);
  const out: Comparison[] = [];

  for (const spec of MEASURES) {
    const own = car[spec.key];
    if (!isFigure(own)) continue;

    // A figure published as a range contributes its LOW end to a ranking, so
    // a car is never ranked above its peers on the strength of the widest
    // possible reading of its own spec sheet.
    const values = peers
      .map((c) => c[spec.key])
      .filter(isFigure)
      .map((f) => f.value);
    if (values.length < MIN_PEERS) continue;

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const med = median(sorted);

    // Clip the axis when the top figure is far clear of the field.
    const secondMax = sorted[sorted.length - 2] ?? max;
    const scaleMax =
      sorted.length >= 4 && secondMax > 0 && max > secondMax * OUTLIER_RATIO ? secondMax : max;

    const kinds = new Set(peers.map((c) => c[spec.key]).filter(isFigure).map((f) => f.source));

    const bases = [
      ...new Set(
        peers
          .map((c) => c[spec.key])
          .filter(isFigure)
          .map(basisOf)
          .filter((b): b is Basis => b !== null),
      ),
    ].sort();

    // Rank by the direction that counts as "better" for this measure. Ties
    // share the better rank, which is why this counts strictly-better cars.
    const better = values.filter((v) =>
      spec.lowerIsBetter ? v < own.value : v > own.value,
    ).length;

    const span = max - min;
    const place = (v: number) => (span === 0 ? 1 : (v - min) / span);

    out.push({
      ...spec,
      value: own.value,
      min,
      max,
      median: med,
      rank: better + 1,
      of: values.length,
      fraction: place(own.value),
      medianFraction: place(med),
      scaleMax,
      overScale: own.value > scaleMax,
      mixedSources: kinds.size > 1,
      bases,
    });
  }

  return out;
}

/** "2nd quickest of 10 hypercars" — the sentence that does the interpreting. */
export function rankPhrase(c: Comparison): string {
  const ordinal = (n: number) => {
    const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
    return `${n}${suffix}`;
  };
  if (c.rank === 1) return `the ${c.lowerIsBetter ? "lowest" : "highest"} of ${c.of}`;
  return `${ordinal(c.rank)} of ${c.of}`;
}

/* ----------------------------------------------------------------- coverage */

/**
 * How many of the five headline figures a car actually has.
 *
 * This exists so the site can state its own completeness instead of letting a
 * page full of blanks imply that the blanks are the car's fault. For a racing
 * prototype they genuinely are — nobody publishes a 0-60 time for a Le Mans
 * car — and for an everyday hatchback they are usually ours.
 */
export type Coverage = {
  /** Figures actually present. */
  have: number;
  /** Figures that could be present: the five, less the ones nobody publishes. */
  of: number;
  /** Always MEASURES.length, for a page that wants to say "of five". */
  measures: number;
  /** Measures marked absent for a stated reason. */
  structural: number;
};

export function coverage(car: Car): Coverage {
  let have = 0;
  let structural = 0;
  for (const m of MEASURES) {
    const f = car[m.key];
    if (isFigure(f)) have++;
    else if (isAbsence(f)) structural++;
  }
  return { have, of: MEASURES.length - structural, measures: MEASURES.length, structural };
}

/**
 * The same across a set of cars.
 *
 * `pct` counts only the figures that COULD be filled in. Scoring a Le Mans
 * prototype out of five when two of those five are things nobody publishes
 * reports our completeness as the car's incompleteness, which is backwards:
 * it made prototypes look 28% documented when almost everything obtainable
 * about them was already here.
 */
export function coverageOf(cars: Car[]): { have: number; of: number; pct: number } {
  let have = 0;
  let of = 0;
  for (const c of cars) {
    const cov = coverage(c);
    have += cov.have;
    of += cov.of;
  }
  return { have, of, pct: of === 0 ? 0 : Math.round((have / of) * 100) };
}
