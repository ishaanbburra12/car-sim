import { describe, expect, it } from "vitest";
import { CARS, CAR_BY_SLUG, BRAND_BY_SLUG } from "../catalog";
import { isAbsence, isFigure, type Figure } from "../catalog/types";
import { MEASURES, type Measure } from "../catalog/compare";
import { CONCEPT_BY_SLUG } from "../catalog/concepts";
import {
  LESSON_LENGTH,
  UNITS,
  buildLesson,
  buildPool,
  rng,
  type Question,
  type UnitId,
} from "./questions";

// A quiz that marks a right answer wrong is worse than no quiz: it teaches
// the opposite of the thing, and the learner has no way to tell. So these
// tests do not just check the shape of a question -- they re-derive the
// correct answer from the catalogue and check the key against it.

const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);

function everyQuestion(): Question[] {
  const out: Question[] = [];
  for (const unit of UNITS) {
    for (const seed of SEEDS) out.push(...buildLesson(unit.id, seed));
  }
  return out;
}

const ALL = everyQuestion();
const SPEC = Object.fromEntries(MEASURES.map((m) => [m.key, m])) as Record<
  Measure,
  (typeof MEASURES)[number]
>;

describe("the question engine", () => {
  it("produced a decent sample to test against", () => {
    expect(ALL.length).toBeGreaterThan(1000);
  });

  it("gives every unit a full lesson, for every seed", () => {
    for (const unit of UNITS) {
      for (const seed of SEEDS) {
        const lesson = buildLesson(unit.id, seed);
        expect(lesson.length, `${unit.id} @ ${seed}`).toBe(LESSON_LENGTH);
      }
    }
  });

  it("never repeats a question inside one lesson", () => {
    for (const unit of UNITS) {
      for (const seed of SEEDS) {
        const ids = buildLesson(unit.id, seed).map((q) => q.id);
        expect(new Set(ids).size, `${unit.id} @ ${seed}`).toBe(ids.length);
      }
    }
  });

  it("is deterministic: the same seed gives the same lesson", () => {
    for (const unit of UNITS) {
      const a = buildLesson(unit.id, 4242).map((q) => q.id);
      const b = buildLesson(unit.id, 4242).map((q) => q.id);
      expect(b).toEqual(a);
    }
  });

  it("gives different seeds different lessons", () => {
    const a = buildLesson("mixed", 1).map((q) => q.id).join();
    const b = buildLesson("mixed", 2).map((q) => q.id).join();
    expect(a).not.toBe(b);
  });

  it("returns nothing for a unit that does not exist", () => {
    expect(buildLesson("nope" as UnitId, 1)).toEqual([]);
  });

  it("always has the answer among the choices", () => {
    for (const q of ALL) {
      const ids = q.choices.map((c) => c.id);
      expect(ids, `${q.id}`).toContain(q.answer);
    }
  });

  it("offers distinct choices, at least two of them", () => {
    for (const q of ALL) {
      expect(q.choices.length, q.id).toBeGreaterThanOrEqual(2);
      const ids = q.choices.map((c) => c.id);
      expect(new Set(ids).size, `${q.id} repeats a choice`).toBe(ids.length);
      const labels = q.choices.map((c) => c.label);
      expect(new Set(labels).size, `${q.id} shows the same label twice`).toBe(labels.length);
    }
  });

  it("writes a real prompt and a real explanation every time", () => {
    for (const q of ALL) {
      expect(q.prompt.length, q.id).toBeGreaterThan(10);
      expect(q.explain.length, `${q.id} has a thin explanation`).toBeGreaterThan(30);
      if (q.link) {
        expect(q.link.href, q.id).toMatch(/^\/(cars|brands|concepts)(\/|\?)/);
        expect(q.link.label.length, q.id).toBeGreaterThan(5);
      }
    }
  });
});

