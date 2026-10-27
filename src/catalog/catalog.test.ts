import { describe, expect, it } from "vitest";
import { isAbsence, isFigure } from "./types";
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
      for (const s of car.sources) {
        expect(s.publisher.trim().length, `${car.slug}`).toBeGreaterThan(0);
        expect(s.title.trim().length, `${car.slug}`).toBeGreaterThan(0);
        // A url is optional, but if one is there it must be a real https link
        // AND carry the date it was last confirmed. The type already forbids
        // one without the other; this catches data that got past it by a cast.
        if (s.url) {
          expect(s.url).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}/);
          expect(s.checked, `${car.slug}: ${s.url} has no checked date`).toBeDefined();
          expect(s.checked!.on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(["search", "opened"]).toContain(s.checked!.how);
          expect(new Date(s.checked!.on).getTime()).toBeLessThanOrEqual(Date.now());
        }
      }
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
        if (!isFigure(f)) continue; // absent is a legitimate answer
        expect(["manufacturer", "independent"], `${car.slug}.${field}`).toContain(f.source);
        expect(Number.isFinite(f.value), `${car.slug}.${field}`).toBe(true);
        expect(f.value, `${car.slug}.${field}`).toBeGreaterThan(0);
      }
    }
  });

  it("writes a real reason whenever it says a figure is missing on purpose", () => {
    // The whole value of an Absence is the sentence a reader gets instead of
    // the number. An empty one would be worse than null, because it claims a
    // reason exists and then does not give it.
    for (const car of CARS) {
      for (const field of FIELDS) {
        const f = car[field];
        if (!isAbsence(f)) continue;
        expect(["unpublished", "varies", "disputed"], `${car.slug}.${field}`).toContain(f.absent);
        expect(f.why.trim().length, `${car.slug}.${field}`).toBeGreaterThan(20);
      }
    }
  });

  it("keeps a published range the right way round", () => {
    for (const car of CARS) {
      for (const field of FIELDS) {
        const f = car[field];
        if (!isFigure(f) || f.high === undefined) continue;
        expect(f.high, `${car.slug}.${field}`).toBeGreaterThan(f.value);
      }
    }
  });

  it("keeps figures inside physically sane bounds", () => {
    // Not a test of accuracy - nothing here can check that - but a trap for
    // a misplaced decimal point or a kW figure pasted into an hp field.
    for (const car of CARS) {
      const band = (f: (typeof CARS)[number][typeof FIELDS[number]], lo: number, hi: number) => {
        if (!isFigure(f)) return;
        for (const v of [f.value, f.high ?? f.value]) {
          expect(v).toBeGreaterThan(lo);
          expect(v).toBeLessThan(hi);
        }
      };
      band(car.powerHp, 0, 2500);
      band(car.weightKg, 500, 4000);
      band(car.zeroTo60S, 1, 30);
      band(car.topSpeedMph, 50, 350);
    }
  });

  it("leaves racing prototypes' road-car figures unset", () => {
    // Nobody publishes a 0-60 time for a Le Mans car, so if one appears here
    // it was invented, which is the exact failure this project exists to avoid.
    // Stronger than "must be null": these must be marked absent WITH a reason,
    // so the page explains why rather than looking unfinished.
    for (const car of CARS.filter((c) => c.category === "prototype")) {
      expect(isFigure(car.zeroTo60S), `${car.slug}.zeroTo60S`).toBe(false);
      expect(isFigure(car.topSpeedMph), `${car.slug}.topSpeedMph`).toBe(false);
      expect(isAbsence(car.zeroTo60S), `${car.slug} must SAY why it has no 0-60`).toBe(true);
      expect(isAbsence(car.topSpeedMph), `${car.slug} must SAY why it has no top speed`).toBe(true);
    }
  });
});

describe("entries that admit doubt", () => {
  it("writes a real sentence when it flags something for review", () => {
    for (const car of CARS) {
      if (car.review === undefined) continue;
      expect(car.review.trim().length, `${car.slug}`).toBeGreaterThan(20);
    }
  });

  it("only gives a production count where one is actually known", () => {
    for (const car of CARS) {
      if (car.produced === null) continue;
      expect(Number.isInteger(car.produced.count), `${car.slug}`).toBe(true);
      expect(car.produced.count, `${car.slug}`).toBeGreaterThan(0);
    }
  });

  it("gives every brand at least two cars, so a brand page is worth opening", () => {
    for (const { brand, count } of brandsWithCounts()) {
      expect(count, `${brand.slug} has only ${count}`).toBeGreaterThanOrEqual(2);
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

describe("0-60 times say which measurement they are", () => {
  // Makers do not publish the same sprint. Most of Europe quotes 0-100 km/h,
  // which is 62 mph, and the United States quotes 0-60 mph. At these speeds
  // the two differ by roughly a tenth to three tenths of a second -- enough to
  // reorder a chart that ranks them against each other as though they were the
  // same number. Two were already wrong when this was written: the Chiron's
  // 2.4 s is Bugatti's 0-100 km/h, and the 918's 2.5 s was a third-party
  // 0-60 mph time wearing a manufacturer tag (Porsche's own figure is 2.6 s).
  //
  // This list is a RATCHET, not a permission slip. A car may sit here only
  // until somebody checks what its figure actually measures; a new car may
  // never be added to it, and a car fixed must be removed, or the test fails.
  const UNAUDITED = new Set([
  "mclaren-p1",
  "ferrari-laferrari",
  "bugatti-veyron",
  "rimac-concept-one",
  "pagani-zonda-f",
  "porsche-911-gt3-rs-992",
  "porsche-718-cayman-gt4-rs",
  "mazda-mx-5-nd",
  "toyota-gr86",
  "toyota-gr-supra",
  "bmw-m2-g87",
  "chevrolet-corvette-c8",
  "honda-civic-type-r-fl5",
  "lotus-emira",
  "audi-r8-v10-performance",
  "nissan-gt-r-r35",
  "ferrari-296-gtb",
  "mclaren-750s",
  "aston-martin-vantage",
  "volkswagen-golf-gti-mk1",
  "chevrolet-corvette-z06-c8",
  "hyundai-ioniq-5-n",
  "lotus-elise-s1",
  "cadillac-ct5-v-blackwing",
  "peugeot-205-gti",
  ]);

  const statesBasis = (note: string | undefined) => {
    const n = (note ?? "").toLowerCase();
    return n.includes("km/h") || n.includes("60 mph") || n.includes("rollout");
  };

  it("states the basis, or is on the list of ones still to check", () => {
    for (const car of CARS) {
      const f = car.zeroTo60S;
      if (!isFigure(f)) continue;
      if (statesBasis(f.note)) continue;
      expect(
        UNAUDITED.has(car.slug),
        `${car.slug} has a 0-60 time that does not say what it measures. Check it, ` +
          `or add it to UNAUDITED -- but only if it predates this test.`,
      ).toBe(true);
    }
  });

  it("keeps the list honest: nothing on it has quietly been fixed", () => {
    for (const slug of UNAUDITED) {
      const car = CAR_BY_SLUG[slug];
      expect(car, `${slug} is on UNAUDITED but is not a car any more`).toBeDefined();
      const f = car.zeroTo60S;
      expect(
        isFigure(f) && !statesBasis(f.note),
        `${slug} now states its basis -- remove it from UNAUDITED`,
      ).toBe(true);
    }
  });

  it("is shrinking", () => {
    // Lower this number as entries are checked. It may never go up.
    expect(UNAUDITED.size).toBeLessThanOrEqual(25);
  });
});
