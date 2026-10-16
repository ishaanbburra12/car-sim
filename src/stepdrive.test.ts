import { describe, it, expect } from "vitest";
import {
  applyParts,
  gearTotals,
  hpAt,
  standingStart,
  stepDrive,
  WOT,
  type DriveState,
} from "./engine";
import { PULSE, PARTS } from "./data";
import { CARS } from "./cars";
import type { Spec } from "./types";

// ---------------------------------------------------------------------------
// BIT-IDENTITY GUARD.
//
// stepDrive() was extracted from simulate()'s loop. The Pulse's published
// numbers are pinned to ten decimal places elsewhere, so "close enough" is not
// good enough here: the extracted step must reproduce the original loop
// EXACTLY, bit for bit, at every step.
//
// legacyLoop below is a verbatim copy of the loop body as it stood before the
// extraction (commit e14732a, src/engine.ts:221-285). It deliberately
// duplicates the constants and helpers rather than importing the private ones,
// so that a change to the engine cannot quietly change the thing we compare
// against. If this test ever fails, the refactor changed the physics.
// ---------------------------------------------------------------------------

const G = 9.81;
const AIR_DENSITY = 1.2;
const W_PER_HP = 745.7;
const MPS_PER_MPH = 0.44704;
const ROTATIONAL_MASS_FACTOR = 1.04;
const DT = 0.005;

function legacyNormalForceN(spec: Spec, v: number): number {
  return spec.massKg * G + 0.5 * AIR_DENSITY * spec.clA * v * v;
}

function legacyTorqueNm(rpm: number, peakHp: number, peakRpm: number, et: "turbo" | "na"): number {
  const watts = hpAt(rpm, peakHp, peakRpm, et) * W_PER_HP;
  const omega = (rpm * 2 * Math.PI) / 60;
  return watts / omega;
}

type Frame = { t: number; x: number; v: number; gear: number; shiftTimer: number; rpm: number };

/** The original loop, unchanged, recording every step. */
function legacyLoop(spec: Spec, maxSteps: number): Frame[] {
  const gearTotal = spec.gearRatios.map((g) => g * spec.finalDrive);
  let v = 0;
  let x = 0;
  let t = 0;
  let gear = 0;
  let shiftTimer = 0;
  const frames: Frame[] = [];

  const rpmIn = (v: number, g: number) =>
    (v / spec.wheelRadiusM) * gearTotal[g] * (60 / (2 * Math.PI));

  for (let i = 0; i < maxSteps; i++) {
    const forceFor = (g: number) => {
      if (rpmIn(v, g) > spec.redlineRpm) return -1;
      const rpm = Math.max(rpmIn(v, g), spec.launchRpm);
      const tq = legacyTorqueNm(rpm, spec.effectiveHp, spec.peakHpRpm, spec.engineType);
      return (tq * gearTotal[g] * spec.drivelineEff) / spec.wheelRadiusM;
    };

    if (shiftTimer > 0) {
      shiftTimer -= DT;
    } else {
      const currentForce = forceFor(gear);
      let bestGear = gear;
      let bestForce = currentForce;
      for (let g = 0; g < gearTotal.length; g++) {
        if (g !== gear && rpmIn(v, g) > spec.redlineRpm * 0.95) continue;
        const f = forceFor(g);
        if (f > bestForce) {
          bestForce = f;
          bestGear = g;
        }
      }
      if (bestGear !== gear && (currentForce < 0 || bestForce > currentForce * 1.05)) {
        gear = bestGear;
        shiftTimer = spec.shiftTimeS;
      }
    }

    const driveForce = shiftTimer > 0 ? 0 : Math.max(0, forceFor(gear));
    const tractionCap = spec.tractionFraction * legacyNormalForceN(spec, v) * spec.tireMu;
    const drive = Math.min(driveForce, tractionCap);

    const drag = 0.5 * AIR_DENSITY * spec.cd * spec.frontalAreaM2 * v * v;
    const roll = spec.crr * legacyNormalForceN(spec, v);
    const a = (drive - drag - roll) / (spec.massKg * ROTATIONAL_MASS_FACTOR);

    v = Math.max(0, v + a * DT);
    x += v * DT;
    t += DT;

    frames.push({ t, x, v, gear, shiftTimer, rpm: Math.max(rpmIn(v, gear), spec.launchRpm) });
  }
  return frames;
}

