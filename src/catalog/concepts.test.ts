import { describe, expect, it } from "vitest";
import { CARS, CAR_BY_SLUG } from "./index";
import { CONCEPTS, CONCEPT_BY_SLUG, conceptsCiting, examplesOf } from "./concepts";

// The concepts pages are the only prose on this site that makes claims about
// cars other than the one you are reading about. That makes a stale example
// worse here than anywhere else: a concept that illustrates itself with a car
// whose figures have since changed is teaching something that is no longer
// true. These tests tie the prose to the data.

describe("concepts", () => {
  it("has a decent number of them, each properly written", () => {
    expect(CONCEPTS.length).toBeGreaterThanOrEqual(8);
    for (const c of CONCEPTS) {
      expect(c.slug, c.term).toMatch(/^[a-z0-9-]+$/);
      expect(c.term.length, c.slug).toBeGreaterThan(3);
      expect(c.short.length, c.slug).toBeGreaterThan(25);
      expect(c.body.length, `${c.slug} needs more than a sentence`).toBeGreaterThanOrEqual(2);
      for (const para of c.body) {
        expect(para.length, `${c.slug} has a stub paragraph`).toBeGreaterThan(120);
      }
    }
  });

  it("gives every concept a unique slug", () => {
    const slugs = CONCEPTS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("illustrates every concept with cars that actually exist here", () => {
    for (const c of CONCEPTS) {
      expect(c.examples.length, `${c.slug} has no examples`).toBeGreaterThan(0);
      for (const e of c.examples) {
        expect(CAR_BY_SLUG[e.car], `${c.slug} cites ${e.car}, which is not a car`).toBeDefined();
        expect(e.why.length, `${c.slug} -> ${e.car} needs a reason`).toBeGreaterThan(40);
      }
    }
  });

  it("does not cite the same car twice in one concept", () => {
    for (const c of CONCEPTS) {
      const cars = c.examples.map((e) => e.car);
      expect(new Set(cars).size, c.slug).toBe(cars.length);
    }
  });

  it("only cross-references concepts that exist, and never itself", () => {
    for (const c of CONCEPTS) {
      for (const slug of c.see ?? []) {
        expect(CONCEPT_BY_SLUG[slug], `${c.slug} -> ${slug}`).toBeDefined();
        expect(slug, `${c.slug} links to itself`).not.toBe(c.slug);
      }
    }
  });

  it("resolves every example to a real car object", () => {
    for (const c of CONCEPTS) {
      for (const e of examplesOf(c)) {
        expect(e.car, `${c.slug}`).toBeDefined();
        expect(e.car.name.length).toBeGreaterThan(0);
      }
    }
  });

  it("finds the concepts that cite a given car", () => {
    const cited = conceptsCiting("porsche-917");
    expect(cited.length).toBeGreaterThan(0);
    for (const c of cited) expect(c.examples.some((e) => e.car === "porsche-917")).toBe(true);
    expect(conceptsCiting("not-a-car")).toEqual([]);
  });

  it("spreads its examples across the catalogue rather than leaning on one car", () => {
    const counts = new Map<string, number>();
    for (const c of CONCEPTS) {
      for (const e of c.examples) counts.set(e.car, (counts.get(e.car) ?? 0) + 1);
    }
    // No single car should carry the whole site's teaching.
    for (const [car, n] of counts) expect(n, `${car} is cited ${n} times`).toBeLessThanOrEqual(3);
    expect(counts.size, "too few distinct cars used as examples").toBeGreaterThanOrEqual(12);
  });

  it("draws examples from more than one category", () => {
    const cats = new Set<string>();
    for (const c of CONCEPTS) {
      for (const e of c.examples) cats.add(CAR_BY_SLUG[e.car].category);
    }
    expect(cats.size).toBeGreaterThanOrEqual(3);
  });

  it("does not claim a car is an example of something its data no longer shows", () => {
    // Spot-checks that tie specific prose to specific data. If one of these
    // fails, the catalogue changed and the writing needs to change with it.
    const byCar = (slug: string) => CAR_BY_SLUG[slug];

    // "Reading a blank" says the 917 shows several kinds of absence at once.
    const p917 = byCar("porsche-917");
    const absences = [p917.weightKg, p917.torqueLbFt, p917.zeroTo60S, p917.topSpeedMph].filter(
      (f) => f !== null && typeof f === "object" && "absent" in f,
    );
    expect(absences.length, "the 917 no longer shows multiple kinds of blank").toBeGreaterThanOrEqual(3);

    // "Balance of Performance" says the 963's weight has no single value.
    const p963 = byCar("porsche-963");
    expect(p963.weightKg !== null && "absent" in p963.weightKg).toBe(true);

    // "When a maker simply stops saying" rests on the Model 3 having no power figure.
    const m3 = byCar("tesla-model-3");
    expect(m3.powerHp !== null && "absent" in m3.powerHp).toBe(true);

    // "Bounds" rests on LaFerrari's torque and sprint both being absent.
    const laf = byCar("ferrari-laferrari");
    expect(laf.torqueLbFt !== null && "absent" in laf.torqueLbFt).toBe(true);
    expect(laf.zeroTo60S !== null && "absent" in laf.zeroTo60S).toBe(true);
  });

  it("keeps the catalogue big enough for the examples to be representative", () => {
    expect(CARS.length).toBeGreaterThan(40);
  });
});
