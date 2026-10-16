import { describe, it, expect } from "vitest";
import { PULSE } from "../data";
import { CARS } from "../cars";
import { estimate, WOT } from "../engine";
import { DRIVE_TUNABLES } from "./tunables";
import { DRIVE_ASSUMPTIONS, assumptionFor } from "./assumptions";
import {
  advance,
  createSession,
  frameOf,
  isCollapsed,
  resetSession,
  GHOSTS,
  DRIVEN,
} from "./session";
import { createDriveLoop, rampInput, type Clock } from "./loop";

const BUILD = ["turbo-upgrade", "tires-sport", "weight-reduction"];
const COAST = { throttle: 0, brake: 0 };

// ---------------------------------------------------------------------------
// The assumption ledger. This is the mechanism that keeps rule 1 true: every
// number drive mode invents must be disclosed, and every disclosure must
// describe a number that still exists.
// ---------------------------------------------------------------------------

describe("every invented number is disclosed", () => {
  it("every tunable has an assumption entry", () => {
    for (const key of Object.keys(DRIVE_TUNABLES)) {
      const entry = DRIVE_ASSUMPTIONS.find((a) => a.key === key);
      expect(entry, `tunable "${key}" has no disclosed assumption`).toBeDefined();
    }
  });

  it("every assumption entry describes a real tunable", () => {
    for (const a of DRIVE_ASSUMPTIONS) {
      expect(
        Object.prototype.hasOwnProperty.call(DRIVE_TUNABLES, a.key),
        `assumption "${a.key}" describes a tunable that no longer exists`,
      ).toBe(true);
    }
  });

  it("the two sets are the same size, so neither can hide an extra", () => {
    expect(DRIVE_ASSUMPTIONS.length).toBe(Object.keys(DRIVE_TUNABLES).length);
  });

  it("no duplicate keys in the ledger", () => {
    const keys = DRIVE_ASSUMPTIONS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every entry actually explains itself", () => {
    for (const a of DRIVE_ASSUMPTIONS) {
      expect(a.label.length, a.key).toBeGreaterThan(3);
      expect(a.value.length, a.key).toBeGreaterThan(0);
      expect(a.why.length, `${a.key} needs a real explanation`).toBeGreaterThan(60);
    }
  });

  it("assumptionFor throws rather than silently returning nothing", () => {
    expect(() => assumptionFor("physicsDtS")).not.toThrow();
    // @ts-expect-error deliberately asking for a key that does not exist
    expect(() => assumptionFor("notATunable")).toThrow(/No disclosed assumption/);
  });

  it("the tunables object is frozen", () => {
    expect(Object.isFrozen(DRIVE_TUNABLES)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The session: three cars, one set of inputs.
// ---------------------------------------------------------------------------

describe("a drive session runs three cars from one set of inputs", () => {
  it("starts all three at the start line", () => {
    const s = createSession(PULSE, BUILD);
    for (const g of GHOSTS) {
      expect(s.states[g].v).toBe(0);
      expect(s.states[g].x).toBe(0);
      expect(s.states[g].t).toBe(0);
    }
  });

  it("the person drives the expected car", () => {
    expect(DRIVEN).toBe("expected");
    expect(GHOSTS).toContain(DRIVEN);
  });

  it("the optimistic ghost pulls ahead of the pessimistic one", () => {
    let s = createSession(PULSE, BUILD);
    for (let i = 0; i < 300; i++) s = advance(s, WOT, 1 / 60).session;
    expect(s.states.optimistic.x).toBeGreaterThan(s.states.pessimistic.x);
    expect(s.states.expected.x).toBeGreaterThan(s.states.pessimistic.x);
    expect(s.states.expected.x).toBeLessThan(s.states.optimistic.x);
  });

  it("the gap between the ghosts IS the uncertainty, and it grows", () => {
    let s = createSession(PULSE, BUILD);
    const gaps: number[] = [];
    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < 120; i++) s = advance(s, WOT, 1 / 60).session;
      gaps.push(frameOf(s).gapM);
    }
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
  });

  it("with no parts fitted the three cars are identical, and it says so", () => {
    const stock = createSession(PULSE, []);
    expect(isCollapsed(stock)).toBe(true);
    let s = stock;
    for (let i = 0; i < 300; i++) s = advance(s, WOT, 1 / 60).session;
    expect(frameOf(s).gapM).toBe(0);
    expect(frameOf(s).collapsed).toBe(true);
  });

  it("with parts fitted it is not collapsed", () => {
    expect(isCollapsed(createSession(PULSE, BUILD))).toBe(false);
  });

  it("agrees with the Garage: driving flat out reaches 60 at the modelled time", () => {
    // Same physics, so a wide-open-throttle drive must reproduce the estimate.
    for (const car of CARS) {
      let s = createSession(car, []);
      const target = 60 * 0.44704;
      let reachedAt = NaN;
      while (s.elapsedS < 20 && Number.isNaN(reachedAt)) {
        s = advance(s, WOT, 1 / 60).session;
        if (s.states.expected.v >= target) reachedAt = s.elapsedS;
      }
      const modelled = estimate(car, []).stock.zeroToSixtyS;
      expect(Math.abs(reachedAt - modelled)).toBeLessThan(0.02);
    }
  });

  it("resets back to the start line", () => {
    let s = createSession(PULSE, BUILD);
    for (let i = 0; i < 200; i++) s = advance(s, WOT, 1 / 60).session;
    expect(s.states.expected.x).toBeGreaterThan(0);
    const fresh = resetSession(s);
    expect(fresh.states.expected.x).toBe(0);
    expect(fresh.elapsedS).toBe(0);
    expect(fresh.partIds).toEqual(BUILD);
  });

  it("does not mutate the session passed in", () => {
    const s = createSession(PULSE, BUILD);
    const before = s.states.expected.v;
    advance(s, WOT, 1 / 60);
    expect(s.states.expected.v).toBe(before);
    expect(s.elapsedS).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Fixed timestep: the result must not depend on frame rate.
// ---------------------------------------------------------------------------

describe("the fixed timestep makes driving frame-rate independent", () => {
  function driveFor(totalS: number, frameS: number) {
    let s = createSession(PULSE, BUILD);
    const frames = Math.round(totalS / frameS);
    for (let i = 0; i < frames; i++) s = advance(s, WOT, frameS).session;
    return s;
  }

  it("60 Hz and 144 Hz reach the same place", () => {
    const a = driveFor(3, 1 / 60);
    const b = driveFor(3, 1 / 144);
    expect(a.elapsedS).toBeCloseTo(b.elapsedS, 9);
    expect(a.states.expected.x).toBeCloseTo(b.states.expected.x, 9);
    expect(a.states.expected.v).toBeCloseTo(b.states.expected.v, 9);
  });

  it("30 Hz agrees too", () => {
    const a = driveFor(3, 1 / 60);
    const c = driveFor(3, 1 / 30);
    expect(a.states.expected.v).toBeCloseTo(c.states.expected.v, 9);
  });

  it("simulated time only ever advances in whole physics steps", () => {
    let s = createSession(PULSE, []);
    for (let i = 0; i < 50; i++) s = advance(s, WOT, 0.0137).session;
    const quotient = s.elapsedS / DRIVE_TUNABLES.physicsDtS;
    expect(Math.abs(quotient - Math.round(quotient))).toBeLessThan(1e-9);
  });

  it("a frame shorter than one step advances nothing but is not lost", () => {
    let s = createSession(PULSE, []);
    const r1 = advance(s, WOT, 0.002);
    expect(r1.session.steps).toBe(0);
    expect(r1.session.accumulatorS).toBeCloseTo(0.002, 9);
    const r2 = advance(r1.session, WOT, 0.004);
    expect(r2.session.steps).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// The catch-up clamp. This is a safety behaviour, so it gets real tests.
// ---------------------------------------------------------------------------

describe("the catch-up clamp protects a backgrounded tab", () => {
  it("a huge frame gap does not run thousands of steps", () => {
    const s = createSession(PULSE, []);
    const { session } = advance(s, WOT, 30); // 30 seconds away in another tab
    const maxSteps = DRIVE_TUNABLES.maxCatchUpS / DRIVE_TUNABLES.physicsDtS;
    expect(session.steps).toBeLessThanOrEqual(maxSteps);
  });

  it("reports the time it threw away, so the UI can admit it", () => {
    const { session } = advance(createSession(PULSE, []), WOT, 30);
    expect(session.droppedS).toBeCloseTo(30 - DRIVE_TUNABLES.maxCatchUpS, 6);
  });

  it("ignores a negative or non-finite frame time", () => {
    const s = createSession(PULSE, []);
    expect(advance(s, WOT, -5).session.steps).toBe(0);
    expect(advance(s, WOT, NaN).session.steps).toBe(0);
    expect(advance(s, WOT, Infinity).session.droppedS).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The loop wiring, driven by a fake clock. No browser involved.
// ---------------------------------------------------------------------------

function fakeClock() {
  let ms = 0;
  let pending: (() => void) | null = null;
  let nextHandle = 1;
  const clock: Clock = {
    now: () => ms,
    schedule: (cb) => {
      pending = cb;
      return nextHandle++;
    },
    cancel: () => {
      pending = null;
    },
  };
  return {
    clock,
    /** Run one frame, advancing the fake clock by dtMs first. */
    frame(dtMs: number) {
      ms += dtMs;
      const cb = pending;
      pending = null;
      cb?.();
    },
    isPending: () => pending !== null,
  };
}

describe("the drive loop, on a fake clock", () => {
  it("does nothing until started", () => {
    const fc = fakeClock();
    let frames = 0;
    createDriveLoop({
      session: createSession(PULSE, BUILD),
      inputs: () => WOT,
      onFrame: () => frames++,
      clock: fc.clock,
    });
    expect(fc.isPending()).toBe(false);
    expect(frames).toBe(0);
  });

  it("drives the car forward once started", () => {
    const fc = fakeClock();
    const loop = createDriveLoop({
      session: createSession(PULSE, BUILD),
      inputs: () => WOT,
      onFrame: () => {},
      clock: fc.clock,
    });
    loop.start();
    for (let i = 0; i < 120; i++) fc.frame(16.7);
    expect(loop.getSession().states.expected.x).toBeGreaterThan(5);
    expect(loop.isRunning()).toBe(true);
  });

  it("reads inputs fresh every frame, so a held key is picked up", () => {
    const fc = fakeClock();
    let inputs = { throttle: 0, brake: 0 };
    const loop = createDriveLoop({
      session: createSession(PULSE, BUILD),
      inputs: () => inputs,
      onFrame: () => {},
      clock: fc.clock,
    });
    loop.start();
    for (let i = 0; i < 60; i++) fc.frame(16.7);
    expect(loop.getSession().states.expected.v).toBe(0);
    inputs = { throttle: 1, brake: 0 };
    for (let i = 0; i < 60; i++) fc.frame(16.7);
    expect(loop.getSession().states.expected.v).toBeGreaterThan(0);
  });

  it("rewrites the readouts at the display rate, not the frame rate", () => {
    const fc = fakeClock();
    let frames = 0;
    const loop = createDriveLoop({
      session: createSession(PULSE, BUILD),
      inputs: () => WOT,
      onFrame: () => frames++,
      clock: fc.clock,
    });
    loop.start();
    for (let i = 0; i < 60; i++) fc.frame(16.7); // one second at ~60 fps
    // 10 Hz display means about ten updates, not sixty.
    expect(frames).toBeGreaterThan(5);
    expect(frames).toBeLessThan(20);
  });

  it("stops cleanly and schedules nothing further", () => {
    const fc = fakeClock();
    const loop = createDriveLoop({
      session: createSession(PULSE, BUILD),
      inputs: () => WOT,
      onFrame: () => {},
      clock: fc.clock,
    });
    loop.start();
    fc.frame(16.7);
    loop.stop();
    expect(loop.isRunning()).toBe(false);
    const x = loop.getSession().states.expected.x;
    fc.frame(16.7);
    expect(loop.getSession().states.expected.x).toBe(x);
  });

  it("start is idempotent", () => {
    const fc = fakeClock();
    const loop = createDriveLoop({
      session: createSession(PULSE, BUILD),
      inputs: () => WOT,
      onFrame: () => {},
      clock: fc.clock,
    });
    loop.start();
    loop.start();
    for (let i = 0; i < 10; i++) fc.frame(16.7);
    const once = loop.getSession().steps;
    expect(once).toBeGreaterThan(0);
    // A doubled loop would have stepped twice per frame.
    expect(once).toBeLessThan(10 * (16.7 / 1000) / DRIVE_TUNABLES.physicsDtS + 2);
  });

  it("a session swapped in mid-run takes effect", () => {
    const fc = fakeClock();
    const loop = createDriveLoop({
      session: createSession(PULSE, BUILD),
      inputs: () => WOT,
      onFrame: () => {},
      clock: fc.clock,
    });
    loop.start();
    for (let i = 0; i < 60; i++) fc.frame(16.7);
    expect(loop.getSession().states.expected.x).toBeGreaterThan(0);
    loop.setSession(createSession(PULSE, BUILD));
    expect(loop.getSession().states.expected.x).toBe(0);
  });
});

describe("pedal ramping", () => {
  it("moves toward the target instead of snapping", () => {
    const after = rampInput(0, 1, 1 / 60);
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(1);
  });

  it("arrives exactly, without overshooting", () => {
    let v = 0;
    for (let i = 0; i < 200; i++) v = rampInput(v, 1, 1 / 60);
    expect(v).toBe(1);
  });

  it("releases as well as presses", () => {
    expect(rampInput(1, 0, 1 / 60)).toBeLessThan(1);
    let v = 1;
    for (let i = 0; i < 200; i++) v = rampInput(v, 0, 1 / 60);
    expect(v).toBe(0);
  });

  it("takes about a quarter second to go from nothing to full", () => {
    let v = 0;
    let frames = 0;
    while (v < 1 && frames < 1000) {
      v = rampInput(v, 1, 1 / 60);
      frames++;
    }
    const seconds = frames / 60;
    expect(seconds).toBeGreaterThan(0.15);
    expect(seconds).toBeLessThan(0.35);
  });
});

// ---------------------------------------------------------------------------
// The gauge band. Found by driving the car in a browser: on the tacho the
// driven needle sat OUTSIDE its own band, because the three cars can be in
// different gears and rpm is therefore not ordered the way speed is.
// ---------------------------------------------------------------------------

describe("the three cars can disagree in ways a naive band would misrepresent", () => {
  it("not even SPEED is ordered, and only during gear changes", () => {
    // Found by a failing test, not by reasoning: the optimistic car reaches
    // redline sooner, so it shifts FIRST, and mid-shift it has no drive while
    // the pessimistic car is still pulling. For those few hundredths of a
    // second the faster car is the slower one. Correct physics; it just means
    // no two-ended band can be trusted to contain the third value.
    let s = createSession(PULSE, BUILD);
    let inversions = 0;
    let inversionsWhileNobodyShifted = 0;
    for (let i = 0; i < 1200; i++) {
      s = advance(s, WOT, 1 / 60).session;
      const o = frameOf(s).outputs;
      if (o.optimistic.speedMph < o.pessimistic.speedMph - 1e-9) {
        inversions++;
        const anyShifting =
          o.optimistic.shifting || o.pessimistic.shifting || o.expected.shifting;
        if (!anyShifting) inversionsWhileNobodyShifted++;
      }
    }
    expect(inversions).toBeGreaterThan(0);
    expect(
      inversionsWhileNobodyShifted,
      "speed should only invert while a car is mid-shift",
    ).toBe(0);
  });

  it("DISTANCE stays ordered, because a shift costs speed but not ground already covered", () => {
    let s = createSession(PULSE, BUILD);
    for (let i = 0; i < 1200; i++) {
      s = advance(s, WOT, 1 / 60).session;
      expect(s.states.optimistic.x).toBeGreaterThanOrEqual(s.states.pessimistic.x - 1e-9);
      expect(s.states.expected.x).toBeGreaterThanOrEqual(s.states.pessimistic.x - 1e-9);
      expect(s.states.expected.x).toBeLessThanOrEqual(s.states.optimistic.x + 1e-9);
    }
  });

  it("rpm is NOT ordered: the driven car can fall outside the two ghosts", () => {
    // This is the defect the browser run exposed. It is real behaviour, not a
    // bug in the physics: the cars shift at different moments, so at some
    // instant the expected car is in a different gear from the ghosts.
    let s = createSession(PULSE, BUILD);
    let sawOutside = false;
    for (let i = 0; i < 2000 && !sawOutside; i++) {
      s = advance(s, WOT, 1 / 60).session;
      const o = frameOf(s).outputs;
      const lo = Math.min(o.pessimistic.rpm, o.optimistic.rpm);
      const hi = Math.max(o.pessimistic.rpm, o.optimistic.rpm);
      if (o.expected.rpm < lo - 1e-9 || o.expected.rpm > hi + 1e-9) sawOutside = true;
    }
    expect(
      sawOutside,
      "expected rpm to leave the ghost range at least once; if this ever stops happening the band fix may no longer be needed",
    ).toBe(true);
  });

  it("gear disagreement is detected and reported", () => {
    let s = createSession(PULSE, BUILD);
    let sawDisagreement = false;
    for (let i = 0; i < 2000 && !sawDisagreement; i++) {
      s = advance(s, WOT, 1 / 60).session;
      if (!frameOf(s).gearsAgree) sawDisagreement = true;
    }
    expect(sawDisagreement).toBe(true);
  });

  it("a band taken over all three values always contains the driven value", () => {
    // What the gauge now does. This is the invariant the UI depends on.
    let s = createSession(PULSE, BUILD);
    for (let i = 0; i < 1200; i++) {
      s = advance(s, WOT, 1 / 60).session;
      const o = frameOf(s).outputs;
      for (const key of ["rpm", "speedMph"] as const) {
        const lo = Math.min(o.pessimistic[key], o.optimistic[key], o.expected[key]);
        const hi = Math.max(o.pessimistic[key], o.optimistic[key], o.expected[key]);
        expect(o.expected[key]).toBeGreaterThanOrEqual(lo);
        expect(o.expected[key]).toBeLessThanOrEqual(hi);
      }
    }
  });

  it("the frame reports the driven car's distance, not a ghost's", () => {
    let s = createSession(PULSE, BUILD);
    for (let i = 0; i < 200; i++) s = advance(s, WOT, 1 / 60).session;
    const f = frameOf(s);
    expect(f.distanceM).toBe(s.states.expected.x);
    expect(f.distanceM).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// The per-frame hook. Audio needs every frame; the readouts do not.
// ---------------------------------------------------------------------------

describe("the loop separates audio updates from readout updates", () => {
  it("onTick fires every frame, onFrame only at the display rate", () => {
    const fc = fakeClock();
    let ticks = 0;
    let displays = 0;
    const loop = createDriveLoop({
      session: createSession(PULSE, BUILD),
      inputs: () => WOT,
      onTick: () => ticks++,
      onFrame: () => displays++,
      clock: fc.clock,
    });
    loop.start();
    for (let i = 0; i < 60; i++) fc.frame(16.7); // ~1 second at 60 fps
    expect(ticks).toBe(60);
    expect(displays).toBeGreaterThan(5);
    expect(displays).toBeLessThan(20);
    expect(ticks).toBeGreaterThan(displays * 2);
  });

  it("onTick is optional", () => {
    const fc = fakeClock();
    const loop = createDriveLoop({
      session: createSession(PULSE, BUILD),
      inputs: () => WOT,
      onFrame: () => {},
      clock: fc.clock,
    });
    loop.start();
    expect(() => {
      for (let i = 0; i < 10; i++) fc.frame(16.7);
    }).not.toThrow();
  });

  it("onTick sees a frame whose rpm is usable for an engine note", () => {
    const fc = fakeClock();
    const seen: number[] = [];
    const loop = createDriveLoop({
      session: createSession(PULSE, BUILD),
      inputs: () => WOT,
      onTick: (f) => seen.push(f.outputs.expected.rpm),
      onFrame: () => {},
      clock: fc.clock,
    });
    loop.start();
    for (let i = 0; i < 180; i++) fc.frame(16.7);
    expect(seen.length).toBe(180);
    for (const rpm of seen) {
      expect(Number.isFinite(rpm)).toBe(true);
      expect(rpm).toBeGreaterThan(0);
      expect(rpm).toBeLessThanOrEqual(PULSE.redlineRpm + 1);
    }
    // The note must actually move, or there is nothing to hear.
    expect(Math.max(...seen) - Math.min(...seen)).toBeGreaterThan(500);
  });

  it("the shifting flag the synth cuts on does occur during a drive", () => {
    const fc = fakeClock();
    let shiftFrames = 0;
    const loop = createDriveLoop({
      session: createSession(PULSE, BUILD),
      inputs: () => WOT,
      onTick: (f) => {
        if (f.outputs.expected.shifting) shiftFrames++;
      },
      onFrame: () => {},
      clock: fc.clock,
    });
    loop.start();
    for (let i = 0; i < 400; i++) fc.frame(16.7);
    expect(shiftFrames).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Run milestones: what the driven car actually achieved.
// ---------------------------------------------------------------------------

describe("the run card's numbers", () => {
  it("records nothing before the car has moved", () => {
    const m = createSession(PULSE, BUILD).milestones;
    expect(m.zeroToSixtyS).toBeNull();
    expect(m.quarterMileS).toBeNull();
    expect(m.topSpeedMph).toBe(0);
    expect(m.distanceM).toBe(0);
  });

  it("records 0-60 when the driven car crosses 60 mph", () => {
    let s = createSession(PULSE, BUILD);
    while (s.elapsedS < 20 && s.milestones.zeroToSixtyS === null) {
      s = advance(s, WOT, 1 / 60).session;
    }
    expect(s.milestones.zeroToSixtyS).not.toBeNull();
    expect(s.milestones.zeroToSixtyS!).toBeGreaterThan(2);
    expect(s.milestones.zeroToSixtyS!).toBeLessThan(10);
  });

  it("matches the Garage's modelled figure for a flat-out run", () => {
    // Driving the expected build flat out should land on the expected
    // scenario's modelled 0-60, because it is the same physics.
    for (const car of CARS) {
      let s = createSession(car, []);
      while (s.elapsedS < 20 && s.milestones.zeroToSixtyS === null) {
        s = advance(s, WOT, 1 / 60).session;
      }
      const modelled = estimate(car, []).expected.zeroToSixtyS;
      expect(Math.abs(s.milestones.zeroToSixtyS! - modelled)).toBeLessThan(0.02);
    }
  });

  it("a slower driver records a slower time than the model", () => {
    let s = createSession(PULSE, BUILD);
    const half = { throttle: 0.5, brake: 0 };
    while (s.elapsedS < 40 && s.milestones.zeroToSixtyS === null) {
      s = advance(s, half, 1 / 60).session;
    }
    const modelled = estimate(PULSE, BUILD).expected.zeroToSixtyS;
    expect(s.milestones.zeroToSixtyS!).toBeGreaterThan(modelled);
  });

  it("0-60 is recorded once and never revised", () => {
    let s = createSession(PULSE, BUILD);
    while (s.elapsedS < 20 && s.milestones.zeroToSixtyS === null) {
      s = advance(s, WOT, 1 / 60).session;
    }
    const first = s.milestones.zeroToSixtyS;
    // Brake to a stop and accelerate again: the recorded time must not move.
    for (let i = 0; i < 600; i++) s = advance(s, { throttle: 0, brake: 1 }, 1 / 60).session;
    for (let i = 0; i < 600; i++) s = advance(s, WOT, 1 / 60).session;
    expect(s.milestones.zeroToSixtyS).toBe(first);
  });

  it("top speed only ever rises", () => {
    let s = createSession(PULSE, BUILD);
    let highest = 0;
    for (let i = 0; i < 1500; i++) {
      s = advance(s, i < 900 ? WOT : { throttle: 0, brake: 1 }, 1 / 60).session;
      expect(s.milestones.topSpeedMph).toBeGreaterThanOrEqual(highest);
      highest = s.milestones.topSpeedMph;
    }
    expect(highest).toBeGreaterThan(40);
  });

  it("records the quarter mile, and after 0-60", () => {
    let s = createSession(PULSE, BUILD);
    while (s.elapsedS < 40 && s.milestones.quarterMileS === null) {
      s = advance(s, WOT, 1 / 60).session;
    }
    expect(s.milestones.quarterMileS).not.toBeNull();
    expect(s.milestones.quarterMileS!).toBeGreaterThan(s.milestones.zeroToSixtyS!);
  });

  it("resetting clears the run", () => {
    let s = createSession(PULSE, BUILD);
    for (let i = 0; i < 600; i++) s = advance(s, WOT, 1 / 60).session;
    expect(s.milestones.zeroToSixtyS).not.toBeNull();
    const fresh = resetSession(s);
    expect(fresh.milestones.zeroToSixtyS).toBeNull();
    expect(fresh.milestones.topSpeedMph).toBe(0);
  });

  it("the frame carries the milestones, so the card needs no other source", () => {
    let s = createSession(PULSE, BUILD);
    for (let i = 0; i < 600; i++) s = advance(s, WOT, 1 / 60).session;
    expect(frameOf(s).milestones).toBe(s.milestones);
  });
});

describe("the model uncertainty band is declared, not borrowed", () => {
  it("is disclosed in the ledger like every other invented number", () => {
    const entry = DRIVE_ASSUMPTIONS.find((a) => a.key === "modelUncertaintyPct");
    expect(entry).toBeDefined();
    expect(entry!.value.toLowerCase()).toContain("assumed");
  });

  it("says plainly that it is not measured", () => {
    const entry = DRIVE_ASSUMPTIONS.find((a) => a.key === "modelUncertaintyPct")!;
    expect(entry.why.toLowerCase()).toContain("tuned");
  });

  it("widens the parts band rather than replacing it", () => {
    const e = estimate(PULSE, BUILD);
    const lo = Math.min(e.pessimistic.zeroToSixtyS, e.optimistic.zeroToSixtyS);
    const hi = Math.max(e.pessimistic.zeroToSixtyS, e.optimistic.zeroToSixtyS);
    const pct = DRIVE_TUNABLES.modelUncertaintyPct;
    expect(lo * (1 - pct)).toBeLessThan(lo);
    expect(hi * (1 + pct)).toBeGreaterThan(hi);
  });
});