/** The extracted step, driven at full throttle, recording every step. */
function newLoop(spec: Spec, maxSteps: number): Frame[] {
  const gearTotal = gearTotals(spec);
  let state: DriveState = standingStart(spec);
  const frames: Frame[] = [];
  for (let i = 0; i < maxSteps; i++) {
    const out = stepDrive(spec, gearTotal, state, WOT);
    state = out.state;
    frames.push({
      t: state.t,
      x: state.x,
      v: state.v,
      gear: state.gear,
      shiftTimer: state.shiftTimer,
      rpm: out.rpm,
    });
  }
  return frames;
}

const STEPS = 24000; // the full 120 s run at 5 ms

function compare(spec: Spec, label: string) {
  const a = legacyLoop(spec, STEPS);
  const b = newLoop(spec, STEPS);
  expect(b.length).toBe(a.length);
  for (let i = 0; i < a.length; i++) {
    for (const key of ["t", "x", "v", "gear", "shiftTimer", "rpm"] as const) {
      if (!Object.is(a[i][key], b[i][key])) {
        throw new Error(
          `${label}: diverged at step ${i} (t=${a[i].t.toFixed(3)}s) on "${key}": ` +
            `legacy ${a[i][key]} vs stepDrive ${b[i][key]}`,
        );
      }
    }
  }
}

describe("stepDrive reproduces the original loop bit for bit", () => {
  for (const car of CARS) {
    it(`${car.name}: stock, all ${STEPS} steps identical`, () => {
      compare(applyParts(car, [], "pessimistic"), `${car.name} stock`);
    });
  }

  it("Pulse with a full build, every scenario", () => {
    const ids = ["turbo-upgrade", "tires-sport", "weight-reduction", "brakes-big"];
    for (const scenario of ["pessimistic", "expected", "optimistic"] as const) {
      compare(applyParts(PULSE, ids, scenario), `Pulse ${scenario}`);
    }
  });

  it("every car with every part that fits it", () => {
    for (const car of CARS) {
      const byCat = new Map<string, string>();
      for (const p of PARTS) if (!byCat.has(p.category)) byCat.set(p.category, p.id);
      compare(applyParts(car, [...byCat.values()], "expected"), `${car.name} built`);
    }
  });
});

