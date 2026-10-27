"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CARS, CATEGORIES, CATEGORY_BLURBS, CATEGORY_LABELS, searchCars } from "@/src/catalog";
import type { Category } from "@/src/catalog";
import { CarIndex } from "@/app/components/catalog-ui";

type Filter = Category | "all";

const COUNTS: Record<Filter, number> = (() => {
  const out = { all: CARS.length } as Record<Filter, number>;
  for (const c of CATEGORIES) out[c] = CARS.filter((car) => car.category === c).length;
  return out;
})();

const field =
  "w-full rounded-md border px-3.5 py-2.5 text-[15px] transition-colors focus:outline-none";

export default function CarBrowser({
  initialQuery,
  initialCategory,
}: {
  initialQuery: string;
  initialCategory: Filter;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<Filter>(initialCategory);

  const deferred = useDeferredValue(query);
  const results = useMemo(() => searchCars(deferred, { category }), [deferred, category]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="car-search" className="sr-only">
            Search cars
          </label>
          <input
            id="car-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a car, a brand, an engine"
            autoComplete="off"
            className={field}
            style={{
              background: "var(--raised)",
              borderColor: "var(--rule)",
              color: "var(--ink)",
            }}
          />
        </div>
        <div className="sm:w-60">
          <label htmlFor="car-category" className="sr-only">
            Filter by category
          </label>
          <select
            id="car-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Filter)}
            className={field}
            style={{
              background: "var(--raised)",
              borderColor: "var(--rule)",
              color: "var(--ink)",
            }}
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
        <p className="prose-serif mt-5 text-[15px]" style={{ color: "var(--ink-2)" }}>
          {CATEGORY_BLURBS[category]}
        </p>
      ) : null}

      <p className="mt-6 text-[13px]" style={{ color: "var(--ink-3)" }} aria-live="polite">
        {results.length === 0
          ? "Nothing found"
          : `${results.length} ${results.length === 1 ? "car" : "cars"}`}
        {query.trim() ? ` matching ${query.trim()}` : ""}
      </p>

      {results.length === 0 ? (
        <div
          className="mt-4 rounded-md px-6 py-10 text-center"
          style={{ background: "var(--raised)", boxShadow: "inset 0 0 0 1px var(--rule)" }}
        >
          <p className="text-[15px]">No car here matches that.</p>
          <p
            className="prose-serif mx-auto mt-2 text-[15px]"
            style={{ color: "var(--ink-2)" }}
          >
            This is a written catalogue of {CARS.length} cars rather than a database of every
            car ever made, so a miss usually means it has not been written up yet.
          </p>
          {category !== "all" ? (
            <button
              type="button"
              onClick={() => setCategory("all")}
              className="mt-5 rounded-md border px-3.5 py-2 text-[14px] transition-colors hover:text-[var(--signal-ink)]"
              style={{ borderColor: "var(--rule)" }}
            >
              Search every category
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-2">
          <CarIndex cars={results} />
        </div>
      )}
    </div>
  );
}
