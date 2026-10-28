import { describe, expect, it } from "vitest";
import {
  INTERVALS,
  apply,
  applyItem,
  dueCount,
  prune,
  selectDue,
  totals,
  type Items,
  type Progress,
} from "./progress";

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

describe("spaced repetition", () => {
  const q = (id: string) => ({ id });
  const pool = ["a", "b", "c", "d", "e"].map(q);

  it("moves an item up a box when answered correctly", () => {
    let items = applyItem({}, "a", true, "2026-10-28");
    expect(items.a.box).toBe(1);
    items = applyItem(items, "a", true, "2026-10-29");
    expect(items.a.box).toBe(2);
    expect(items.a.wrong).toBe(0);
  });

  it("knocks an item straight back to the bottom when answered wrong", () => {
    let items = applyItem({}, "a", true, "2026-10-28");
    items = applyItem(items, "a", true, "2026-10-29");
    items = applyItem(items, "a", true, "2026-10-30");
    expect(items.a.box).toBe(3);
    items = applyItem(items, "a", false, "2026-10-31");
    expect(items.a.box).toBe(0);
    expect(items.a.wrong).toBe(1);
  });

  it("does not climb past the last interval", () => {
    let items: Items = {};
    for (let i = 0; i < 20; i++) items = applyItem(items, "a", true, "2026-10-28");
    expect(items.a.box).toBe(INTERVALS.length - 1);
  });

  it("puts what you got wrong before what you have never seen", () => {
    const items = applyItem({}, "c", false, "2026-10-28");
    const picked = selectDue(pool, items, 3, "2026-10-28").map((x) => x.id);
    expect(picked[0]).toBe("c");
  });

  it("puts what you have never seen before what you already know", () => {
    let items: Items = {};
    items = applyItem(items, "a", true, "2026-10-28"); // box 1, due tomorrow
    const picked = selectDue(pool, items, 5, "2026-10-28").map((x) => x.id);
    // 'a' is not due today, so it sinks below everything unseen.
    expect(picked.indexOf("a")).toBe(picked.length - 1);
  });

  it("brings a known item back once its interval has passed", () => {
    const items = applyItem({}, "a", true, "2026-10-28"); // box 1 -> due in 1 day
    const sameDay = selectDue([q("a"), q("b")], items, 2, "2026-10-28").map((x) => x.id);
    expect(sameDay[0]).toBe("b"); // unseen first
    const later = selectDue([q("a"), q("b")], items, 2, "2026-10-29").map((x) => x.id);
    expect(later).toContain("a");
  });

  it("waits longer for an item answered right repeatedly", () => {
    let items = applyItem({}, "a", true, "2026-10-01");
    items = applyItem(items, "a", true, "2026-10-02");
    items = applyItem(items, "a", true, "2026-10-03"); // box 3 -> 7 days
    expect(dueCount(items, "2026-10-08")).toBe(0);
    expect(dueCount(items, "2026-10-10")).toBe(1);
  });

  it("breaks ties towards the question missed most often", () => {
    let items = applyItem({}, "d", false, "2026-10-28");
    items = applyItem(items, "d", false, "2026-10-28");
    items = applyItem(items, "b", false, "2026-10-28");
    const picked = selectDue(pool, items, 2, "2026-10-28").map((x) => x.id);
    expect(picked[0]).toBe("d");
  });

  it("still fills a lesson when nothing is due", () => {
    let items: Items = {};
    for (const x of pool) items = applyItem(items, x.id, true, "2026-10-28");
    const picked = selectDue(pool, items, 5, "2026-10-28");
    expect(picked.length).toBe(5);
  });

  it("never returns more than the pool holds, or repeats one", () => {
    const picked = selectDue(pool, {}, 99, "2026-10-28");
    expect(picked.length).toBe(pool.length);
    expect(new Set(picked.map((x) => x.id)).size).toBe(pool.length);
  });

  it("drops the oldest entries once the map is too big", () => {
    let items: Items = {};
    for (let i = 0; i < 10; i++) {
      items = applyItem(items, `q${i}`, true, `2026-10-${String(i + 10).padStart(2, "0")}`);
    }
    const kept = prune(items, 4);
    expect(Object.keys(kept).length).toBe(4);
    expect(kept.q9).toBeDefined(); // most recent survives
    expect(kept.q0).toBeUndefined(); // oldest does not
  });

  it("leaves a small map alone", () => {
    const items = applyItem({}, "a", true, "2026-10-28");
    expect(prune(items, 600)).toEqual(items);
  });
});
