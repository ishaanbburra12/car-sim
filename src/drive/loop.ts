import type { DriverInputs } from "../engine";
import { advance, type DriveFrame, type DriveSession } from "./session";
import { DRIVE_TUNABLES } from "./tunables";

/**
 * The animation loop, with its clock injected.
 *
 * The physics lives in advance(), which needs no clock at all. This file only
 * converts frame-to-frame wall time into calls to it. Passing in now/schedule/
 * cancel means the whole loop can be driven by a fake clock in a plain vitest
 * run — no browser, no jsdom, no waiting in real time.
 */
export type Clock = {
  now: () => number; // milliseconds
  schedule: (cb: () => void) => number;
  cancel: (handle: number) => void;
};

export const browserClock: Clock = {
  now: () => performance.now(),
  schedule: (cb) => requestAnimationFrame(cb),
  cancel: (h) => cancelAnimationFrame(h),
};

export type DriveLoop = {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
  /** Replace the session, e.g. after a reset or a car change. */
  setSession: (session: DriveSession) => void;
  getSession: () => DriveSession;
};

export function createDriveLoop(opts: {
  session: DriveSession;
  /** Read fresh each frame, so held keys are picked up without restarting. */
  inputs: () => DriverInputs;
  /** Called every frame with the newest frame; also called on start. */
  onFrame: (frame: DriveFrame, session: DriveSession) => void;
  clock?: Clock;
}): DriveLoop {
  const clock = opts.clock ?? browserClock;
  let session = opts.session;
  let handle: number | null = null;
  let lastMs = 0;
  let displayAccS = 0;

  const tick = () => {
    const nowMs = clock.now();
    const wallDtS = (nowMs - lastMs) / 1000;
    lastMs = nowMs;

    const result = advance(session, opts.inputs(), wallDtS);
    session = result.session;

    // Physics runs at 200 Hz, frames at whatever the screen does, but the
    // readouts are only rewritten displayHz times a second.
    displayAccS += wallDtS;
    if (displayAccS >= 1 / DRIVE_TUNABLES.displayHz) {
      displayAccS = 0;
      opts.onFrame(result.frame, session);
    }

    if (handle !== null) handle = clock.schedule(tick);
  };

  return {
    start() {
      if (handle !== null) return;
      lastMs = clock.now();
      displayAccS = 0;
      handle = clock.schedule(tick);
    },
    stop() {
      if (handle !== null) clock.cancel(handle);
      handle = null;
    },
    isRunning: () => handle !== null,
    setSession(next) {
      session = next;
    },
    getSession: () => session,
  };
}

/**
 * Move a pedal toward its target instead of snapping to it, because a key is a
 * switch and a pedal is not. Pure, so the ramp is testable on its own.
 */
export function rampInput(current: number, target: number, dtS: number): number {
  const maxMove = DRIVE_TUNABLES.inputRampPerS * dtS;
  const delta = target - current;
  if (Math.abs(delta) <= maxMove) return target;
  return current + Math.sign(delta) * maxMove;
}