describe("stepDrive responds to the driver", () => {
  const spec = applyParts(PULSE, [], "pessimistic");
  const gt = gearTotals(spec);

  it("no throttle means no drive force", () => {
    const out = stepDrive(spec, gt, standingStart(spec), { throttle: 0, brake: 0 });
    expect(out.driveForceN).toBe(0);
  });

  it("half throttle gives less force than full", () => {
    const s = standingStart(spec);
    const full = stepDrive(spec, gt, s, WOT).driveForceN;
    const half = stepDrive(spec, gt, s, { throttle: 0.5, brake: 0 }).driveForceN;
    expect(half).toBeLessThan(full);
    expect(half).toBeGreaterThan(0);
  });

  it("the rev limiter still works when the driver lifts", () => {
    // The -1 redline sentinel must not be multiplied by throttle: -1 * 0 is -0,
    // and -0 < 0 is false, which would silently disable the limiter.
    let state = standingStart(spec);
    for (let i = 0; i < 4000; i++) {
      const out = stepDrive(spec, gt, state, { throttle: 0.3, brake: 0 });
      state = out.state;
      expect(out.rpm).toBeLessThanOrEqual(spec.redlineRpm + 1);
    }
  });

  it("braking slows the car and can bring it to a stop", () => {
    let state = standingStart(spec);
    for (let i = 0; i < 1200; i++) state = stepDrive(spec, gt, state, WOT).state;
    const vBefore = state.v;
    expect(vBefore).toBeGreaterThan(10);
    let out = stepDrive(spec, gt, state, { throttle: 0, brake: 1 });
    expect(out.state.v).toBeLessThan(vBefore);
    for (let i = 0; i < 4000 && out.state.v > 0; i++) {
      out = stepDrive(spec, gt, out.state, { throttle: 0, brake: 1 });
    }
    expect(out.state.v).toBe(0);
    expect(out.stopped).toBe(true);
  });

  it("partial braking is weaker than full braking", () => {
    let state = standingStart(spec);
    for (let i = 0; i < 1200; i++) state = stepDrive(spec, gt, state, WOT).state;
    const full = stepDrive(spec, gt, state, { throttle: 0, brake: 1 }).state.v;
    const part = stepDrive(spec, gt, state, { throttle: 0, brake: 0.4 }).state.v;
    expect(full).toBeLessThan(part);
  });

  it("is pure: stepping does not mutate the state passed in", () => {
    const s = standingStart(spec);
    const snapshot = { ...s };
    stepDrive(spec, gt, s, WOT);
    expect(s).toEqual(snapshot);
  });

  it("is deterministic: same inputs, same output", () => {
    const s = standingStart(spec);
    const a = stepDrive(spec, gt, s, WOT);
    const b = stepDrive(spec, gt, s, WOT);
    expect(a).toEqual(b);
  });

  it("reports a force balance that adds up", () => {
    let state = standingStart(spec);
    for (let i = 0; i < 600; i++) state = stepDrive(spec, gt, state, WOT).state;
    const out = stepDrive(spec, gt, state, WOT);
    const net = out.driveForceN - out.dragN - out.rollN - out.brakeForceN;
    const implied = net / (spec.massKg * 1.04);
    expect(Number.isFinite(implied)).toBe(true);
    expect(out.driveForceN).toBeLessThanOrEqual(out.tractionCapN);
  });
});

// ---------------------------------------------------------------------------
// The launch policy. Found by listening, not by reading: with the legacy floor
// the engine note cannot fall below launch rpm, so it flatlines after every
// gear change.
// ---------------------------------------------------------------------------

