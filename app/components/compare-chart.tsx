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

  // Zero-based, with the track running to scaleMax rather than to the raw
  // highest figure — see Comparison.scaleMax for why one runaway car would
  // otherwise flatten the whole category.
  const top = c.scaleMax || 1;
  const width = Math.min(100, (c.value / top) * 100);
  const medianAt = Math.min(100, (c.median / top) * 100);
  const clipped = c.scaleMax < c.max;

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
          className="absolute inset-y-0 left-0 rounded-l-sm"
          style={{
            width: `${width}%`,
            background: SERIES,
            minWidth: 2,
            // A bar that runs past the end of the track is drawn with a point
            // instead of a flat end, so it is obvious it has been cut short
            // rather than looking like it just happens to be full length.
            borderTopRightRadius: c.overScale ? 0 : 3,
            borderBottomRightRadius: c.overScale ? 0 : 3,
            clipPath: c.overScale
              ? "polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)"
              : undefined,
          }}
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

      <div className="mt-1.5 flex justify-between gap-4 text-[12px]" style={{ color: "var(--ink-3)" }}>
        <span className="num">0</span>
        <span className="text-right">
          <span className="num">{fmt(c.scaleMax)}</span>
          {clipped ? (
            <span>
              {" "}
              — scale stops here; the highest is{" "}
              <span className="num">{fmt(c.max)}</span>
            </span>
          ) : null}
        </span>
      </div>

      {c.mixedSources ? (
        <p className="mt-1 text-[12px]" style={{ color: "var(--ink-3)" }}>
          This row ranks maker&rsquo;s figures against independent tests, which are not quite
          the same measurement.
        </p>
      ) : null}
      {/* The 0-60 row is the one where this really bites. Most of Europe
          publishes 0-100 km/h, which is 62 mph, and the US publishes 0-60 mph:
          a tenth to three tenths apart at these speeds, which is enough to
          move a car up or down the order. Saying so is the honest version of
          ranking them together, and a reader learns something from it. */}
      {c.bases.length > 1 ? (
        <p className="mt-1 text-[12px]" style={{ color: "var(--ink-3)" }}>
          These are not all the same sprint: the cars counted here published{" "}
          {c.bases.slice(0, -1).join(", ")} and {c.bases[c.bases.length - 1]} figures, which
          differ by a tenth or two. Each car&rsquo;s own page says which it is.
        </p>
      ) : null}
    </li>
  );
}

export function CompareChart({ car }: { car: Car }) {
  const rows = compareWithinCategory(car);
  if (rows.length === 0) return null;
  const peers = CATEGORY_LABELS[car.category].toLowerCase();
  const anyClipped = rows.some((r) => r.scaleMax < r.max);

  return (
    <section className="mt-12">
      <h2 className="text-[15px] font-semibold">Against the other {peers}</h2>
      <p className="prose-serif mt-1.5 text-[15px]" style={{ color: "var(--ink-2)" }}>
        Each bar starts at zero and runs along a track scaled to the {peers} here. Only cars
        that published a given figure are counted, so the totals differ from row to row.
        {anyClipped
          ? " Where one car is far clear of the rest, the track stops at the runner-up and that row says so underneath."
          : ""}
      </p>

      {/* A key. The bar is one series and would not need naming on its own, but
          the median notch is a second mark with a different meaning, and a
          reader has no way to guess what it is. */}
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px]" style={{ color: "var(--ink-2)" }}>
        <li className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-7 rounded-l-sm rounded-r"
            style={{ background: SERIES }}
            aria-hidden
          />
          this car
        </li>
        <li className="flex items-center gap-2">
          <span className="relative inline-block h-3.5 w-7" aria-hidden>
            <span
              className="absolute inset-y-[3px] inset-x-0 rounded-sm"
              style={{ background: "var(--rule-soft)" }}
            />
            <span
              className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2"
              style={{ background: "var(--ink-2)" }}
            />
          </span>
          the median of the {peers} counted in that row
        </li>
      </ul>
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
