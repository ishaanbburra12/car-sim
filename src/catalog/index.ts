import { BRANDS, BRAND_BY_SLUG } from "./brands";
import { HYPERCARS } from "./cars/hypercars";
import { SPORTS_CARS } from "./cars/sports";
import { PROTOTYPES } from "./cars/prototypes";
import { EVERYDAY_CARS } from "./cars/everyday";
import { CATEGORY_LABELS, type Car, type Category } from "./types";

export * from "./types";
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

/**
 * Normalise for matching: lower case, strip accents, and treat anything that
 * is not a letter or digit as a space.
 *
 * The accent stripping is what lets "huracan" find the Huracán and "nurburg"
 * find text containing "Nürburgring". Typing an accent on a keyboard that
 * does not have one is a real obstacle, and a search box that fails there
 * feels broken even though the data is correct.
 */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The same text with every separator removed, so "mx5" finds the MX-5 and
 * "gt3rs" finds the 911 GT3 RS. Model names are full of hyphens and spaces
 * that nobody types into a search box.
 */
function squash(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

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
    return CARS.filter(inCategory).sort((a, b) => a.name.localeCompare(b.name));
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