describe("the answers are actually right", () => {
  // The id encodes the measure and the cars, so the key can be re-derived.
  const biggerParts = (q: Question) => {
    const [, measure, slugs] = q.id.split(":") as [string, Measure, string];
    return { measure, cars: slugs.split("+").map((s) => CAR_BY_SLUG[s]) };
  };
  const ranked = (measure: Measure, f: Figure) =>
    SPEC[measure].lowerIsBetter ? (f.high ?? f.value) : f.value;

  it("picks the genuinely best of the field, by the measure asked", () => {
    const qs = ALL.filter((q) => q.kind === "bigger");
    expect(qs.length).toBeGreaterThan(50);
    for (const q of qs) {
      const { measure, cars } = biggerParts(q);
      const spec = SPEC[measure];
      const sorted = [...cars].sort((x, y) => {
        const vx = ranked(measure, x[measure] as Figure);
        const vy = ranked(measure, y[measure] as Figure);
        return spec.lowerIsBetter ? vx - vy : vy - vx;
      });
      expect(q.answer, q.id).toBe(sorted[0].slug);
    }
  });

  it("asks about three or four cars, never two", () => {
    for (const q of ALL.filter((x) => x.kind === "bigger")) {
      expect(q.choices.length, q.id).toBeGreaterThanOrEqual(3);
      expect(q.choices.length, q.id).toBeLessThanOrEqual(4);
      expect(biggerParts(q).cars.length, q.id).toBe(q.choices.length);
    }
  });

  it("never pits two different sprints against each other", () => {
    // The site has a whole page explaining why that comparison is invalid.
    // Setting it as a question would be teaching the mistake.
    const basis = (f: Figure) => {
      const n = (f.note ?? "").toLowerCase();
      if (n.includes("rollout")) return "rollout";
      if (n.includes("km/h")) return "kmh";
      if (n.includes("60 mph")) return "mph";
      return null;
    };
    for (const q of ALL.filter((x) => x.kind === "bigger" && x.id.includes(":zeroTo60S:"))) {
      const bases = biggerParts(q).cars.map((c) => basis(c.zeroTo60S as Figure));
      expect(bases.every((b) => b !== null), q.id).toBe(true);
      expect(new Set(bases).size, `${q.id} compares different sprints`).toBe(1);
    }
  });

  it("only asks when the winner is clear of the runner-up", () => {
    for (const q of ALL.filter((x) => x.kind === "bigger")) {
      const { measure, cars } = biggerParts(q);
      const spec = SPEC[measure];
      const vals = cars
        .map((c) => ranked(measure, c[measure] as Figure))
        .sort((a, b) => (spec.lowerIsBetter ? a - b : b - a));
      const gap = Math.abs(vals[0] - vals[1]) / Math.max(vals[0], vals[1]);
      expect(gap, `${q.id} is a coin toss`).toBeGreaterThanOrEqual(0.08);
    }
  });

  it("compares cars of the same kind", () => {
    for (const q of ALL.filter((x) => x.kind === "bigger")) {
      const cats = new Set(biggerParts(q).cars.map((c) => c.category));
      expect(cats.size, q.id).toBe(1);
    }
  });

  it("gets the provenance of a figure right, including when there isn't one", () => {
    const qs = ALL.filter((q) => q.kind === "whose-figure");
    expect(qs.length).toBeGreaterThan(50);
    for (const q of qs) {
      const [, measure, slug] = q.id.split(":") as [string, Measure, string];
      const f = CAR_BY_SLUG[slug][measure];
      if (q.answer === "none") {
        // "Nobody has published one" is only ever right for a figure marked
        // unpublished. A weight that varies by trim HAS been published, just
        // not as one number, so it must never be the answer here.
        expect(isAbsence(f), q.id).toBe(true);
        expect((f as { absent: string }).absent, q.id).toBe("unpublished");
      } else {
        expect(isFigure(f), q.id).toBe(true);
        expect(q.answer, q.id).toBe((f as Figure).source);
      }
    }
  });

  it("offers 'nobody published one' as a live answer, not scenery", () => {
    // If the third option were never correct, the question would be the
    // two-way coin toss it used to be with extra steps.
    const qs = ALL.filter((q) => q.kind === "whose-figure");
    const none = qs.filter((q) => q.answer === "none");
    expect(none.length, "the third option is never the answer").toBeGreaterThan(20);
    expect(none.length / qs.length, "the third option is the answer too often").toBeLessThan(0.6);
    for (const q of qs) expect(q.choices.length, q.id).toBe(3);
  });

  it("identifies the sprint from the car's own note", () => {
    const qs = ALL.filter((q) => q.kind === "which-sprint");
    expect(qs.length).toBeGreaterThan(20);
    for (const q of qs) {
      const slug = q.id.split(":")[1];
      const note = ((CAR_BY_SLUG[slug].zeroTo60S as Figure).note ?? "").toLowerCase();
      const expected = note.includes("rollout") ? "rollout" : note.includes("km/h") ? "kmh" : "mph";
      expect(q.answer, q.id).toBe(expected);
    }
  });

  it("gets the kind of blank right", () => {
    const qs = ALL.filter((q) => q.kind === "reading-a-blank");
    expect(qs.length).toBeGreaterThan(50);
    for (const q of qs) {
      const [, slug, measure] = q.id.split(":") as [string, string, Measure];
      const f = CAR_BY_SLUG[slug][measure];
      expect(isAbsence(f), q.id).toBe(true);
      expect(q.answer, q.id).toBe((f as { absent: string }).absent);
      // The explanation is the car's own stated reason, not a generic line.
      expect(q.explain).toBe((f as { why: string }).why);
    }
  });

  it("names the right maker", () => {
    for (const q of ALL.filter((x) => x.kind === "which-maker")) {
      const slug = q.id.split(":")[1];
      expect(q.answer, q.id).toBe(CAR_BY_SLUG[slug].brand);
      expect(BRAND_BY_SLUG[q.answer], q.id).toBeDefined();
    }
  });

  it("names the right idea, and quotes that idea's own example", () => {
    for (const q of ALL.filter((x) => x.kind === "which-idea")) {
      const [, conceptSlug, carSlug] = q.id.split(":");
      const concept = CONCEPT_BY_SLUG[q.answer];
      expect(concept, q.id).toBeDefined();
      expect(q.answer, q.id).toBe(conceptSlug);
      const example = concept.examples.find((e) => e.car === carSlug);
      expect(example, `${q.id} cites an example the concept does not have`).toBeDefined();
      expect(q.context).toBe(example!.why);
    }
  });
});

