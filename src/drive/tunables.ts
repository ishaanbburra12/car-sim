/**
 * Every number drive mode invents.
 *
 * None of these are physics measured from anything. They are choices, and each
 * one has a matching entry in assumptions.ts that the Methods page renders. A
 * test asserts the two sets match EXACTLY in both directions, so a tunable can
 * never be added without also being disclosed, and a disclosure can never go
 * stale after a tunable is removed.
 *
 * This file holds the bare numbers only, with no prose, so that the physics
 * layer can import it without depending on anything shaped for a web page.
 */
export const DRIVE_TUNABLES = Object.freeze({
  /** Fixed physics timestep, seconds. Matches the engine's own DT exactly. */
  physicsDtS: 0.005,
  /**
   * Most simulated time a single frame may catch up on, seconds. Browsers stop
   * firing animation frames in a hidden tab, so returning to one can hand the
   * loop a gap of many seconds; without a clamp it would try to run thousands
   * of steps in one frame and lock the page.
   */
  maxCatchUpS: 0.1,
  /** How often the on-screen numbers are rewritten, Hz. Not the physics rate. */
  displayHz: 10,
  /**
   * How far the MODEL itself might be off, as a fraction. This is a declared
   * placeholder, not a measurement: it has not been earned yet. See the
   * assumption entry for why we refuse to reuse the agreement with published
   * figures as an error estimate.
   */
  modelUncertaintyPct: 0.1,
  /**
   * Shape of the overrun (engine braking) curve. Engine braking is scaled by
   * (floor + (1 - floor) * rpm / redline), so at this fraction of its peak at
   * idle and full at the limiter.
   */
  overrunRpmScaleFloor: 0.5,
  /**
   * Engine note while the gearbox is between gears, as a share of full
   * throttle. Quiet and dull rather than silent, which is what makes a gear
   * change sound like a cut instead of a dropout.
   */
  shiftThrottle: 0.1,
  /**
   * Floor under the engine note when coasting, as a share of full throttle.
   * A real engine is still turning with the throttle shut, so lifting off
   * should not be silence.
   */
  coastThrottle: 0.12,
  /**
   * How fast a key press ramps the pedal, units per second. A key is a switch
   * and a pedal is not; 4 means about a quarter second from nothing to full.
   * This is an input smoothing choice, not a claim about any car.
   */
  inputRampPerS: 4,
});

export type DriveTunableKey = keyof typeof DRIVE_TUNABLES;