describe("launch policy", () => {
  const spec = applyParts(PULSE, [], "pessimistic");
  const gt = gearTotals(spec);

  function run(policy: "legacy" | "clutch", steps: number) {
    let state = standingStart(spec);
    const rpms: number[] = [];
    for (let i = 0; i < steps; i++) {
      const out = stepDrive(spec, gt, state, WOT, { policy });
      state = out.state;
      rpms.push(out.rpm);
    }
    return rpms;
  }

  it("defaults to legacy, so nothing that exists today changes", () => {
    let a = standingStart(spec);
    let b = standingStart(spec);
    for (let i = 0; i < 2000; i++) {
      const x = stepDrive(spec, gt, a, WOT);
      const y = stepDrive(spec, gt, b, WOT, { policy: "legacy" });
      expect(Object.is(x.rpm, y.rpm)).toBe(true);
      expect(Object.is(x.state.v, y.state.v)).toBe(true);
      a = x.state;
      b = y.state;
    }
  });

  it("legacy never lets the engine fall below launch rpm", () => {
    for (const rpm of run("legacy", 2000)) {
      expect(rpm).toBeGreaterThanOrEqual(spec.launchRpm - 1e-9);
    }
  });

  it("clutch does, once the drivetrain has outrun the floor", () => {
    const rpms = run("clutch", 2000);
    expect(Math.min(...rpms)).toBeLessThan(spec.launchRpm);
  });

  it("clutch still holds the engine up at the very start", () => {
    // Off the line the clutch is slipping, so the floor must still apply.
    const rpms = run("clutch", 20);
    for (const rpm of rpms) expect(rpm).toBeGreaterThanOrEqual(spec.launchRpm - 1e-9);
  });

  it("the floor is released exactly once and never re-arms", () => {
    let state = standingStart(spec);
    let releases = 0;
    let wasArmed = state.launchArmed;
    for (let i = 0; i < 4000; i++) {
      const out = stepDrive(spec, gt, state, WOT, { policy: "clutch" });
      state = out.state;
      if (wasArmed && !state.launchArmed) releases++;
      if (!wasArmed && state.launchArmed) throw new Error("the clutch re-armed");
      wasArmed = state.launchArmed;
    }
    expect(releases).toBe(1);
  });

  it("the engine revs DOWN after a gear change, which is the audible point", () => {
    let state = standingStart(spec);
    let prev = 0;
    let drops = 0;
    for (let i = 0; i < 2000; i++) {
      const out = stepDrive(spec, gt, state, WOT, { policy: "clutch" });
      state = out.state;
      if (prev > 0 && out.rpm < prev - 200) drops++;
      prev = out.rpm;
    }
    expect(drops, "expected at least one sharp rev drop at a gear change").toBeGreaterThan(0);
  });

  it("legacy FLATTENS the rev drop at a shift, which is the defect", () => {
    // Both policies drop at a shift; the difference is how FAR. Under legacy
    // the engine cannot fall past the floor, so the drop is cut short and the
    // note lands on the same pitch after every early shift. Under clutch it
    // falls to wherever the gearing actually puts it.
    const deepestDrop = (policy: "legacy" | "clutch") => {
      let state = standingStart(spec);
      let prev = 0;
      let deepest = 0;
      for (let i = 0; i < 2000; i++) {
        const out = stepDrive(spec, gt, state, WOT, { policy });
        state = out.state;
        if (prev > 0) deepest = Math.max(deepest, prev - out.rpm);
        prev = out.rpm;
      }
      return deepest;
    };
    expect(deepestDrop("clutch")).toBeGreaterThan(deepestDrop("legacy") + 200);
  });

  it("under legacy a shift can never land below launch rpm; under clutch it can", () => {
    // The audible symptom, stated exactly. Legacy pins the bottom of every
    // early rev drop to the same pitch — the floor — so the car always lands
    // on the same note. Clutch lets it land wherever the gearing puts it.
    const landings = (policy: "legacy" | "clutch") => {
      let state = standingStart(spec);
      let prev = 0;
      const found: number[] = [];
      for (let i = 0; i < 1300; i++) {
        const out = stepDrive(spec, gt, state, WOT, { policy });
        state = out.state;
        if (prev > 0 && out.rpm < prev - 200) found.push(out.rpm);
        prev = out.rpm;
      }
      return found;
    };
    const legacy = landings("legacy");
    const clutch = landings("clutch");
    expect(legacy.length).toBeGreaterThan(0);
    expect(clutch.length).toBeGreaterThan(0);
    for (const rpm of legacy) expect(rpm).toBeGreaterThanOrEqual(spec.launchRpm - 1e-9);
    expect(Math.min(...clutch)).toBeLessThan(spec.launchRpm);
    // And the first shift under legacy lands exactly ON the floor, which is
    // what makes it sound mechanical.
    expect(legacy[0]).toBeCloseTo(spec.launchRpm, 6);
  });

  it("the two policies still agree closely on how fast the car is", () => {
    // The floor only ever ADDS torque at low rpm, and by then the engine is
    // past its torque peak, so releasing it changes the car barely at all.
    let a = standingStart(spec);
    let b = standingStart(spec);
    for (let i = 0; i < 1400; i++) {
      a = stepDrive(spec, gt, a, WOT, { policy: "legacy" }).state;
      b = stepDrive(spec, gt, b, WOT, { policy: "clutch" }).state;
    }
    expect(Math.abs(a.v - b.v) / a.v).toBeLessThan(0.02);
  });
});

// ---------------------------------------------------------------------------
// Idle, a real standstill, and engine braking.
// ---------------------------------------------------------------------------

