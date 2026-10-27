import { describe, expect, it } from "vitest";
import {
  BRANDS,
  BRAND_BY_SLUG,
  CARS,
  CAR_BY_SLUG,
  CATEGORIES,
  brandsWithCounts,
  carsOfBrand,
  categoryCounts,
  searchCars,
} from "./index";

// These tests are mostly about the DATA, not the code. A catalogue is only
// worth anything if it is internally consistent, and the failure modes are
// dull ones a human will not spot by reading: a brand slug typed wrong, two
// cars sharing a URL, a source list left empty on the twentieth entry.

describe("catalogue integrity", () => {
  it("has cars", () => {
    expect(CARS.length).toBeGreaterThan(40);
    expect(BRANDS.length).toBeGreaterThan(20);
  });

  it("gives every car a unique slug", () => {
    const slugs = CARS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every brand a unique slug", () => {
    const slugs = BRANDS.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses URL-safe slugs", () => {
    for (const c of CARS) expect(c.slug).toMatch(/^[a-z0-9-]+$/);
    for (const b of BRANDS) expect(b.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("points every car at a brand that exists", () => {
    for (const car of CARS) {
      expect(BRAND_BY_SLUG[car.brand], `${car.slug} -> ${car.brand}`).toBeDefined();
    }
  });

  it("uses only known categories", () => {
    for (const car of CARS) expect(CATEGORIES).toContain(car.category);
  });

  it("cites a source for every car", () => {
    for (const car of CARS) {
      expect(car.sources.length, `${car.slug} has no sources`).toBeGreaterThan(0);
      for (const s of car.sources) expect(s.trim().length).toBeGreaterThan(0);
    }
  });

  it("gives every brand a real https link to its own site", () => {
    for (const b of BRANDS) {
      expect(b.site, `${b.slug}`).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}/);
    }
  });

  it("writes something for every car and brand", () => {
    for (const car of CARS) expect(car.blurb.length).toBeGreaterThan(40);
    for (const b of BRANDS) expect(b.blurb.length).toBeGreaterThan(40);
  });
});

describe("figures are published or absent, never invented", () => {
  const FIELDS = ["powerHp", "torqueLbFt", "weightKg", "zeroTo60S", "topSpeedMph"] as const;

  it("tags every figure it does print with where it came from", () => {
    for (const car of CARS) {
      for (const field of FIELDS) {
        const f = car[field];
        if (f === null) continue; // "not listed" is a legitimate answer
        expect(["manufacturer", "independent"], `${car.slug}.${field}`).toContain(f.source);
        expect(Number.isFinite(f.value), `${car.slug}.${field}`).toBe(true);
        expect(f.value, `${car.slug}.${field}`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps figures inside physically sane bounds", () => {
    // Not a test of accuracy - nothing here can check that - but a trap for
    // a misplaced decimal point or a kW figure pasted into an hp field.
    for (const car of CARS) {
      if (car.powerHp) expect(car.powerHp.value).toBeLessThan(2500);
      if (car.weightKg) {
        expect(car.weightKg.value).toBeGreaterThan(500);
        expect(car.weightKg.value).toBeLessThan(4000);
      }
      if (car.zeroTo60S) {
        expect(car.zeroTo60S.value).toBeGreaterThan(1);
        expect(car.zeroTo60S.value).toBeLessThan(30);
      }
      if (car.topSpeedMph) {
        expect(car.topSpeedMph.value).toBeGreaterThan(50);
        expect(car.topSpeedMph.value).toBeLessThan(350);
      }
    }
  });

  it("leaves racing prototypes' road-car figures unset", () => {
    // Nobody publishes a 0-60 time for a Le Mans car, so if one appears here
    // it was invented, which is the exact failure this project exists to avoid.
    for (const car of CARS.filter((c) => c.category === "prototype")) {
      expect(car.zeroTo60S, `${car.slug}`).toBeNull();
      expect(car.topSpeedMph, `${car.slug}`).toBeNull();
    }
  });
});

describe("search", () => {
  it("returns everything for an empty query", () => {
    expect(searchCars("").length).toBe(CARS.length);
    expect(searchCars("   ").length).toBe(CARS.length);
  });

  it("orders the unfiltered index by maker, then model", () => {
    const all = searchCars("");
    const makers = all.map((c) => BRAND_BY_SLUG[c.brand].name);
    expect([...makers].sort((a, b) => a.localeCompare(b))).toEqual(makers);
    // and a brand's own cars stay together and in order
    const porsches = all.filter((c) => c.brand === "porsche").map((c) => c.name);
    expect([...porsches].sort((a, b) => a.localeCompare(b))).toEqual(porsches);
  });

  it("finds a car by its own name", () => {
    expect(searchCars("nevera")[0].slug).toBe("rimac-nevera");
    expect(searchCars("Corolla")[0].slug).toBe("toyota-corolla");
  });

  it("finds cars by brand, and ranks the brand's own cars first", () => {
    const hits = searchCars("porsche");
    expect(hits.length).toBeGreaterThan(3);
    for (const car of hits.slice(0, 4)) expect(car.brand).toBe("porsche");
  });

  it("ignores case, accents and punctuation", () => {
    expect(searchCars("huracan")[0].slug).toBe("lamborghini-huracan-sto");
    expect(searchCars("HURACÁN")[0].slug).toBe("lamborghini-huracan-sto");
    expect(searchCars("mx5").length).toBeGreaterThan(0);
    expect(searchCars("mx-5").length).toBeGreaterThan(0);
  });

  it("narrows rather than widens as terms are added", () => {
    const one = searchCars("porsche");
    const two = searchCars("porsche hybrid");
    expect(two.length).toBeGreaterThan(0);
    expect(two.length).toBeLessThan(one.length);
  });

  it("returns nothing for a term that matches nothing", () => {
    expect(searchCars("zzzznotacar")).toEqual([]);
  });

  it("filters by category, with or without a query", () => {
    const hypers = searchCars("", { category: "hypercar" });
    expect(hypers.length).toBeGreaterThan(5);
    for (const c of hypers) expect(c.category).toBe("hypercar");

    const porscheHypers = searchCars("porsche", { category: "hypercar" });
    for (const c of porscheHypers) {
      expect(c.category).toBe("hypercar");
      expect(c.brand).toBe("porsche");
    }
  });

  it("can come up empty when a query and a category disagree", () => {
    expect(searchCars("corolla", { category: "hypercar" })).toEqual([]);
  });
});

describe("lookups", () => {
  it("indexes every car by slug", () => {
    for (const car of CARS) expect(CAR_BY_SLUG[car.slug]).toBe(car);
  });

  it("lists a brand's cars", () => {
    const porsches = carsOfBrand("porsche");
    expect(porsches.length).toBeGreaterThan(3);
    for (const c of porsches) expect(c.brand).toBe("porsche");
  });

  it("only offers brands that have at least one car", () => {
    for (const { brand, count } of brandsWithCounts()) {
      expect(count).toBeGreaterThan(0);
      expect(carsOfBrand(brand.slug).length).toBe(count);
    }
  });

  it("counts categories so they add up to the whole catalogue", () => {
    const counts = categoryCounts();
    const sum = CATEGORIES.reduce((n, c) => n + (counts[c] ?? 0), 0);
    expect(sum).toBe(CARS.length);
    expect(counts.all).toBe(CARS.length);
  });
});
