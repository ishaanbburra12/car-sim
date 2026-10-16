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
   * Shape of the overrun (engine braking) curve. Engine braking is scaled by
   * (floor + (1 - floor) * rpm / redline), so at this fraction of its peak at
   * idle and full at the limiter.
   */
  overrunRpmScaleFloor: 0.5,
  /**
   * How fast a key press ramps the pedal, units per second. A key is a switch
   * and a pedal is not; 4 means about a quarter second from nothing to full.
   * This is an input smoothing choice, not a claim about any car.
   */
  inputRampPerS: 4,
});

export type DriveTunableKey = keyof typeof DRIVE_TUNABLES;
