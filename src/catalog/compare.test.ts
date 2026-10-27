import { describe, expect, it } from "vitest";
import { CARS, CAR_BY_SLUG } from "./index";
import { compareWithinCategory, coverage, coverageOf, rankPhrase } from "./compare";
import type { Car } from "./types";

const car = (over: Partial<Car>): Car => ({
  slug: "x",
  brand: "porsche",
  name: "X",
  years: "2020",
  category: "sports",
  layout: "l",
  engine: "e",
  blurb: "b",
  powerHp: null,
  torqueLbFt: null,
  weightKg: null,
  zeroTo60S: null,
  topSpeedMph: null,
  produced: null,
  sources: [{ publisher: "p", title: "t" }],
  ...over,
});

const hp = (v: number) => ({ value: v, source: "manufacturer" as const });

describe("comparing a car with its own category", () => {
  it("only compares against the same category", () => {
    const pool = [
      car({ slug: "a", category: "sports", powerHp: hp(100) }),
      car({ slug: "b", category: "sports", powerHp: hp(200) }),
      car({ slug: "c", category: "sports", powerHp: hp(300) }),
      car({ slug: "z", category: "hypercar", powerHp: hp(9999) }),
    ];
    const [power] = compareWithinCategory(pool[2], pool);
    expect(power.of).toBe(3); // the hypercar is not a peer
    expect(power.max).toBe(300);
    expect(power.rank).toBe(1);
  });

  it("leaves out a measure with too few peers to mean anything", () => {
    const pool = [
      car({ slug: "a", powerHp: hp(100) }),
      car({ slug: "b", powerHp: hp(200) }),
    ];
    expect(compareWithinCategory(pool[0], pool)).toEqual([]);
  });

  it("counts only the cars that published the figure", () => {
    const pool = [
      car({ slug: "a", powerHp: hp(100) }),
      car({ slug: "b", powerHp: hp(200) }),
      car({ slug: "c", powerHp: hp(300) }),
      car({ slug: "d", powerHp: null }), // did not publish one
    ];
    const [power] = compareWithinCategory(pool[0], pool);
    expect(power.of).toBe(3);
    expect(power.rank).toBe(3);
  });

  it("ranks the other way round when a smaller number is better", () => {
    const pool = [
      car({ slug: "a", weightKg: hp(1000) }),
      car({ slug: "b", weightKg: hp(1500) }),
      car({ slug: "c", weightKg: hp(2000) }),
    ];
    const lightest = compareWithinCategory(pool[0], pool)[0];
    const heaviest = compareWithinCategory(pool[2], pool)[0];
    expect(lightest.lowerIsBetter).toBe(true);
    expect(lightest.rank).toBe(1);
    expect(heaviest.rank).toBe(3);
  });

  it("gives tied cars the same rank", () => {
    const pool = [
      car({ slug: "a", powerHp: hp(300) }),
      car({ slug: "b", powerHp: hp(300) }),
      car({ slug: "c", powerHp: hp(100) }),
    ];
    expect(compareWithinCategory(pool[0], pool)[0].rank).toBe(1);
    expect(compareWithinCategory(pool[1], pool)[0].rank).toBe(1);
  });

  it("places every value on the track between 0 and 1", () => {
    for (const c of CARS) {
      for (const cmp of compareWithinCategory(c)) {
        expect(cmp.fraction).toBeGreaterThanOrEqual(0);
        expect(cmp.fraction).toBeLessThanOrEqual(1);
        expect(cmp.medianFraction).toBeGreaterThanOrEqual(0);
        expect(cmp.medianFraction).toBeLessThanOrEqual(1);
      }
    }
  });

  it("survives every car in the catalogue without producing nonsense", () => {
    for (const c of CARS) {
      for (const cmp of compareWithinCategory(c)) {
        expect(cmp.rank).toBeGreaterThanOrEqual(1);
        expect(cmp.rank).toBeLessThanOrEqual(cmp.of);
        expect(cmp.of).toBeGreaterThanOrEqual(3);
        expect(cmp.min).toBeLessThanOrEqual(cmp.value);
        expect(cmp.max).toBeGreaterThanOrEqual(cmp.value);
      }
    }
  });

  it("never charts a figure the car does not have", () => {
    for (const c of CARS) {
      for (const cmp of compareWithinCategory(c)) {
        expect(c[cmp.key], `${c.slug}.${cmp.key}`).not.toBeNull();
      }
    }
  });

  it("gives a real car something worth charting", () => {
    const rows = compareWithinCategory(CAR_BY_SLUG["rimac-nevera"]);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const power = rows.find((r) => r.key === "powerHp");
    expect(power?.rank).toBe(1); // the most powerful hypercar in the catalogue
  });
});

