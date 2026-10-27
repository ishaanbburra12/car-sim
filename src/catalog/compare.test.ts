import { describe, expect, it } from "vitest";
import { CARS, CAR_BY_SLUG } from "./index";
import { compareWithinCategory, rankPhrase } from "./compare";
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
  sources: ["s"],
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
