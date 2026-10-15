import { describe, it, expect } from "vitest";
import { estimate, validateBuild, hpAt, partFitsCar, partsForCar, partCostMultiplier } from "./engine";
import { PULSE, PARTS } from "./data";
import { CARS } from "./cars";
import type { Car, Part } from "./types";

const all: string[] = PARTS.map((p) => p.id);

/**
 * One part per category: a legal full build. Since several categories now
 * offer a choice, "every part at once" is deliberately INVALID, so tests that
 * want a maximal build have to pick.
 */
function onePerCategory(parts: Part[] = PARTS): string[] {
  const byCat = new Map<string, string>();
  for (const p of parts) if (!byCat.has(p.category)) byCat.set(p.category, p.id);
  return [...byCat.values()];
}

describe("stock car sanity (fictional, but should be believable)", () => {
  const { stock } = estimate(PULSE, []);
  it("0-60 is in a plausible range for a 200 hp hatchback", () => {
    expect(stock.zeroToSixtyS).toBeGreaterThan(5);
    expect(stock.zeroToSixtyS).toBeLessThan(8);
  });
  it("top speed is plausible", () => {
    expect(stock.topSpeedMph).toBeGreaterThan(120);
    expect(stock.topSpeedMph).toBeLessThan(160);
  });
  it("60-0 braking distance is plausible", () => {
    expect(stock.brake60ToZeroFt).toBeGreaterThan(100);
    expect(stock.brake60ToZeroFt).toBeLessThan(150);
  });
  it("never produces NaN", () => {
    for (const v of Object.values(stock)) expect(Number.isNaN(v)).toBe(false);
  });
});

describe("power curve", () => {
  it("peaks at the peak rpm", () => {
    const peak = hpAt(5500, 200, 5500);
    expect(peak).toBeCloseTo(200, 5);
    expect(hpAt(5000, 200, 5500)).toBeLessThan(peak);
    expect(hpAt(6000, 200, 5500)).toBeLessThan(peak);
  });
});

describe("upgrades move stats in the right direction", () => {
  const stock = estimate(PULSE, []).stock;

  it("more power never lowers top speed or slows 0-60", () => {
    for (const id of ["exhaust-sport", "intake-cold-air", "turbo-upgrade"]) {
      const e = estimate(PULSE, [id]);
      expect(e.pessimistic.topSpeedMph).toBeGreaterThanOrEqual(stock.topSpeedMph - 0.5);
      expect(e.pessimistic.zeroToSixtyS).toBeLessThanOrEqual(stock.zeroToSixtyS + 0.05);
    }
  });

  it("turbo adds horsepower", () => {
    const e = estimate(PULSE, ["turbo-upgrade"]);
    expect(e.pessimistic.peakHp).toBeGreaterThanOrEqual(stock.peakHp + 40);
    expect(e.optimistic.peakHp).toBeGreaterThan(e.pessimistic.peakHp);
  });

  it("weight reduction speeds up acceleration", () => {
    const e = estimate(PULSE, ["weight-reduction"]);
    expect(e.pessimistic.zeroToSixtyS).toBeLessThan(stock.zeroToSixtyS);
    expect(e.pessimistic.massKg).toBeLessThan(stock.massKg);
  });

  it("big brakes shorten stopping distance", () => {
    const e = estimate(PULSE, ["brakes-big"]);
    expect(e.pessimistic.brake60ToZeroFt).toBeLessThan(stock.brake60ToZeroFt);
  });

  it("sport tires alone do NOT shorten braking (brakes are the limit)", () => {
    const e = estimate(PULSE, ["tires-sport"]);
    expect(e.pessimistic.brake60ToZeroFt).toBeCloseTo(stock.brake60ToZeroFt, 5);
    expect(e.pessimistic.lateralG).toBeGreaterThan(stock.lateralG);
  });

  it("brakes + tires together stop shorter than brakes alone (at the optimistic end)", () => {
    const brakes = estimate(PULSE, ["brakes-big"]).optimistic.brake60ToZeroFt;
    const both = estimate(PULSE, ["brakes-big", "tires-sport"]).optimistic.brake60ToZeroFt;
    expect(both).toBeLessThan(brakes);
  });
});

