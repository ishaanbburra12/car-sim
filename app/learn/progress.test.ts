import { describe, expect, it } from "vitest";
import { apply, totals, type Progress } from "./progress";

// The streak is the one piece of state a learner will notice being wrong, and
// it is date arithmetic, which is where bugs live. These test `apply`, the
// pure fold, rather than anything touching localStorage.

const EMPTY: Progress = { lessons: {}, answered: {}, correct: {}, streak: 0, lastDay: null };

describe("progress", () => {
  it("counts a first lesson and starts the streak at one", () => {
    const p = apply(EMPTY, "numbers", 6, 8, "2026-10-28");
    expect(p.lessons.numbers).toBe(1);
    expect(p.answered.numbers).toBe(8);
    expect(p.correct.numbers).toBe(6);
    expect(p.streak).toBe(1);
    expect(p.lastDay).toBe("2026-10-28");
  });

  it("does not grow the streak twice in one day", () => {
    let p = apply(EMPTY, "numbers", 8, 8, "2026-10-28");
    p = apply(p, "cars", 4, 8, "2026-10-28");
    expect(p.streak).toBe(1);
    expect(p.lessons.numbers).toBe(1);
    expect(p.lessons.cars).toBe(1);
  });

  it("grows the streak on consecutive days", () => {
    let p = apply(EMPTY, "mixed", 8, 8, "2026-10-28");
    p = apply(p, "mixed", 8, 8, "2026-10-29");
    p = apply(p, "mixed", 8, 8, "2026-10-30");
    expect(p.streak).toBe(3);
  });

  it("restarts the streak after a missed day", () => {
    let p = apply(EMPTY, "mixed", 8, 8, "2026-10-28");
    p = apply(p, "mixed", 8, 8, "2026-10-29");
    expect(p.streak).toBe(2);
    p = apply(p, "mixed", 8, 8, "2026-10-31");
    expect(p.streak).toBe(1);
  });

  it("survives a clock that went backwards rather than going negative", () => {
    let p = apply(EMPTY, "mixed", 8, 8, "2026-10-28");
    p = apply(p, "mixed", 8, 8, "2026-10-20");
    expect(p.streak).toBe(1);
  });

  it("carries a streak across a month boundary", () => {
    let p = apply(EMPTY, "mixed", 8, 8, "2026-10-31");
    p = apply(p, "mixed", 8, 8, "2026-11-01");
    expect(p.streak).toBe(2);
  });

  it("accumulates across units", () => {
    let p = apply(EMPTY, "numbers", 5, 8, "2026-10-28");
    p = apply(p, "cars", 7, 8, "2026-10-29");
    p = apply(p, "numbers", 8, 8, "2026-10-30");
    expect(totals(p)).toEqual({ lessons: 3, answered: 24, correct: 20 });
    expect(p.lessons.numbers).toBe(2);
  });
});
