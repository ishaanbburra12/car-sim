import { CATEGORY_LABELS, type Car } from "@/src/catalog";
import { compareWithinCategory, rankPhrase, type Comparison } from "@/src/catalog/compare";

// ---------------------------------------------------------------------------
// Where this car sits among its own kind.
//
// FORM. Bars, growing from a true zero and scaled to the highest figure in the
// category. Zero-based is the only honest way to draw a bar, because the eye
// reads a bar's LENGTH as the quantity — start the axis anywhere else and a
// car with 10% more power gets a bar twice as long.
//
// The cost of that honesty is real and worth naming: among hypercars every
// 0-60 time falls between 1.9 and 2.9 seconds, so those bars come out nearly
// the same length. That is not the chart failing, it is the chart telling the
// truth — hypercars really are all about as quick off the line, and the
// differences live in the second decimal. The rank beside each bar carries the
// detail the length cannot.
//
// Two measures here are better when smaller: weight and 0-60. A long bar on
// those rows is a worse car, which is the one genuine trap in this form, so
// those rows say so in words rather than leaving the reader to infer it.
//
// COLOUR. Emphasis, not categorical: one hue for this car, recessive grey for
// the track and the median. #c98500 is the palette's dark-band ochre, picked
// by running the validator rather than by eye — the site's own brighter amber
// failed the lightness band for marks on a dark surface.
//
// The spec table above is this chart's table view.
// ---------------------------------------------------------------------------

const SERIES = "#c98500";

function Bar({ c, peers }: { c: Comparison; peers: string }) {
  const fmt = (n: number) =>
    n.toLocaleString("en-GB", {
      minimumFractionDigits: c.decimals,
      maximumFractionDigits: c.decimals,
    });

  // Zero-based: the track is 0 to the category's highest, and the bar is the
  // car's share of it.
  const width = c.max === 0 ? 0 : (c.value / c.max) * 100;
  const medianAt = c.max === 0 ? 0 : (c.median / c.max) * 100;

  return (
    <li
      title={`${c.label}: ${fmt(c.value)} ${c.unit}. ${rankPhrase(c)} ${peers} that published this figure. Median ${fmt(c.median)}, highest ${fmt(c.max)}.`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[14px]" style={{ color: "var(--ink-2)" }}>
          {c.label}
          {c.lowerIsBetter ? (
            <span className="ml-1.5 text-[12px]" style={{ color: "var(--ink-3)" }}>
              lower is better
            </span>
          ) : null}
        </span>
        <span className="text-right text-[13px]" style={{ color: "var(--ink-3)" }}>
          <span className="num text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
            {fmt(c.value)}
          </span>{" "}
          {c.unit} &middot; {rankPhrase(c)}
        </span>
      </div>

      <div className="relative mt-2 h-2.5">
        {/* Track: the full extent of the category, 0 to its highest figure. */}
        <div
          className="absolute inset-0 rounded-sm"
          style={{ background: "var(--rule-soft)" }}
          aria-hidden
        />
        {/* The bar: square at the baseline, rounded at the data end. */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-sm rounded-r"
          style={{ width: `${width}%`, background: SERIES, minWidth: 2 }}
          aria-hidden
        />
        {/* Median of the category, as a reference the bar can be read against.
            It carries a 2px gap in the surface colour so it stays visible
            where it crosses the bar. */}
        <div
          className="absolute -top-0.5 -bottom-0.5 w-0.5"
          style={{
            left: `${medianAt}%`,
            background: "var(--ink-2)",
            boxShadow: "0 0 0 2px var(--raised)",
          }}
          aria-hidden
        />
      </div>

      <div
        className="num mt-1.5 flex justify-between text-[12px]"
        style={{ color: "var(--ink-3)" }}
      >
        <span>0</span>
        <span>{fmt(c.max)}</span>
      </div>
    </li>
  );
}

export function CompareChart({ car }: { car: Car }) {
  const rows = compareWithinCategory(car);
  if (rows.length === 0) return null;
  const peers = CATEGORY_LABELS[car.category].toLowerCase();

  return (
    <section className="mt-12">
      <h2 className="text-[15px] font-semibold">Against the other {peers}</h2>
      <p className="prose-serif mt-1.5 text-[15px]" style={{ color: "var(--ink-2)" }}>
        Each bar runs from zero to the highest figure published by any of the {peers} here, with
        a mark at the median. Only cars that published a given figure are counted, so the totals
        differ from row to row.
      </p>
      <ul
        className="mt-5 flex flex-col gap-6 rounded-md px-5 py-5"
        style={{ background: "var(--raised)", boxShadow: "inset 0 0 0 1px var(--rule)" }}
      >
        {rows.map((c) => (
          <Bar key={c.key} c={c} peers={peers} />
        ))}
      </ul>
    </section>
  );
}
