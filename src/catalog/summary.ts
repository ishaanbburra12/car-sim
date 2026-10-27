import type { Category } from "./types";
import { normalise, squash } from "./text";

// ---------------------------------------------------------------------------
// What the browse page sends to the browser.
//
// The index filters as you type, so it needs the catalogue client-side — but
// it does not need the prose. Blurbs are by far the largest field and are only
// ever read on a car's own page, so shipping them to everyone who opens the
// index was most of that page's weight.
//
// This module deliberately imports NO car data. The summaries are built on the
// server and handed in as a prop; if this file imported the catalogue, every
// blurb would follow it into the bundle and the whole exercise would be
// pointless. That mistake was made once already and caught by measuring the
// built page rather than by reasoning about it.
//
// The trade is explicit: searching no longer matches a word that appears only
// inside a blurb. Model name, maker, years, layout, engine and class all still
// match, which covers what people type.
// ---------------------------------------------------------------------------

export type CarSummary = {
  slug: string;
  name: string;
  brand: string;
  brandName: string;
  years: string;
  category: Category;
  powerHp: number | null;
  /** Pre-normalised text to match against, built once on the server. */
  terms: string;
};

export type SortKey = "maker" | "name" | "power" | "year";

function startYear(years: string): number {
  const m = years.match(/\d{4}/);
  return m ? Number(m[0]) : 0;
}

const SORTS: Record<SortKey, (a: CarSummary, b: CarSummary) => number> = {
  maker: (a, b) => a.brandName.localeCompare(b.brandName) || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
  // Cars with no published figure sort LAST rather than as zero. Treating a
  // missing figure as nought would park every undocumented car at the bottom
  // of a "most powerful" list, which reads as "slow" rather than "unknown".
  power: (a, b) =>
    (b.powerHp ?? -Infinity) - (a.powerHp ?? -Infinity) || a.name.localeCompare(b.name),
  year: (a, b) => startYear(b.years) - startYear(a.years) || a.name.localeCompare(b.name),
};

export function searchSummaries(
  cars: CarSummary[],
  query: string,
  options: { category?: Category | "all"; sort?: SortKey } = {},
): CarSummary[] {
  const category = options.category ?? "all";
  const sort = options.sort ?? "maker";
  const terms = normalise(query).split(" ").filter(Boolean);

  const matched = cars.filter((entry) => {
    if (category !== "all" && entry.category !== category) return false;
    if (terms.length === 0) return true;
    // Every term must match something, so adding a word narrows the result.
    return terms.every((term) => {
      const sq = squash(term);
      return entry.terms.includes(term) || (sq.length >= 3 && squash(entry.terms).includes(sq));
    });
  });

  return [...matched].sort(SORTS[sort]);
}