describe("ranges", () => {
  it("optimistic is never worse than pessimistic for the full build", () => {
    const e = estimate(PULSE, all);
    expect(e.optimistic.peakHp).toBeGreaterThanOrEqual(e.pessimistic.peakHp);
    expect(e.optimistic.zeroToSixtyS).toBeLessThanOrEqual(e.pessimistic.zeroToSixtyS);
    expect(e.optimistic.quarterMileS).toBeLessThanOrEqual(e.pessimistic.quarterMileS);
    expect(e.optimistic.topSpeedMph).toBeGreaterThanOrEqual(e.pessimistic.topSpeedMph);
    expect(e.optimistic.brake60ToZeroFt).toBeLessThanOrEqual(e.pessimistic.brake60ToZeroFt);
  });
});

describe("stacking", () => {
  it("combined power gain is less than the sum of individual gains", () => {
    const sumIndividual = ["exhaust-sport", "intake-cold-air", "turbo-upgrade"]
      .map((id) => estimate(PULSE, [id]).optimistic.peakHp - PULSE.stockHp)
      .reduce((a, b) => a + b, 0);
    const combined = estimate(PULSE, ["exhaust-sport", "intake-cold-air", "turbo-upgrade"]).optimistic.peakHp - PULSE.stockHp;
    expect(combined).toBeLessThan(sumIndividual);
    expect(combined).toBeGreaterThan(0);
  });

  it("order of parts does not change the result", () => {
    const a = estimate(PULSE, ["exhaust-sport", "turbo-upgrade", "intake-cold-air"]);
    const b = estimate(PULSE, ["turbo-upgrade", "intake-cold-air", "exhaust-sport"]);
    expect(a.optimistic.peakHp).toBeCloseTo(b.optimistic.peakHp, 8);
  });
});

describe("cost", () => {
  it("total = base price + sum of part costs", () => {
    const expected = PULSE.basePriceUsd + PARTS.reduce((s, p) => s + p.costUsd, 0);
    expect(estimate(PULSE, all).pessimistic.totalCostUsd).toBe(expected);
  });
  it("empty build costs the base price", () => {
    expect(estimate(PULSE, []).stock.totalCostUsd).toBe(PULSE.basePriceUsd);
  });
});

describe("validation", () => {
  it("accepts one part from each category", () => {
    expect(validateBuild(onePerCategory())).toEqual([]);
  });

  it("rejects selecting every part at once, because categories clash", () => {
    // There are two exhausts, two tire choices and two weight parts.
    const errs = validateBuild(all);
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.every((e) => /Two \w+ parts/.test(e))).toBe(true);
  });
  it("flags unknown parts", () => {
    expect(validateBuild(["not-a-part"])[0]).toMatch(/Unknown part/);
  });
  it("flags two parts in the same category", () => {
    const twin: Part = { ...PARTS[0], id: "exhaust-2" };
    const errs = validateBuild(["exhaust-sport", "exhaust-2"], [...PARTS, twin]);
    expect(errs[0]).toMatch(/Two exhaust/);
  });
  it("flags a missing requirement", () => {
    const needy: Part = { ...PARTS[1], id: "needs-turbo", requires: ["turbo-upgrade"] };
    const errs = validateBuild(["needs-turbo"], [...PARTS, needy]);
    expect(errs[0]).toMatch(/requires turbo-upgrade/);
  });
  it("flags a conflict", () => {
    const rival: Part = { ...PARTS[2], id: "supercharger", category: "intake", conflictsWith: ["turbo-upgrade"] };
    const errs = validateBuild(["turbo-upgrade", "supercharger"], [...PARTS, rival]);
    expect(errs.some((e) => /conflicts with/.test(e))).toBe(true);
  });
});

// ---- Phase 1: downforce, power-curve shapes, AWD ----

/** A copy of the Pulse with wings bolted on, for testing aero only. */
const WINGED: Car = { ...PULSE, id: "winged", clA: 3.0, brakeLimitG: 2.0 };
/** Same strong brakes, no wing, so the braking test isolates aero. */
const UNWINGED: Car = { ...PULSE, id: "unwinged", clA: 0, brakeLimitG: 2.0 };

