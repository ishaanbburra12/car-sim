"use client";

import type { Estimate, Stats } from "../../src/types";
import { band, fmt, fmtBand } from "../../src/ui/format";

// Validated against the dark chart surface (#0b0f14) with the dataviz
// six-checks validator: lightness band, chroma floor, CVD separation,
// normal-vision separation and contrast all pass.
const BUILD = "#d97706"; // your build
const STOCK = "#3b82f6"; // stock car

type Row = {
  key: keyof Stats;
  label: string;
  unit: string;
  decimals: number;
  betterIs: "higher" | "lower";
};

const ROWS: Row[] = [
  { key: "peakHp", label: "Peak power", unit: "hp", decimals: 0, betterIs: "higher" },
  { key: "zeroToSixtyS", label: "0-60 mph", unit: "s", decimals: 1, betterIs: "lower" },
  { key: "topSpeedMph", label: "Top speed", unit: "mph", decimals: 0, betterIs: "higher" },
  { key: "brake60ToZeroFt", label: "60-0 braking", unit: "ft", decimals: 0, betterIs: "lower" },
  { key: "lateralG", label: "Cornering grip", unit: "g", decimals: 2, betterIs: "higher" },
  { key: "massKg", label: "Mass", unit: "kg", decimals: 0, betterIs: "lower" },
];

const TRACK_X = 0; // the plot area is its own svg per row, so it starts at 0
const TRACK_W = 100; // percent-based viewBox keeps this responsive
const ROW_H = 26;

export default function StatChart({ estimate }: { estimate: Estimate }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Stock vs my build
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Each bar has its own scale, so compare within a row, never between
          rows. The shaded band is the estimated range.
        </p>
      </div>

      {/* Legend: two series, so a legend is always present. */}
      <div className="flex items-center gap-4 px-4 pt-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: STOCK }}
            aria-hidden
          />
          Stock
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: BUILD }}
            aria-hidden
          />
          My build (est. range)
        </span>
      </div>

      <div className="space-y-1 px-4 py-3">
        {ROWS.map((row) => {
          const stock = estimate.stock[row.key];
          const { lo, hi } = band(
            estimate.pessimistic[row.key],
            estimate.optimistic[row.key],
          );
          // Each row gets its own scale from zero, so bar length stays
          // proportional to the value and nothing is visually exaggerated.
          const max = Math.max(stock, hi) * 1.12 || 1;
          const pct = (v: number) => (v / max) * TRACK_W;

          const better =
            row.betterIs === "higher" ? hi > stock + 1e-9 : lo < stock - 1e-9;
          const changed = Math.abs(lo - stock) > 1e-9 || Math.abs(hi - stock) > 1e-9;

          const rangeText = fmtBand(lo, hi, row.decimals);
          const description = `${row.label}: stock ${fmt(stock, row.decimals)} ${row.unit}, build estimated ${rangeText} ${row.unit}`;

          return (
            <div key={String(row.key)} className="py-1.5">
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="text-slate-300">{row.label}</span>
                <span className="tabular-nums text-slate-400">
                  <span className="text-slate-500">
                    {fmt(stock, row.decimals)}
                  </span>
                  {changed && (
                    <>
                      <span className="mx-1 text-slate-600">&rarr;</span>
                      <span className="text-[10px] uppercase tracking-wide text-amber-400/80">
                        est.
                      </span>{" "}
                      <span className="font-medium text-slate-100">
                        {rangeText}
                      </span>
                    </>
                  )}{" "}
                  <span className="text-slate-500">{row.unit}</span>
                </span>
              </div>

              <svg
                viewBox={`0 0 ${TRACK_W} ${ROW_H}`}
                preserveAspectRatio="none"
                className="h-[26px] w-full overflow-visible"
                role="img"
                aria-label={description}
              >
                <title>{description}</title>

                {/* Recessive track */}
                <rect
                  x={TRACK_X}
                  y={9}
                  width={TRACK_W}
                  height={8}
                  rx={2}
                  fill="rgba(255,255,255,0.04)"
                />

                {/* Stock bar */}
                <rect
                  x={TRACK_X}
                  y={10}
                  width={Math.max(pct(stock), 0.5)}
                  height={6}
                  rx={1.5}
                  fill={STOCK}
                  opacity={0.55}
                />

                {/* Build range band, drawn over the stock bar with a surface
                    gap so the two marks never touch. */}
                {changed && (
                  <>
                    <rect
                      x={Math.max(pct(Math.min(lo, hi)) - 0.3, 0)}
                      y={7.5}
                      width={Math.max(pct(Math.abs(hi - lo)) + 0.6, 1.2)}
                      height={11}
                      rx={2}
                      fill="#0b0f14"
                    />
                    <rect
                      x={pct(Math.min(lo, hi))}
                      y={8.5}
                      width={Math.max(pct(Math.abs(hi - lo)), 0.8)}
                      height={9}
                      rx={2}
                      fill={BUILD}
                      opacity={better ? 0.95 : 0.6}
                    />
                  </>
                )}
              </svg>
            </div>
          );
        })}
      </div>

      <p className="border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-slate-500">
        Bars start at zero and each row is scaled independently. A band that
        sits left of the stock bar on &ldquo;0-60&rdquo;, &ldquo;braking&rdquo;
        or &ldquo;mass&rdquo; is an improvement, because lower is better for
        those. The same numbers are in the table above.
      </p>
    </div>
  );
}
