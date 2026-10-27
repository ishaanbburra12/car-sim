import { CATEGORY_LABELS, type Car } from "@/src/catalog";
import { compareWithinCategory, rankPhrase, type Comparison } from "@/src/catalog/compare";

// ---------------------------------------------------------------------------
// Where this car sits among its own kind, one strip per measure.
//
// FORM. This is the "one series is the point, the rest are context" job, so it
// is emphasis: a single hue for this car, de-emphasis grey for everything else.
//
// It is a dot on a range strip rather than a bar, and that is deliberate. A bar
// has to grow from a baseline — zero — and a zero-based bar is useless here:
// every hypercar's 0-60 time sits between 1.8 and 2.9 seconds, so five bars of
// near-identical length would say nothing. A dot encodes POSITION rather than
// length, so it is free to span min-to-max honestly, and it sidesteps the trap
// where a longer bar means a worse car on the two measures (weight, 0-60) where
// smaller is better.
//
// COLOUR. #c98500 is the palette's dark-band yellow. The site's own amber
// (#fbbf24) was the obvious choice and failed the validator — lightness 0.837,
// outside the 0.48-0.67 band for marks on a dark surface. This step passes all
// six checks against the surface it is drawn on.
//
// The spec table above this chart is its table view, so the data is reachable
// without reading positions off a strip.
// ---------------------------------------------------------------------------

const SERIES = "#c98500"; // this car
const TRACK = "#2b2f36"; // the range among its peers
const TICK = "#6b7280"; // the median notch
const SURFACE = "#0d1116"; // card surface, for the ring around the dot

const fmt = (n: number, decimals: number) =>
  n.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

function Strip({ c, category }: { c: Comparison; category: Car["category"] }) {
  const pct = (f: number) => `${(f * 100).toFixed(2)}%`;
  const peers = CATEGORY_LABELS[category].toLowerCase();

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate-300">{c.label}</span>
        <span className="text-right text-sm text-slate-400">
          <span className="font-semibold tabular-nums text-slate-100">
            {fmt(c.value, c.decimals)}
          </span>{" "}
          {c.unit} <span className="text-slate-500">· {rankPhrase(c)}</span>
        </span>
      </div>

      {/* Margins rather than padding, so the dot's half-width overhang at 0%
          and 100% has somewhere to go instead of being clipped. */}
      <div
        className="relative mx-1.5 mt-2 h-3"
        title={`${c.label}: ${fmt(c.value, c.decimals)} ${c.unit}. ${rankPhrase(c)} ${peers} that published this figure. Median ${fmt(c.median, c.decimals)}, range ${fmt(c.min, c.decimals)} to ${fmt(c.max, c.decimals)}.`}
      >
        <div
          className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{ background: TRACK }}
        />
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: pct(c.medianFraction), background: TICK }}
          aria-hidden
        />
        <div
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: pct(c.fraction), background: SERIES, boxShadow: `0 0 0 2px ${SURFACE}` }}
          aria-hidden
        />
      </div>

      <div className="mt-1.5 flex justify-between text-xs tabular-nums text-slate-600">
        <span>{fmt(c.min, c.decimals)}</span>
        <span>{fmt(c.max, c.decimals)}</span>
      </div>
    </li>
  );
}

export function CompareChart({ car }: { car: Car }) {
  const rows = compareWithinCategory(car);
  if (rows.length === 0) return null;

  const peers = CATEGORY_LABELS[car.category].toLowerCase();

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
        How it compares with other {peers}
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-slate-500">
        Each strip spans the lowest and highest published figure among the {peers} in this
        catalogue.{" "}
        <span className="inline-flex items-center gap-1 align-baseline">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: SERIES }}
            aria-hidden
          />
          is this car
        </span>
        ; the notch is the median. Only cars that published a given figure are counted, so the
        totals differ from row to row.
      </p>
      <ul className="flex flex-col gap-5 rounded-lg border border-white/10 bg-white/[0.02] p-5">
        {rows.map((c) => (
          <Strip key={c.key} c={c} category={car.category} />
        ))}
      </ul>
    </section>
  );
}