describe("downforce", () => {
  it("does nothing for a car with clA = 0", () => {
    // The Pulse's cornering grip should still be exactly its tire grip.
    expect(estimate(PULSE, []).stock.lateralG).toBeCloseTo(PULSE.tireMu, 10);
  });

  it("raises cornering grip above tire grip", () => {
    const winged = estimate(WINGED, []).stock;
    expect(winged.lateralG).toBeGreaterThan(WINGED.tireMu);
  });

  it("shortens braking, because grip is higher while the car is still fast", () => {
    const plain = estimate(UNWINGED, []).stock.brake60ToZeroFt;
    const winged = estimate(WINGED, []).stock.brake60ToZeroFt;
    expect(winged).toBeLessThan(plain);
  });

  it("does not shorten braking when the brakes are the limit", () => {
    // Weak brakes, sticky tires: downforce adds grip the brakes cannot use.
    const weakBrakes: Car = { ...PULSE, brakeLimitG: 0.5, tireMu: 1.2 };
    const weakWinged: Car = { ...weakBrakes, clA: 3.0 };
    expect(estimate(weakWinged, []).stock.brake60ToZeroFt).toBeCloseTo(
      estimate(weakBrakes, []).stock.brake60ToZeroFt,
      6,
    );
  });

  it("never produces NaN for a high-downforce car", () => {
    for (const v of Object.values(estimate(WINGED, []).stock)) {
      expect(Number.isNaN(v)).toBe(false);
    }
  });
});

describe("power curve shapes", () => {
  it("both shapes peak at the peak rpm", () => {
    for (const type of ["turbo", "na"] as const) {
      expect(hpAt(5500, 200, 5500, type)).toBeCloseTo(200, 5);
      expect(hpAt(5000, 200, 5500, type)).toBeLessThan(200);
      expect(hpAt(6000, 200, 5500, type)).toBeLessThan(200);
    }
  });

  it("defaults to the turbo shape when no type is given", () => {
    expect(hpAt(3000, 200, 5500)).toBeCloseTo(hpAt(3000, 200, 5500, "turbo"), 10);
  });

  it("the NA shape gives away low-rpm power", () => {
    // At 40% of peak rpm the turbo curve should be comfortably ahead.
    expect(hpAt(2200, 200, 5500, "na")).toBeLessThan(hpAt(2200, 200, 5500, "turbo"));
  });

  it("an NA car is slower off the line than an identical turbo car", () => {
    const na: Car = { ...PULSE, id: "na", engineType: "na" };
    expect(estimate(na, []).stock.zeroToSixtyS).toBeGreaterThan(
      estimate(PULSE, []).stock.zeroToSixtyS,
    );
  });
});

describe("drivetrain", () => {
  it("accepts AWD and puts more power down than FWD", () => {
    const fwd: Car = { ...PULSE, drivetrain: "FWD", tractionFraction: 0.65 };
    const awd: Car = { ...PULSE, drivetrain: "AWD", tractionFraction: 1.0 };
    expect(estimate(awd, []).stock.zeroToSixtyS).toBeLessThan(
      estimate(fwd, []).stock.zeroToSixtyS,
    );
  });
});

describe("the Pulse is unchanged by the Phase 1 physics", () => {
  // Locked-in values from before downforce and curve shapes were added.
  it("matches the pre-change numbers", () => {
    const s = estimate(PULSE, []).stock;
    expect(s.zeroToSixtyS).toBeCloseTo(6.065, 3);
    expect(s.topSpeedMph).toBeCloseTo(143.231, 3);
    expect(s.brake60ToZeroFt).toBeCloseTo(126.636154, 6);
    expect(s.lateralG).toBeCloseTo(1.0, 10);
  });
});

// ---- Phase 2: do the real cars behave like the real cars? ----
// These compare our model against published figures. They are the closest
// thing this project has to a reality check, so they are deliberately loose:
// within 10% is a pass. A tighter bound would just be curve-fitting.

