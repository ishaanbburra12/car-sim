import { BRANDS, BRAND_BY_SLUG } from "./brands";
import { HYPERCARS } from "./cars/hypercars";
import { SPORTS_CARS } from "./cars/sports";
import { PROTOTYPES } from "./cars/prototypes";
import { EVERYDAY_CARS } from "./cars/everyday";
import { CATEGORY_LABELS, type Car, type Category, isFigure } from "./types";
import type { CarSummary } from "./summary";
import { normalise, squash } from "./text";

export * from "./types";
export * from "./summary";
export { BRANDS, BRAND_BY_SLUG } from "./brands";

export const CARS: Car[] = [
  ...HYPERCARS,
  ...SPORTS_CARS,
  ...PROTOTYPES,
  ...EVERYDAY_CARS,
];

export const CAR_BY_SLUG: Record<string, Car> = Object.fromEntries(
  CARS.map((c) => [c.slug, c]),
);

export function carsOfBrand(brandSlug: string): Car[] {
  return CARS.filter((c) => c.brand === brandSlug);
}

/** Brands that actually have cars, with how many, for the brand index. */
export function brandsWithCounts() {
  return BRANDS.map((brand) => ({ brand, count: carsOfBrand(brand.slug).length }))
    .filter((b) => b.count > 0)
    .sort((a, b) => a.brand.name.localeCompare(b.brand.name));
}

/* ------------------------------------------------------------------ search */



type Indexed = {
  car: Car;
  name: string;
  brandName: string;
  haystack: string;
  nameSquashed: string;
  haystackSquashed: string;
};

const INDEX: Indexed[] = CARS.map((car) => {
  const brandName = BRAND_BY_SLUG[car.brand]?.name ?? car.brand;
  const haystack = [
    car.name,
    brandName,
    car.years,
    car.layout,
    car.engine,
    car.blurb,
    CATEGORY_LABELS[car.category],
  ].join(" ");
  return {
    car,
    name: normalise(car.name),
    brandName: normalise(brandName),
    haystack: normalise(haystack),
    nameSquashed: squash(car.name),
    haystackSquashed: squash(`${car.name} ${brandName}`),
  };
});

/**
 * Score a car against a query. Higher is better, 0 means no match.
 *
 * Every term must match something, so "porsche hybrid" narrows rather than
 * widens. Within that, matching the name beats matching the brand, which
 * beats matching the prose, so searching "porsche" does not bury the 911
 * under every car whose description happens to mention Porsche.
 */
function score(entry: Indexed, terms: string[]): number {
  let total = 0;
  for (const term of terms) {
    const sq = squash(term);
    let best = 0;
    if (entry.name.startsWith(term)) best = 100;
    else if (entry.name.includes(term)) best = 60;
    // Separator-insensitive match, worth slightly less than a clean one.
    // Only for terms of three characters or more: at one or two it matches
    // far too much to be useful.
    else if (sq.length >= 3 && entry.nameSquashed.includes(sq)) best = 55;
    else if (entry.brandName.startsWith(term)) best = 40;
    else if (entry.brandName.includes(term)) best = 30;
    else if (sq.length >= 3 && entry.haystackSquashed.includes(sq)) best = 20;
    else if (entry.haystack.includes(term)) best = 10;
    if (best === 0) return 0; // this term matched nothing: not a result
    total += best;
  }
  return total;
}

export type SearchOptions = {
  /** Empty or missing means every category. */
  category?: Category | "all";
};

/**
 * Search the catalogue. An empty query returns everything in the chosen
 * category, which is what makes the dropdown useful on its own.
 */
export function searchCars(query: string, options: SearchOptions = {}): Car[] {
  const category = options.category ?? "all";
  const inCategory = (c: Car) => category === "all" || c.category === category;

  const terms = normalise(query).split(" ").filter(Boolean);
  if (terms.length === 0) {
    // No query: this is an index, so order it the way an index is ordered —
    // by maker, then by model. Sorting 50 cars by model name alone scatters
    // each brand's cars across the whole list, which is useless for browsing.
    return CARS.filter(inCategory).sort(
      (a, b) =>
        (BRAND_BY_SLUG[a.brand]?.name ?? a.brand).localeCompare(
          BRAND_BY_SLUG[b.brand]?.name ?? b.brand,
        ) || a.name.localeCompare(b.name),
    );
  }

  return INDEX.filter((e) => inCategory(e.car))
    .map((e) => ({ e, s: score(e, terms) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.e.car.name.localeCompare(b.e.car.name))
    .map((r) => r.e.car);
}

/** How many cars are in each category, for the dropdown labels. */
export function categoryCounts(): Record<Category | "all", number> {
  const out = { all: CARS.length } as Record<Category | "all", number>;
  for (const car of CARS) out[car.category] = (out[car.category] ?? 0) + 1;
  return out;
}


/* ------------------------------------------------- summaries for the client */

/**
 * Built here, on the server, and handed to the browse page as a prop. See
 * summary.ts for why this does not live in the module the browser imports.
 */
export const CAR_SUMMARIES: CarSummary[] = CARS.map((car) => {
  const brandName = BRAND_BY_SLUG[car.brand]?.name ?? car.brand;
  return {
    slug: car.slug,
    name: car.name,
    brand: car.brand,
    brandName,
    years: car.years,
    category: car.category,
    powerHp: isFigure(car.powerHp) ? car.powerHp.value : null,
    terms: normalise(
      [car.name, brandName, car.years, car.layout, car.engine, CATEGORY_LABELS[car.category]].join(
        " ",
      ),
    ),
  };
});