describe("a runaway top figure does not flatten everyone else", () => {
  const spread = (...v: number[]) => v.map((n, i) => car({ slug: "c" + i, powerHp: hp(n) }));

  it("clips the axis at the runner-up when the leader is far clear", () => {
    const pool = spread(100, 180, 200, 900);
    const [r] = compareWithinCategory(pool[1], pool);
    expect(r.max).toBe(900);
    expect(r.scaleMax).toBe(200); // the field, not the freak
    expect(r.overScale).toBe(false);
  });

  it("marks the car that runs off the end of its own track", () => {
    const pool = spread(100, 180, 200, 900);
    const [r] = compareWithinCategory(pool[3], pool);
    expect(r.overScale).toBe(true);
    expect(r.value).toBeGreaterThan(r.scaleMax);
    expect(r.rank).toBe(1);
  });

  it("leaves an ordinary spread alone", () => {
    const pool = spread(400, 500, 600, 650);
    const [r] = compareWithinCategory(pool[0], pool);
    expect(r.scaleMax).toBe(r.max);
    expect(r.overScale).toBe(false);
  });

  it("will not clip a field too small to tell an outlier from a spread", () => {
    const pool = spread(100, 200, 900);
    const [r] = compareWithinCategory(pool[0], pool);
    expect(r.scaleMax).toBe(900);
  });

  // The examples above use their own pools on purpose. WHICH real rows clip is
  // a property of the data and moves every time a car is added -- the hypercar
  // torque row stopped clipping the moment the Regera went in -- so the real
  // catalogue is checked for the invariant instead of for a named car.
  it("always marks the car that ran off the end, whenever a track is clipped", () => {
    for (const c of CARS) {
      for (const cmp of compareWithinCategory(c)) {
        if (cmp.scaleMax >= cmp.max) {
          expect(cmp.overScale, `${c.slug}.${cmp.key}`).toBe(false);
          continue;
        }
        // A clipped track must leave the top figure visibly past its end, and
        // only the car holding that figure may be the one marked.
        expect(cmp.max, `${c.slug}.${cmp.key}`).toBeGreaterThan(cmp.scaleMax);
        expect(cmp.overScale, `${c.slug}.${cmp.key}`).toBe(cmp.value > cmp.scaleMax);
        if (cmp.overScale) expect(cmp.rank, `${c.slug}.${cmp.key}`).toBe(1);
      }
    }
  });

  it("never clips so hard that the median falls off the track", () => {
    // The median notch is positioned against scaleMax; if clipping could push
    // it past the end it would silently pile up on the right-hand edge.
    for (const c of CARS) {
      for (const cmp of compareWithinCategory(c)) {
        expect(cmp.median, `${c.slug}.${cmp.key}`).toBeLessThanOrEqual(cmp.scaleMax);
      }
    }
  });
});