describe("real cars land near their published figures", () => {
  for (const car of CARS.filter((c) => c.isReal)) {
    const stock = estimate(car, []).stock;

    it(`${car.name}: 0-60 within 10% of published`, () => {
      const published = car.published?.zeroToSixtyS;
      expect(published).toBeDefined();
      // Compare like with like: published US figures allow a 1-foot rollout.
      const error = Math.abs(stock.zeroToSixtyRolloutS - published!) / published!;
      expect(error).toBeLessThan(0.1);
    });

    it(`${car.name}: top speed within 10% of published`, () => {
      const published = car.published?.topSpeedMph;
      expect(published).toBeDefined();
      const error = Math.abs(stock.topSpeedMph - published!) / published!;
      expect(error).toBeLessThan(0.1);
    });

    it(`${car.name}: produces no NaN`, () => {
      for (const v of Object.values(stock)) expect(Number.isNaN(v)).toBe(false);
    });

    it(`${car.name}: cites its sources`, () => {
      expect(car.sources?.length ?? 0).toBeGreaterThan(0);
    });
  }
});

describe("rollout timing", () => {
  it("is always quicker than a true standstill run", () => {
    for (const car of CARS) {
      const s = estimate(car, []).stock;
      expect(s.zeroToSixtyRolloutS).toBeLessThan(s.zeroToSixtyS);
    }
  });

  it("differs by roughly the time to cover one foot", () => {
    const s = estimate(PULSE, []).stock;
    const gap = s.zeroToSixtyS - s.zeroToSixtyRolloutS;
    expect(gap).toBeGreaterThan(0.1);
    expect(gap).toBeLessThan(1.0);
  });
});

describe("gearbox speed", () => {
  it("a quicker shift makes a quicker car", () => {
    const slow: Car = { ...PULSE, shiftTimeS: 0.4 };
    const fast: Car = { ...PULSE, shiftTimeS: 0.05 };
    expect(estimate(fast, []).stock.zeroToSixtyS).toBeLessThan(
      estimate(slow, []).stock.zeroToSixtyS,
    );
  });
});

// ---- Phase 3: part fitment ----

describe("part fitment", () => {
  it("a turbo kit does not fit a naturally aspirated car", () => {
    const gt3 = CARS.find((c) => c.id === "gt3rs-992")!;
    const turbo = PARTS.find((p) => p.id === "turbo-upgrade")!;
    expect(partFitsCar(turbo, gt3)).toBe(false);
    expect(partFitsCar(turbo, PULSE)).toBe(true);
  });

  it("parts with no rules fit every car", () => {
    const exhaust = PARTS.find((p) => p.id === "exhaust-sport")!;
    for (const car of CARS) expect(partFitsCar(exhaust, car)).toBe(true);
  });

  it("partsForCar never returns a part that does not fit", () => {
    for (const car of CARS) {
      for (const p of partsForCar(car)) expect(partFitsCar(p, car)).toBe(true);
    }
  });

  it("every car can fit at least one part", () => {
    for (const car of CARS) expect(partsForCar(car).length).toBeGreaterThan(0);
  });

  it("validation explains why a part does not fit", () => {
    const gt3 = CARS.find((c) => c.id === "gt3rs-992")!;
    const errs = validateBuild(["turbo-upgrade"], PARTS, gt3);
    expect(errs[0]).toMatch(/does not fit/);
    expect(errs[0]).toMatch(/naturally aspirated/);
  });

  it("estimate() reports the same error", () => {
    const gt3 = CARS.find((c) => c.id === "gt3rs-992")!;
    expect(estimate(gt3, ["turbo-upgrade"]).errors.length).toBeGreaterThan(0);
  });

  it("validation without a car still ignores fitment", () => {
    // A turbo kit on its own is fine when no car is supplied to check against.
    expect(validateBuild(["turbo-upgrade"])).toEqual([]);
  });

  it("every fitting build for every car validates clean", () => {
    for (const car of CARS) {
      const ids = onePerCategory(partsForCar(car));
      expect(estimate(car, ids).errors).toEqual([]);
    }
  });
});

// ---- Phase 3b: percentage gains and aero parts ----