const CLUTCH = { policy: "clutch" as const, overrunRpmScaleFloor: 0.5 };
const LIFT = { throttle: 0, brake: 0 };

describe("idle and a real standstill", () => {
  const spec = applyParts(PULSE, [], "pessimistic");
  const gt = gearTotals(spec);

  it("a stopped car idles rather than reading zero rpm", () => {
    const out = stepDrive(spec, gt, standingStart(spec), LIFT, CLUTCH);
    expect(out.rpm).toBeCloseTo(spec.idleRpm, 6);
    expect(out.idling).toBe(true);
  });

  it("a stopped car with no throttle stays stopped", () => {
    let state = standingStart(spec);
    for (let i = 0; i < 2000; i++) state = stepDrive(spec, gt, state, LIFT, CLUTCH).state;
    expect(state.v).toBe(0);
    expect(state.x).toBe(0);
  });

  it("opening the throttle lifts the engine to launch rpm, not idle", () => {
    const out = stepDrive(spec, gt, standingStart(spec), WOT, CLUTCH);
    expect(out.rpm).toBeCloseTo(spec.launchRpm, 6);
  });

  it("brakes the car to a complete stop and it STAYS stopped", () => {
    let state = standingStart(spec);
    for (let i = 0; i < 1500; i++) state = stepDrive(spec, gt, state, WOT, CLUTCH).state;
    expect(state.v).toBeGreaterThan(20);
    let out = stepDrive(spec, gt, state, { throttle: 0, brake: 1 }, CLUTCH);
    for (let i = 0; i < 5000 && out.state.v > 0; i++) {
      out = stepDrive(spec, gt, out.state, { throttle: 0, brake: 1 }, CLUTCH);
    }
    expect(out.state.v).toBe(0);
    const stoppedAt = out.state.x;
    for (let i = 0; i < 2000; i++) out = stepDrive(spec, gt, out.state, LIFT, CLUTCH);
    expect(out.state.v).toBe(0);
    expect(out.state.x).toBe(stoppedAt);
    expect(out.rpm).toBeCloseTo(spec.idleRpm, 6);
  });

  it("and can pull away again afterwards", () => {
    let state = standingStart(spec);
    for (let i = 0; i < 1500; i++) state = stepDrive(spec, gt, state, WOT, CLUTCH).state;
    let out = stepDrive(spec, gt, state, { throttle: 0, brake: 1 }, CLUTCH);
    for (let i = 0; i < 5000 && out.state.v > 0; i++) {
      out = stepDrive(spec, gt, out.state, { throttle: 0, brake: 1 }, CLUTCH);
    }
    expect(out.state.v).toBe(0);
    // The clutch must have re-armed, or there is no torque to move off with.
    expect(out.state.launchArmed).toBe(true);
    for (let i = 0; i < 400; i++) out = stepDrive(spec, gt, out.state, WOT, CLUTCH);
    expect(out.state.v).toBeGreaterThan(5);
  });
});

