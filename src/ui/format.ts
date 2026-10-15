// UI-only helpers. These format numbers for display; they never do physics.
// The engine stays the single source of truth for every value shown here.
import type { Stats } from "../types";

export type Direction = "higher" | "lower" | "none";

export type StatRow = {
  key: keyof Stats;
  label: string;
  unit: string;
  decimals: number;
  /** Which way is "better", used only to colour the comparison arrow. */
  betterIs: Direction;
  /** Cost is arithmetic, not a physics estimate, so it is shown without "est." */
  isEstimate: boolean;
};

export const STAT_ROWS: StatRow[] = [
  { key: "peakHp", label: "Peak power", unit: "hp", decimals: 0, betterIs: "higher", isEstimate: true },
  { key: "peakTorqueLbFt", label: "Peak torque", unit: "lb-ft", decimals: 0, betterIs: "higher", isEstimate: true },
  { key: "zeroToSixtyS", label: "0-60 mph", unit: "s", decimals: 1, betterIs: "lower", isEstimate: true },
  { key: "zeroToSixtyRolloutS", label: "0-60 (rollout)", unit: "s", decimals: 1, betterIs: "lower", isEstimate: true },
  { key: "quarterMileS", label: "Quarter mile", unit: "s", decimals: 1, betterIs: "lower", isEstimate: true },
  { key: "topSpeedMph", label: "Top speed", unit: "mph", decimals: 0, betterIs: "higher", isEstimate: true },
  { key: "brake60ToZeroFt", label: "60-0 braking", unit: "ft", decimals: 0, betterIs: "lower", isEstimate: true },
  { key: "lateralG", label: "Cornering grip", unit: "g", decimals: 2, betterIs: "higher", isEstimate: true },
  { key: "massKg", label: "Mass (with driver)", unit: "kg", decimals: 0, betterIs: "lower", isEstimate: true },
  { key: "totalCostUsd", label: "Total price", unit: "USD", decimals: 0, betterIs: "none", isEstimate: false },
];

/**
 * The engine's "pessimistic" and "optimistic" runs are scenarios, not sorted
 * numbers: for 0-60 the optimistic run is the SMALLER number. Sort them here so
 * the UI always shows low-high, whichever way round the stat runs.
 */
export function band(pessimistic: number, optimistic: number) {
  return { lo: Math.min(pessimistic, optimistic), hi: Math.max(pessimistic, optimistic) };
}

export function fmt(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** "5.4–6.1" when the band is wide, "5.4" when both ends round to the same text. */
export function fmtBand(lo: number, hi: number, decimals: number): string {
  const a = fmt(lo, decimals);
  const b = fmt(hi, decimals);
  return a === b ? a : `${a}–${b}`;
}

export function fmtUsd(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
