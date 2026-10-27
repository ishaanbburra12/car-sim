"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CARS, CATEGORIES, CATEGORY_BLURBS, CATEGORY_LABELS, searchCars } from "@/src/catalog";
import type { Category } from "@/src/catalog";
import { CarCard } from "@/app/components/catalog-ui";

type Filter = Category | "all";

const COUNTS: Record<Filter, number> = (() => {
  const out = { all: CARS.length } as Record<Filter, number>;
  for (const c of CATEGORIES) out[c] = CARS.filter((car) => car.category === c).length;
  return out;
})();

export default function CarBrowser({
  initialQuery,
  initialCategory,
}: {
  initialQuery: string;
  initialCategory: Filter;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<Filter>(initialCategory);

  // The whole catalogue is already in memory, so filtering is instant. The
  // deferred value keeps typing smooth anyway if the list grows a lot.
  const deferred = useDeferredValue(query);
  const results = useMemo(() => searchCars(deferred, { category }), [deferred, category]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="car-search" className="sr-only">
            Search cars
          </label>
          <input
            id="car-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any car, brand or engine — try “gt3rs”, “rotary”, “hybrid”"
            autoComplete="off"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
          />
        </div>
        <div>
          <label htmlFor="car-category" className="sr-only">
            Filter by category
          </label>
          <select
            id="car-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Filter)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-slate-100 focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/40 sm:w-64"
          >
            <option value="all">All categories ({COUNTS.all})</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]} ({COUNTS[c]})
              </option>
            ))}
          </select>
        </div>
      </div>

      {category !== "all" ? (
        <p className="max-w-3xl text-sm text-slate-400">{CATEGORY_BLURBS[category]}</p>
      ) : null}

      <p className="text-sm text-slate-500" aria-live="polite">
        {results.length === 0
          ? "No matches"
          : `${results.length} ${results.length === 1 ? "car" : "cars"}`}
        {query.trim() ? ` for “${query.trim()}”` : ""}
      </p>

      {results.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-slate-300">Nothing in the catalogue matches that.</p>
          <p className="mt-2 text-sm text-slate-500">
            This is a hand-written catalogue of {CARS.length} cars, not a database of every car
            ever made — so a miss usually means it has not been written up yet rather than that
            you spelled it wrong.
          </p>
          {category !== "all" ? (
            <button
              type="button"
              onClick={() => setCategory("all")}
              className="mt-4 rounded-md border border-white/15 px-3 py-1.5 text-sm text-slate-200 hover:border-amber-400/50 hover:text-amber-300"
            >
              Search all categories instead
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((car) => (
            <CarCard key={car.slug} car={car} />
          ))}
        </div>
      )}
    </div>
  );
}