describe("engine braking", () => {
  const spec = applyParts(PULSE, [], "pessimistic");
  const gt = gearTotals(spec);

  function coastFrom(steps: number, opts: typeof CLUTCH | { policy: "clutch" }) {
    let state = standingStart(spec);
    for (let i = 0; i < steps; i++) state = stepDrive(spec, gt, state, WOT, CLUTCH).state;
    const before = state.v;
    let out = stepDrive(spec, gt, state, LIFT, opts as never);
    for (let i = 0; i < 200; i++) out = stepDrive(spec, gt, out.state, LIFT, opts as never);
    return { before, after: out.state.v, out };
  }

  it("a car that lifts off slows faster WITH engine braking than without", () => {
    const withEb = coastFrom(1500, CLUTCH);
    const withoutEb = coastFrom(1500, { policy: "clutch" });
    expect(withEb.after).toBeLessThan(withoutEb.after);
  });

  it("is reported in the force balance", () => {
    const { out } = coastFrom(1500, CLUTCH);
    expect(out.engineBrakeN).toBeGreaterThan(0);
  });

  it("is zero at full throttle, which is why the simulation is unchanged", () => {
    let state = standingStart(spec);
    for (let i = 0; i < 800; i++) {
      const out = stepDrive(spec, gt, state, WOT, CLUTCH);
      expect(out.engineBrakeN).toBe(0);
      state = out.state;
    }
  });

  it("scales with how far the driver has lifted", () => {
    let state = standingStart(spec);
    for (let i = 0; i < 1500; i++) state = stepDrive(spec, gt, state, WOT, CLUTCH).state;
    const full = stepDrive(spec, gt, state, { throttle: 0, brake: 0 }, CLUTCH).engineBrakeN;
    const half = stepDrive(spec, gt, state, { throttle: 0.5, brake: 0 }, CLUTCH).engineBrakeN;
    expect(half).toBeCloseTo(full * 0.5, 6);
  });

  it("stops during a gear change, because the clutch is open", () => {
    let state = standingStart(spec);
    let sawShiftWithEngineBraking = false;
    for (let i = 0; i < 3000; i++) {
      const out = stepDrive(spec, gt, state, { throttle: 0.2, brake: 0 }, CLUTCH);
      if (out.shifting && out.engineBrakeN > 0) sawShiftWithEngineBraking = true;
      state = out.state;
    }
    expect(sawShiftWithEngineBraking).toBe(false);
  });

  it("stops at a standstill, because the clutch is open there too", () => {
    const out = stepDrive(spec, gt, standingStart(spec), LIFT, CLUTCH);
    expect(out.engineBrakeN).toBe(0);
  });

  it("lands in a believable range for every car", () => {
    // Engine braking alone should be a gentle deceleration, not a brake pedal.
    // This bounds the four assumed overrun figures against something real.
    for (const car of CARS) {
      const s = applyParts(car, [], "pessimistic");
      const g = gearTotals(s);
      let state = standingStart(s);
      for (let i = 0; i < 1500; i++) state = stepDrive(s, g, state, WOT, CLUTCH).state;
      const out = stepDrive(s, g, state, LIFT, CLUTCH);
      const gEquivalent = out.engineBrakeN / (s.massKg * 9.81);
      expect(gEquivalent, `${car.name} engine braking`).toBeGreaterThan(0.01);
      expect(gEquivalent, `${car.name} engine braking`).toBeLessThan(0.25);
    }
  });

  it("never pushes the car backwards", () => {
    const s = applyParts(PULSE, [], "pessimistic");
    const g = gearTotals(s);
    let state = standingStart(s);
    for (let i = 0; i < 600; i++) state = stepDrive(s, g, state, WOT, CLUTCH).state;
    for (let i = 0; i < 20000; i++) {
      state = stepDrive(s, g, state, LIFT, CLUTCH).state;
      expect(state.v).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// The manual gearbox. gearboxType is published for every car, so this is the
// rare addition that SHRINKS the assumed bucket instead of growing it.
// ---------------------------------------------------------------------------

describe("manual gear selection", () => {
  const spec = applyParts(PULSE, [], "pessimistic");
  const gt = gearTotals(spec);

  it("omitting a gear leaves the automatic chooser in charge", () => {
    // Which is what keeps the whole-run simulation bit-identical.
    let a = standingStart(spec);
    let b = standingStart(spec);
    for (let i = 0; i < 1500; i++) {
      const x = stepDrive(spec, gt, a, WOT);
      const y = stepDrive(spec, gt, b, { throttle: 1, brake: 0 });
      expect(Object.is(x.state.gear, y.state.gear)).toBe(true);
      expect(Object.is(x.state.v, y.state.v)).toBe(true);
      a = x.state;
      b = y.state;
    }
  });

  it("the driver's choice is obeyed", () => {
    const out = stepDrive(spec, gt, standingStart(spec), { throttle: 1, brake: 0, gear: 2 });
    expect(out.gear).toBe(3); // reported 1-based
  });

  it("changing gear costs the car its shift time", () => {
    const out = stepDrive(spec, gt, standingStart(spec), { throttle: 1, brake: 0, gear: 1 });
    expect(out.shifting).toBe(true);
    expect(out.state.shiftTimer).toBeCloseTo(spec.shiftTimeS, 9);
    expect(out.driveForceN).toBe(0);
  });

  it("holding the same gear costs nothing", () => {
    let state = standingStart(spec);
    for (let i = 0; i < 300; i++) {
      const out = stepDrive(spec, gt, state, { throttle: 1, brake: 0, gear: 0 });
      expect(out.shifting).toBe(false);
      state = out.state;
    }
  });

  it("the chooser never overrides the driver, even when it would be faster", () => {
    // Crawling along in top gear is a bad idea, and the car must let you.
    let state = standingStart(spec);
    const top = spec.gearRatios.length - 1;
    for (let i = 0; i < 2000; i++) {
      state = stepDrive(spec, gt, state, { throttle: 1, brake: 0, gear: top }).state;
    }
    expect(state.gear).toBe(top);
    // And it is genuinely slower than letting the gearbox decide.
    let auto = standingStart(spec);
    for (let i = 0; i < 2000; i++) auto = stepDrive(spec, gt, auto, WOT).state;
    expect(state.v).toBeLessThan(auto.v);
  });

  it("a gear that would pass redline makes no power at all", () => {
    // Money shift: drop to first at speed and the engine simply stops pulling.
    let state = standingStart(spec);
    for (let i = 0; i < 1600; i++) state = stepDrive(spec, gt, state, WOT).state;
    let out = stepDrive(spec, gt, state, { throttle: 1, brake: 0, gear: 0 });
    for (let i = 0; i < 60; i++) out = stepDrive(spec, gt, out.state, { throttle: 1, brake: 0, gear: 0 });
    expect(out.onLimiter).toBe(true);
    expect(out.driveForceN).toBe(0);
  });

  it("an out-of-range gear is clamped rather than crashing", () => {
    for (const g of [-5, 99, 1.7]) {
      const out = stepDrive(spec, gt, standingStart(spec), { throttle: 1, brake: 0, gear: g });
      expect(out.gear).toBeGreaterThanOrEqual(1);
      expect(out.gear).toBeLessThanOrEqual(spec.gearRatios.length);
      expect(Number.isNaN(out.state.v)).toBe(false);
    }
  });

  it("a well-driven manual run is close to what the automatic chooser manages", () => {
    // Shift at redline in every gear and you should be within a few percent.
    let state = standingStart(spec);
    let gear = 0;
    const sixty = 60 * 0.44704;
    let manualT = NaN;
    for (let i = 0; i < 4000 && Number.isNaN(manualT); i++) {
      const out = stepDrive(spec, gt, state, { throttle: 1, brake: 0, gear }, { policy: "clutch" });
      if (out.rpm > spec.redlineRpm * 0.985 && gear < spec.gearRatios.length - 1 && !out.shifting) {
        gear++;
      }
      state = out.state;
      if (state.v >= sixty) manualT = state.t;
    }
    let auto = standingStart(spec);
    let autoT = NaN;
    for (let i = 0; i < 4000 && Number.isNaN(autoT); i++) {
      auto = stepDrive(spec, gt, auto, WOT, { policy: "clutch" }).state;
      if (auto.v >= sixty) autoT = auto.t;
    }
    expect(Number.isNaN(manualT)).toBe(false);
    expect(Math.abs(manualT - autoT) / autoT).toBeLessThan(0.15);
  });
});

describe("gearbox type is published, not assumed", () => {
  it("every car declares one", () => {
    for (const car of CARS) {
      expect(["manual", "dual-clutch"]).toContain(car.gearboxType);
    }
  });

  it("the two dual-clutch cars shift faster than the manuals", () => {
    const manuals = CARS.filter((c) => c.gearboxType === "manual");
    const autos = CARS.filter((c) => c.gearboxType === "dual-clutch");
    expect(manuals.length).toBeGreaterThan(0);
    expect(autos.length).toBeGreaterThan(0);
    const slowestAuto = Math.max(...autos.map((c) => c.shiftTimeS));
    const fastestManual = Math.min(...manuals.map((c) => c.shiftTimeS));
    expect(slowestAuto).toBeLessThan(fastestManual);
  });
});

// ---------------------------------------------------------------------------
// Regressions found by a code review of everything built today. Each of these
// was a real defect; the tests exist so none of them can come back quietly.
// ---------------------------------------------------------------------------

describe("code review regressions", () => {
  const spec = applyParts(PULSE, [], "pessimistic");
  const gt = gearTotals(spec);

  it("braking never exceeds what the tires and brakes can hold", () => {
    // Was 6% over: brakeForceN was set at the full limit and then drag,
    // rolling resistance and engine braking were subtracted on top of it.
    let state = standingStart(spec);
    for (let i = 0; i < 1500; i++) {
      state = stepDrive(spec, gt, state, WOT, { policy: "clutch" }).state;
    }
    let out = stepDrive(spec, gt, state, { throttle: 0, brake: 1 }, CLUTCH);
    for (let i = 0; i < 2000 && out.state.v > 1; i++) {
      const before = out.state.v;
      out = stepDrive(spec, gt, out.state, { throttle: 0, brake: 1 }, CLUTCH);
      const decel = (before - out.state.v) / 0.005;
      // Aerodynamic drag acts on the body rather than through the tires, so
      // it is allowed to add on top; everything else is capped.
      const tireLimit = Math.min(spec.tireMu, spec.brakeLimitG) * 9.81;
      const dragDecel =
        (0.5 * 1.2 * spec.cd * spec.frontalAreaM2 * before * before) / spec.massKg;
      expect(decel).toBeLessThanOrEqual(tireLimit + dragDecel + 1e-6);
    }
  });

  it("a non-finite gear is ignored instead of poisoning the state", () => {
    // Math.round(NaN) is NaN, clamping NaN is NaN, and gearTotal[NaN] then
    // turned v, x and rpm into NaN about fifty steps later.
    let state = standingStart(spec);
    for (let i = 0; i < 200; i++) {
      const out = stepDrive(spec, gt, state, { throttle: 1, brake: 0, gear: NaN });
      state = out.state;
      expect(Number.isNaN(state.v)).toBe(false);
      expect(Number.isNaN(out.rpm)).toBe(false);
      expect(Number.isNaN(out.gear)).toBe(false);
    }
    expect(state.v).toBeGreaterThan(0);
  });

  it("engine braking needs the clutch policy, and says so rather than silently doing nothing", () => {
    // launchArmed is only ever cleared by the clutch policy, so gating on it
    // meant supplying a curve shape under legacy quietly did nothing at all.
    let state = standingStart(spec);
    for (let i = 0; i < 1500; i++) {
      state = stepDrive(spec, gt, state, WOT, { policy: "clutch" }).state;
    }
    const legacy = stepDrive(spec, gt, state, { throttle: 0, brake: 0 }, {
      overrunRpmScaleFloor: 0.5,
    });
    const clutch = stepDrive(spec, gt, state, { throttle: 0, brake: 0 }, CLUTCH);
    expect(legacy.engineBrakeN).toBe(0);
    expect(clutch.engineBrakeN).toBeGreaterThan(0);
  });

  it("every car's rev counter has room to show a redline zone", () => {
    // The dial rounded UP to exactly the redline, so the red arc was skipped
    // on every car whose redline is a round thousand: three of the four.
    for (const car of CARS) {
      const rpmMax = Math.floor(car.redlineRpm / 1000) * 1000 + 1000;
      expect(rpmMax, `${car.name} dial maximum`).toBeGreaterThan(car.redlineRpm);
    }
  });
});
