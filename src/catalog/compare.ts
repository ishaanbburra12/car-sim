import { CARS } from "./index";
import type { Car } from "./types";

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
    if (own === null) continue;

    const values = peers
      .map((c) => c[spec.key])
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .map((f) => f.value);
    if (values.length < MIN_PEERS) continue;

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const med = median(sorted);

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