describe("rankings say when they mix kinds of figure", () => {
  it("flags a peer set with both a maker's claim and a measured test", () => {
    const pool = [
      car({ slug: "a", zeroTo60S: { value: 4, source: "manufacturer" } }),
      car({ slug: "b", zeroTo60S: { value: 5, source: "independent" } }),
      car({ slug: "c", zeroTo60S: { value: 6, source: "manufacturer" } }),
    ];
    expect(compareWithinCategory(pool[0], pool)[0].mixedSources).toBe(true);
  });

  it("does not flag a peer set that is all one kind", () => {
    const pool = [
      car({ slug: "a", powerHp: hp(100) }),
      car({ slug: "b", powerHp: hp(200) }),
      car({ slug: "c", powerHp: hp(300) }),
    ];
    expect(compareWithinCategory(pool[0], pool)[0].mixedSources).toBe(false);
  });
});

describe("coverage", () => {
  it("counts how many of the five figures a car actually has", () => {
    expect(coverage(car({})).have).toBe(0);
    expect(coverage(car({ powerHp: hp(100), weightKg: hp(900) })).have).toBe(2);
    expect(coverage(car({})).of).toBe(5);
    // An absence with a reason leaves the denominator; a plain null does not.
    expect(coverage(car({ powerHp: { absent: "varies", why: "x" } })).of).toBe(4);
    expect(coverage(car({ powerHp: null })).of).toBe(5);
  });

  it("scores a car on what could be known, not on a flat five", () => {
    // This test used to assert that prototypes "come out sparse". They did --
    // 28% -- but only because they were being marked out of five measures when
    // two or three of those five are things nobody on earth publishes for a
    // Le Mans car. Counted against what is actually obtainable, prototypes are
    // among the best-documented things here, and the old number was measuring
    // the denominator rather than the catalogue.
    const protos = CARS.filter((c) => c.category === "prototype");
    expect(coverageOf(protos).pct).toBeGreaterThan(80);
    expect(coverageOf([]).pct).toBe(0);
  });

  it("drops a measure from the denominator only when a reason is recorded", () => {
    for (const c of CARS) {
      const cov = coverage(c);
      expect(cov.of + cov.structural, c.slug).toBe(cov.measures);
      expect(cov.have, c.slug).toBeLessThanOrEqual(cov.of);
      expect(cov.of, c.slug).toBeGreaterThanOrEqual(0);
    }
  });

  it("counts a car with nothing obtainable as complete rather than as zero", () => {
    // A car whose every measure is structurally absent is 0 of 0. Reporting
    // that as 0% would say we failed at something that cannot be done.
    expect(coverageOf([]).pct).toBe(0);
    const allAbsent = car({
      powerHp: { absent: "unpublished", why: "x" },
      torqueLbFt: { absent: "unpublished", why: "x" },
      weightKg: { absent: "unpublished", why: "x" },
      zeroTo60S: { absent: "unpublished", why: "x" },
      topSpeedMph: { absent: "unpublished", why: "x" },
    });
    expect(coverage(allAbsent)).toEqual({ have: 0, of: 0, measures: 5, structural: 5 });
    expect(coverageOf([allAbsent]).pct).toBe(0);
  });
});

describe("rank phrasing", () => {
  const base = { of: 10, lowerIsBetter: false } as never;
  const phrase = (rank: number, of = 10, lowerIsBetter = false) =>
    rankPhrase({ ...(base as object), rank, of, lowerIsBetter } as never);

  it("says what first place means rather than printing '1st'", () => {
    expect(phrase(1)).toBe("the highest of 10");
    expect(phrase(1, 10, true)).toBe("the lowest of 10");
  });

  it("gets its ordinals right, including the teens", () => {
    expect(phrase(2)).toBe("2nd of 10");
    expect(phrase(3)).toBe("3rd of 10");
    expect(phrase(4)).toBe("4th of 10");
    expect(phrase(11, 20)).toBe("11th of 20");
    expect(phrase(12, 20)).toBe("12th of 20");
    expect(phrase(13, 20)).toBe("13th of 20");
    expect(phrase(21, 30)).toBe("21st of 30");
  });
});
