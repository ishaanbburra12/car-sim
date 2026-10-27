"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
// Types and pure functions only. Importing the catalogue barrel here would
// pull every blurb into the browser, which is the exact thing the summaries
// exist to avoid — measured, after getting it wrong once.
import { CATEGORIES, CATEGORY_BLURBS, CATEGORY_LABELS, type Category } from "@/src/catalog/types";
import { searchSummaries, type CarSummary, type SortKey } from "@/src/catalog/summary";
import { CarIndex } from "@/app/components/catalog-ui";

type Filter = Category | "all";

/**
 * How many rows to put on the page before asking. At sixty the page is already
 * long; at two hundred it is a scroll with no end, and every row is a link the
 * browser has to lay out whether anybody reads it or not.
 */
const PAGE = 60;

function countsOf(cars: CarSummary[]): Record<Filter, number> {
  const out = { all: cars.length } as Record<Filter, number>;
  for (const c of CATEGORIES) out[c] = cars.filter((car) => car.category === c).length;
  return out;
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "maker", label: "Maker" },
  { key: "name", label: "Model name" },
  { key: "power", label: "Most powerful" },
  { key: "year", label: "Newest" },
];

const field =
  "w-full rounded-md border px-3.5 py-2.5 text-[15px] transition-colors focus:outline-none";
const fieldStyle = {
  background: "var(--raised)",
  borderColor: "var(--rule)",
  color: "var(--ink)",
};

export default function CarBrowser({
  cars,
  initialQuery,
  initialCategory,
  initialSort,
}: {
  cars: CarSummary[];
  initialQuery: string;
  initialCategory: Filter;
  initialSort: SortKey;
}) {
  const COUNTS = useMemo(() => countsOf(cars), [cars]);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<Filter>(initialCategory);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [showAll, setShowAll] = useState(false);

  const deferred = useDeferredValue(query);
  const results = useMemo(
    () => searchSummaries(cars, deferred, { category, sort }),
    [cars, deferred, category, sort],
  );

  // Keep the address bar in step so a search can be linked to or reloaded.
  // replaceState rather than router.push: this is a filter being adjusted, not
  // a navigation, and it should not fill the back button with keystrokes.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "all") params.set("category", category);
    if (sort !== "maker") params.set("sort", sort);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [query, category, sort]);

  // A new search starts at the top of the list again.
  useEffect(() => setShowAll(false), [deferred, category, sort]);

  const shown = showAll ? results : results.slice(0, PAGE);

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
            style={fieldStyle}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1 sm:w-52 sm:flex-none">
            <label htmlFor="car-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="car-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Filter)}
              className={field}
              style={fieldStyle}
            >
              <option value="all">All categories ({COUNTS.all})</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]} ({COUNTS[c]})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 sm:w-44 sm:flex-none">
            <label htmlFor="car-sort" className="sr-only">
              Order
            </label>
            <select
              id="car-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className={field}
              style={fieldStyle}
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
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
        {!showAll && results.length > PAGE ? `, showing the first ${PAGE}` : ""}
      </p>

      {results.length === 0 ? (
        <div
          className="mt-4 rounded-md px-6 py-10 text-center"
          style={{ background: "var(--raised)", boxShadow: "inset 0 0 0 1px var(--rule)" }}
        >
          <p className="text-[15px]">No car here matches that.</p>
          <p className="prose-serif mx-auto mt-2 text-[15px]" style={{ color: "var(--ink-2)" }}>
            This is a written catalogue of {cars.length} cars rather than a database of
            every car ever made, so a miss usually means it has not been written up yet.
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
        <>
          <div className="mt-2">
            <CarIndex cars={shown} />
          </div>
          {!showAll && results.length > PAGE ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-6 w-full rounded-md border py-3 text-[14px] transition-colors hover:text-[var(--signal-ink)]"
              style={{ borderColor: "var(--rule)" }}
            >
              Show the remaining {results.length - PAGE}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
