import Link from "next/link";
import {
  BRANDS,
  CARS,
  CATEGORIES,
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  brandsWithCounts,
} from "@/src/catalog";

export default function Home() {
  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [c, CARS.filter((car) => car.category === c).length]),
  ) as Record<(typeof CATEGORIES)[number], number>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <section className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Learn what makes a car
          <span className="text-amber-400"> interesting</span>.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">
          {CARS.length} cars from {brandsWithCounts().length} manufacturers, each written up by
          hand: what it is, how it is laid out, and why it mattered. Not a spec dump — the point
          is the engineering decision behind each one.
        </p>
        <p className="mt-4 leading-relaxed text-slate-400">
          Every figure here was published by the manufacturer or measured by an independent
          tester, and each one is labelled with which. Where a number could not be sourced, the
          page says <span className="italic">not listed</span> instead of guessing. That rule
          costs the site some blank rows, and it is the reason the filled ones are worth
          anything.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/cars"
            className="rounded-md bg-amber-400 px-5 py-2.5 font-medium text-slate-950 transition hover:bg-amber-300"
          >
            Search the catalogue
          </Link>
          <Link
            href="/brands"
            className="rounded-md border border-white/15 px-5 py-2.5 text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300"
          >
            Browse by brand
          </Link>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Four kinds of car
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/cars?category=${category}`}
              className="group rounded-lg border border-white/10 bg-white/[0.02] p-5 transition hover:border-amber-400/40 hover:bg-white/[0.05]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-100 group-hover:text-amber-300">
                  {CATEGORY_LABELS[category]}
                </h3>
                <span className="shrink-0 text-xs text-slate-500">{counts[category]}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {CATEGORY_BLURBS[category]}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-lg border border-white/10 bg-white/[0.02] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          There is also a simulator
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          This project started as a performance simulator for a fictional car, and that part is
          still here: you can bolt parts onto it and see what the model thinks happens, as a
          range rather than a single number. It is kept deliberately separate from the
          catalogue, because everything it produces is an estimate and nothing in the catalogue
          is.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/garage" className="text-amber-300 hover:text-amber-200">
            Open the simulator &rarr;
          </Link>
          <Link href="/methods" className="text-slate-400 hover:text-slate-200">
            How its model works
          </Link>
        </div>
      </section>

      <p className="mt-10 text-xs text-slate-600">
        {BRANDS.length} brands defined, {brandsWithCounts().length} with cars written up so far.
      </p>
    </main>
  );
}