describe("the random number generator", () => {
  it("repeats for a seed and differs across seeds", () => {
    const a = Array.from({ length: 20 }, rng(99));
    const b = Array.from({ length: 20 }, rng(99));
    const c = Array.from({ length: 20 }, rng(100));
    expect(b).toEqual(a);
    expect(c).not.toEqual(a);
  });

  it("stays inside [0, 1)", () => {
    const r = rng(7);
    for (let i = 0; i < 2000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("the newer question kinds", () => {
  it("picks a genuine odd one out, by maker or by class", () => {
    const qs = ALL.filter((q) => q.kind === "odd-one-out");
    expect(qs.length).toBeGreaterThan(50);
    for (const q of qs) {
      const [, axis, slugs] = q.id.split(":");
      const cars = slugs.split("+").map((s) => CAR_BY_SLUG[s]);
      expect(cars.length, q.id).toBe(4);
      const odd = CAR_BY_SLUG[q.answer];
      const rest = cars.filter((c) => c.slug !== q.answer);
      expect(rest.length, q.id).toBe(3);
      const key = (c: (typeof cars)[number]) => (axis === "brand" ? c.brand : c.category);
      // the three share the trait
      expect(new Set(rest.map(key)).size, `${q.id}: the three do not match`).toBe(1);
      // and the odd one does not
      expect(key(odd), `${q.id}: the odd one matches the three`).not.toBe(key(rest[0]));
    }
  });

  it("never offers two cars with the same label in an odd-one-out", () => {
    // The brand variant shows bare model names, so two cars called the same
    // thing from different makers would make the question unanswerable.
    for (const q of ALL.filter((x) => x.kind === "odd-one-out")) {
      const labels = q.choices.map((c) => c.label);
      expect(new Set(labels).size, q.id).toBe(labels.length);
    }
  });

  it("gets the years right", () => {
    const qs = ALL.filter((q) => q.kind === "which-era");
    expect(qs.length).toBeGreaterThan(20);
    for (const q of qs) {
      const car = CAR_BY_SLUG[q.id.split(":")[1]];
      expect(q.answer, q.id).toBe(car.years);
      // and no second choice shares the right answer's text
      expect(q.choices.filter((c) => c.id === car.years).length, q.id).toBe(1);
    }
  });

  it("gets the production run right, and offers only real runs as distractors", () => {
    const real = new Set(CARS.filter((c) => c.produced).map((c) => c.produced!.count));
    const qs = ALL.filter((q) => q.kind === "how-many");
    expect(qs.length).toBeGreaterThan(10);
    for (const q of qs) {
      const car = CAR_BY_SLUG[q.id.split(":")[1]];
      expect(car.produced, q.id).not.toBeNull();
      expect(q.answer, q.id).toBe(String(car.produced!.count));
      for (const c of q.choices) {
        expect(real.has(Number(c.id)), `${q.id}: ${c.id} is not a real production run`).toBe(true);
      }
    }
  });

  it("only asks about an engine that belongs to exactly one car", () => {
    const qs = ALL.filter((q) => q.kind === "which-engine");
    expect(qs.length).toBeGreaterThan(20);
    for (const q of qs) {
      const car = CAR_BY_SLUG[q.id.split(":")[1]];
      expect(q.answer, q.id).toBe(car.slug);
      expect(q.context, q.id).toBe(car.engine);
      expect(CARS.filter((c) => c.engine === car.engine).length, `${q.id} is ambiguous`).toBe(1);
    }
  });

  it("covers every kind it advertises", () => {
    const kinds = new Set(ALL.map((q) => q.kind));
    for (const k of [
      "bigger",
      "whose-figure",
      "which-sprint",
      "reading-a-blank",
      "which-maker",
      "which-idea",
      "odd-one-out",
      "which-era",
      "how-many",
      "which-engine",
    ]) {
      expect(kinds.has(k as never), `${k} never got generated`).toBe(true);
    }
  });
});

describe("a lesson is a mix, not whatever was easiest to draw", () => {
  // This is the regression that prompted the test. `biggerQuestion` declines
  // well over half its draws, because it needs three or four cars in one
  // category that all published the same measure. With the old loop the easy
  // generators filled the pool first and comparisons appeared once in
  // twenty-eight, never inside the first eight. Nothing failed; the lesson
  // just silently lost a kind of question.

  it("gives every generator in a unit a roughly equal share of the pool", () => {
    for (const unit of UNITS) {
      for (const seed of [1, 2, 3, 99, 12345]) {
        const pool = buildPool(unit.id, seed);
        const counts = new Map<string, number>();
        for (const q of pool) counts.set(q.kind, (counts.get(q.kind) ?? 0) + 1);
        expect(counts.size, `${unit.id} @ ${seed} used too few kinds`).toBe(
          unit.generators.length,
        );
        const n = [...counts.values()];
        expect(
          Math.max(...n) - Math.min(...n),
          `${unit.id} @ ${seed} is lopsided: ${JSON.stringify([...counts])}`,
        ).toBeLessThanOrEqual(2);
      }
    }
  });

  it("covers every kind the unit offers inside a single lesson, where it can", () => {
    for (const unit of UNITS) {
      const expected = Math.min(unit.generators.length, LESSON_LENGTH);
      for (const seed of [7, 8, 404]) {
        const kinds = new Set(buildLesson(unit.id, seed).map((q) => q.kind));
        expect(kinds.size, `${unit.id} @ ${seed}`).toBeGreaterThanOrEqual(expected);
      }
    }
  });

  it("still fills a lesson even when a generator can never draw", () => {
    // Falling through to the other generators is what keeps a dead one from
    // stalling the whole lesson.
    for (const unit of UNITS) {
      expect(buildLesson(unit.id, 555).length).toBe(LESSON_LENGTH);
    }
  });
});
