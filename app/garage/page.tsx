"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PARTS } from "../../src/data";
import { CARS, carById } from "../../src/cars";
import { estimate, partFitsCar, partCostMultiplier } from "../../src/engine";
import type { Part, PartCategory } from "../../src/types";
import { STAT_ROWS, band, fmt, fmtBand, fmtUsd } from "../../src/ui/format";
import StatChart from "./StatChart";

const CATEGORY_ORDER: PartCategory[] = [
  "exhaust",
  "intake",
  "turbo",
  "aero",
  "brakes",
  "tires",
  "weight",
];

const CATEGORY_LABEL: Record<PartCategory, string> = {
  exhaust: "Exhaust",
  intake: "Intake",
  turbo: "Forced induction",
  aero: "Aerodynamics",
  brakes: "Brakes",
  tires: "Tires",
  weight: "Weight",
};

export default function GaragePage() {
  const [carId, setCarId] = useState(CARS[0].id);
  const [selected, setSelected] = useState<string[]>([]);

  const car = carById(carId) ?? CARS[0];

  function changeCar(nextId: string) {
    const nextCar = carById(nextId);
    setCarId(nextId);
    // Drop any part that does not fit the new car, so the build stays legal.
    if (nextCar) {
      setSelected((prev) =>
        prev.filter((id) => {
          const part = PARTS.find((p) => p.id === id);
          return part ? partFitsCar(part, nextCar) : false;
        }),
      );
    }
  }

  function toggle(part: Part) {
    setSelected((prev) => {
      if (prev.includes(part.id)) return prev.filter((x) => x !== part.id);
      // Picking a part replaces whatever else is in its category.
      const sameCategory = PARTS.filter((p) => p.category === part.category).map((p) => p.id);
      return [...prev.filter((x) => !sameCategory.includes(x)), part.id];
    });
  }

  const result = useMemo(() => estimate(car, selected), [car, selected]);

  const costMultiplier = partCostMultiplier(car);
  const listCost = PARTS.filter((p) => selected.includes(p.id)).reduce(
    (sum, p) => sum + p.costUsd,
    0,
  );
  const partsCost = result.stock.totalCostUsd
    ? result.pessimistic.totalCostUsd - car.basePriceUsd
    : listCost;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Garage</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Pick a car, then pick parts. Every performance figure is a modelled
          range, not a measurement &mdash; see{" "}
          <Link href="/methods" className="text-amber-400 underline underline-offset-2">
            Methods
          </Link>{" "}
          for the assumptions and for how far off the real cars we are.
        </p>
      </div>

      {/* ---- Car picker ---- */}
      <div className="mb-6 rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <label htmlFor="car" className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Car
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <select
            id="car"
            value={carId}
            onChange={(e) => changeCar(e.target.value)}
            className="rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            {CARS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand} {c.name}
                {c.isReal ? "" : " (fictional)"}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-400">
            {car.archetype} &middot; {car.drivetrain} &middot; {car.stockHp} hp stock
          </span>
        </div>

        {car.isReal ? (
          <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-500">
            <span className="text-slate-400">This is a real car.</span> Stock
            figures are published manufacturer or press numbers. Everything this
            page calculates for a modified version is our own estimate from a
            simplified model, and is <em>not</em> endorsed by or affiliated with
            any manufacturer. Several inputs the model needs &mdash; tire grip,
            brake limit, driveline losses &mdash; are not published by anyone
            and are our assumptions.{" "}
            <Link href="/methods" className="text-amber-400 underline underline-offset-2">
              See Methods.
            </Link>
          </p>
        ) : (
          <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-500">
            <span className="text-slate-400">This car is invented.</span> Its
            specification was made up to be plausible for a {car.archetype}.
          </p>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_26rem]">
        {/* ---- Parts ---- */}
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
            Parts
          </h2>
          <div className="space-y-3">
            {CATEGORY_ORDER.map((category) => {
              const parts = PARTS.filter((p) => p.category === category);
              if (parts.length === 0) return null;
              return (
                <div
                  key={category}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {CATEGORY_LABEL[category]}
                  </div>
                  <div className="space-y-2">
                    {parts.map((part) => {
                      const fits = partFitsCar(part, car);
                      const on = selected.includes(part.id);
                      return (
                        <div key={part.id}>
                          <button
                            type="button"
                            onClick={() => toggle(part)}
                            disabled={!fits}
                            aria-pressed={on}
                            className={[
                              "w-full rounded-md border px-3 py-2 text-left text-sm transition",
                              !fits
                                ? "cursor-not-allowed border-white/5 bg-white/[0.01] text-slate-600"
                                : on
                                  ? "border-amber-400/60 bg-amber-400/10 text-amber-100"
                                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25",
                            ].join(" ")}
                          >
                            <span className="flex items-baseline justify-between gap-3">
                              <span className="font-medium">{part.name}</span>
                              <span className="shrink-0 text-xs text-slate-400">
                                {fmtUsd(part.costUsd)}
                              </span>
                            </span>
                          </button>
                          <p
                            className={[
                              "mt-1.5 px-1 text-xs leading-relaxed",
                              fits ? "text-slate-500" : "text-slate-600",
                            ].join(" ")}
                          >
                            {fits ? (
                              part.assumption
                            ) : (
                              <>
                                <span className="text-slate-500">
                                  Does not fit this car.
                                </span>{" "}
                                {part.fits?.reason}
                              </>
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---- Stats ---- */}
        <aside className="space-y-4">
          {result.errors.length > 0 && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm"
            >
              <div className="mb-1 font-medium text-red-200">
                This build is not valid
              </div>
              <ul className="list-inside list-disc space-y-1 text-red-200/80">
                {result.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-white/10 bg-white/[0.02]">
            <div className="flex items-baseline justify-between border-b border-white/10 px-4 py-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
                Estimated performance
              </h2>
              <span className="text-xs text-slate-500">
                {selected.length} part{selected.length === 1 ? "" : "s"}
              </span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 text-left font-medium">Stat</th>
                  <th className="px-4 py-2 text-right font-medium">Stock</th>
                  <th className="px-4 py-2 text-right font-medium">My build</th>
                </tr>
              </thead>
              <tbody>
                {STAT_ROWS.map((row) => {
                  const stock = result.stock[row.key];
                  const { lo, hi } = band(
                    result.pessimistic[row.key],
                    result.optimistic[row.key],
                  );
                  const isCost = row.key === "totalCostUsd";
                  return (
                    <tr key={row.key} className="border-t border-white/5">
                      <td className="px-4 py-2.5">
                        <span className="text-slate-300">{row.label}</span>
                        <span className="ml-1 text-xs text-slate-500">
                          {row.unit === "USD" ? "" : row.unit}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-400">
                        {isCost ? fmtUsd(stock) : fmt(stock, row.decimals)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {row.isEstimate && (
                          <span className="mr-1.5 text-[10px] uppercase tracking-wide text-amber-400/80">
                            est.
                          </span>
                        )}
                        <span className="font-medium text-slate-100">
                          {isCost ? fmtUsd(lo) : fmtBand(lo, hi, row.decimals)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <p className="border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-slate-500">
              Ranges marked <span className="text-amber-400/80">est.</span> are
              modelled, not measured. The low end assumes every part
              underdelivers at once and the high end assumes every part
              overdelivers at once, so real results usually land between them
              rather than at either edge.
            </p>
          </div>

          <StatChart estimate={result} />

          {/* ---- Reality check ---- */}
          {car.published && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-slate-400">
                Reality check
              </h2>
              <p className="mb-3 text-xs text-slate-500">
                Our model&rsquo;s stock figures against the published ones. This
                is how much to trust the numbers above.
              </p>
              <dl className="space-y-1.5 text-sm">
                {car.published.zeroToSixtyS != null && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-400">0-60 (rollout)</dt>
                    <dd className="tabular-nums text-slate-300">
                      model {fmt(result.stock.zeroToSixtyRolloutS, 2)}s
                      <span className="text-slate-500">
                        {" "}
                        vs published {fmt(car.published.zeroToSixtyS, 1)}s
                      </span>
                    </dd>
                  </div>
                )}
                {car.published.topSpeedMph != null && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-400">Top speed</dt>
                    <dd className="tabular-nums text-slate-300">
                      model {fmt(result.stock.topSpeedMph, 0)}
                      <span className="text-slate-500">
                        {" "}
                        vs published {car.published.topSpeedMph}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
              Price
            </h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Base car</dt>
                <dd className="tabular-nums text-slate-300">
                  {fmtUsd(car.basePriceUsd)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Parts</dt>
                <dd className="tabular-nums text-slate-300">{fmtUsd(partsCost)}</dd>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1.5 font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums text-amber-400">
                  {fmtUsd(car.basePriceUsd + partsCost)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              {costMultiplier > 1 ? (
                <>
                  Part prices are written for a $26,000 hatchback and scaled
                  &times;{costMultiplier.toFixed(2)} for this car, because the
                  same job costs more on an expensive one. The scaling is our
                  assumption, not a real price list, so treat the parts figure
                  as indicative.
                </>
              ) : (
                <>
                  Part prices are fixed figures, not estimates. They are
                  invented, but they are the reference prices the other cars
                  are scaled from.
                </>
              )}
            </p>
          </div>

          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="w-full rounded-md border border-white/10 px-3 py-2 text-sm text-slate-400 hover:border-white/25 hover:text-slate-200"
            >
              Reset to stock
            </button>
          )}
        </aside>
      </div>
    </main>
  );
}