describe("power gains scale with the engine", () => {
  it("the same part is worth more horsepower on a bigger engine", () => {
    const gtr = CARS.find((c) => c.id === "gtr-r35")!;
    const smallGain = estimate(PULSE, ["turbo-upgrade"]).optimistic.peakHp - PULSE.stockHp;
    const bigGain = estimate(gtr, ["turbo-upgrade"]).optimistic.peakHp - gtr.stockHp;
    expect(bigGain).toBeGreaterThan(smallGain * 2);
  });

  it("but the same PERCENTAGE on both", () => {
    const gtr = CARS.find((c) => c.id === "gtr-r35")!;
    const pctPulse = estimate(PULSE, ["turbo-upgrade"]).optimistic.peakHp / PULSE.stockHp;
    const pctGtr = estimate(gtr, ["turbo-upgrade"]).optimistic.peakHp / gtr.stockHp;
    expect(pctPulse).toBeCloseTo(pctGtr, 6);
  });

  it("the Pulse's old fixed-horsepower figures are preserved exactly", () => {
    // The percentages were calibrated against the Pulse's 200 hp, so the
    // original +40 to +90 hp turbo gain must come out unchanged.
    const e = estimate(PULSE, ["turbo-upgrade"]);
    expect(e.pessimistic.peakHp).toBeCloseTo(240, 10);
    expect(e.optimistic.peakHp).toBeCloseTo(290, 10);
  });
});

describe("aero parts", () => {
  const withWing = estimate(PULSE, ["aero-package"]);
  const stock = estimate(PULSE, []).stock;

  it("add cornering grip", () => {
    expect(withWing.pessimistic.lateralG).toBeGreaterThan(stock.lateralG);
  });

  it("cost top speed, because downforce is not free", () => {
    expect(withWing.optimistic.topSpeedMph).toBeLessThan(stock.topSpeedMph);
  });

  it("the optimistic case is not better in every way", () => {
    // More downforce means more drag, so the "optimistic" wing is the SLOWER
    // one in a straight line. An honest range has to allow that.
    expect(withWing.optimistic.topSpeedMph).toBeLessThan(
      withWing.pessimistic.topSpeedMph,
    );
  });
});

describe("the expanded parts list stays consistent", () => {
  it("every part declares every effect field", () => {
    for (const p of PARTS) {
      for (const r of [p.hpGainPct, p.massChangeKg, p.tireMuAdd, p.brakeLimitAddG, p.cdAdd, p.clAAdd]) {
        expect(Number.isFinite(r.low)).toBe(true);
        expect(Number.isFinite(r.high)).toBe(true);
      }
    }
  });

  it("every part that does not fit somewhere explains why", () => {
    for (const p of PARTS) {
      if (p.fits) expect(p.fits.reason.length).toBeGreaterThan(10);
    }
  });

  it("no car ends up with an empty category it cannot fill", () => {
    for (const car of CARS) {
      const cats = new Set(partsForCar(car).map((p) => p.category));
      expect(cats.size).toBeGreaterThan(1);
    }
  });
});

// ---- Part cost scaling ----

describe("part prices scale with the car", () => {
  const gtr = CARS.find((c) => c.id === "gtr-r35")!;
  const gt3 = CARS.find((c) => c.id === "gt3rs-992")!;

  it("the reference car's prices are untouched", () => {
    expect(partCostMultiplier(PULSE)).toBe(1);
    const cost = estimate(PULSE, ["turbo-upgrade"]).pessimistic.totalCostUsd;
    expect(cost).toBe(PULSE.basePriceUsd + 3200);
  });

  it("a dearer car pays more for the same part", () => {
    const pulse = estimate(PULSE, ["exhaust-sport"]).pessimistic.totalCostUsd - PULSE.basePriceUsd;
    const gtrCost = estimate(gtr, ["exhaust-sport"]).pessimistic.totalCostUsd - gtr.basePriceUsd;
    expect(gtrCost).toBeGreaterThan(pulse);
  });

  it("scales by the square root, not linearly", () => {
    // The GT3 RS costs ~9.3x the Pulse, so parts should be ~3x, not ~9x.
    const m = partCostMultiplier(gt3);
    expect(m).toBeGreaterThan(2.5);
    expect(m).toBeLessThan(3.5);
  });

  it("never discounts a cheap car below list price", () => {
    const cheap: Car = { ...PULSE, basePriceUsd: 5000 };
    expect(partCostMultiplier(cheap)).toBe(1);
  });

  it("is still exact arithmetic, not a range", () => {
    for (const car of CARS) {
      const e = estimate(car, ["exhaust-sport"]);
      expect(e.pessimistic.totalCostUsd).toBe(e.optimistic.totalCostUsd);
    }
  });
});
