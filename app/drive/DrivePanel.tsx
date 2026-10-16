"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Car } from "../../src/types";
import type { DriverInputs } from "../../src/engine";
import { estimate } from "../../src/engine";
import {
  advance,
  createSession,
  frameOf,
  resetSession,
  type DriveFrame,
} from "../../src/drive/session";
import { createDriveLoop, rampInput, type DriveLoop } from "../../src/drive/loop";
import { DRIVE_TUNABLES } from "../../src/drive/tunables";
import { fmt } from "../../src/ui/format";
import { EngineSound, cylindersFor } from "../../src/ui/sound";
import Gauge from "./Gauge";

/** Engine note while the gearbox is between gears: quiet and dull, not silent. */
const SHIFT_THROTTLE = 0.1;
/** Floor under the engine note when coasting, so lifting off is not silence. */
const COAST_THROTTLE = 0.12;
const IDLE_RPM = 800;

/**
 * Drive the configured car in real time.
 *
 * The person drives the EXPECTED build. The pessimistic and optimistic builds
 * run alongside from the same inputs, and the distance that opens between them
 * is the uncertainty in the parts data — shown as a gap rather than claimed as
 * a number.
 *
 * Everything on screen is the simulation's own state, which is exact within
 * the model. What is uncertain is how closely the model matches a real car,
 * which is why the cluster is permanently badged as a simulation and why
 * claims about real cars live on the Methods page, not here.
 */
export default function DrivePanel({
  car,
  partIds,
  onTakeControl,
}: {
  car: Car;
  partIds: string[];
  /** Lets the page silence anything else making noise before we start. */
  onTakeControl?: () => void;
}) {
  const [driving, setDriving] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [frame, setFrame] = useState<DriveFrame | null>(null);
  const [pedals, setPedals] = useState({ throttle: 0, brake: 0 });

  const loopRef = useRef<DriveLoop | null>(null);
  const soundRef = useRef<EngineSound | null>(null);
  const soundOnRef = useRef(true);
  const targetRef = useRef({ throttle: 0, brake: 0 });
  const pedalRef = useRef({ throttle: 0, brake: 0 });
  const lastInputMsRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // A new array identity every render would restart the session constantly, so
  // everything downstream keys off the build's contents, not the array.
  const partKey = partIds.join(",");

  // Gauge ranges come from the model's own estimate for this build, so the
  // dial never has to be guessed at.
  const ranges = useMemo(() => {
    const e = estimate(car, partIds);
    const topMph = Math.max(e.optimistic.topSpeedMph, e.pessimistic.topSpeedMph);
    return {
      speedMax: Math.ceil((topMph * 1.05) / 20) * 20,
      rpmMax: Math.ceil(car.redlineRpm / 1000) * 1000,
    };
  }, [car, partKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Read fresh each frame; ramps the pedals so a key is not a switch. */
  const readInputs = useCallback((): DriverInputs => {
    const nowMs = performance.now();
    const dt = lastInputMsRef.current ? (nowMs - lastInputMsRef.current) / 1000 : 0;
    lastInputMsRef.current = nowMs;
    const clamped = Math.min(Math.max(dt, 0), DRIVE_TUNABLES.maxCatchUpS);
    pedalRef.current = {
      throttle: rampInput(pedalRef.current.throttle, targetRef.current.throttle, clamped),
      brake: rampInput(pedalRef.current.brake, targetRef.current.brake, clamped),
    };
    return pedalRef.current;
  }, []);

  const stopSound = useCallback(() => {
    const sound = soundRef.current;
    soundRef.current = null;
    void sound?.stop();
  }, []);

  const stop = useCallback(() => {
    loopRef.current?.stop();
    loopRef.current = null;
    stopSound();
    targetRef.current = { throttle: 0, brake: 0 };
    pedalRef.current = { throttle: 0, brake: 0 };
    lastInputMsRef.current = 0;
    setPedals({ throttle: 0, brake: 0 });
    setDriving(false);
  }, [stopSound]);

  const start = useCallback(() => {
    if (loopRef.current) return;
    onTakeControl?.();

    // The click that got us here is the user gesture browsers require before
    // audio may start.
    if (soundOnRef.current) {
      const sound = new EngineSound({
        cylinders: cylindersFor(car.id),
        engineType: car.engineType,
        idleRpm: IDLE_RPM,
        redlineRpm: car.redlineRpm,
      });
      soundRef.current = sound;
      void sound.start(IDLE_RPM);
    }

    const loop = createDriveLoop({
      session: createSession(car, partIds),
      inputs: readInputs,
      // Audio must move every frame; updating it at the display rate is
      // audible as stepping.
      onTick: (f) => {
        const sound = soundRef.current;
        if (!sound) return;
        const driven = f.outputs.expected;
        sound.setThrottle(
          driven.shifting
            ? SHIFT_THROTTLE
            : Math.max(COAST_THROTTLE, pedalRef.current.throttle),
        );
        sound.setRpm(driven.rpm);
      },
      onFrame: (f) => {
        setFrame(f);
        setPedals({ ...pedalRef.current });
      },
    });
    loopRef.current = loop;
    loop.start();
    setDriving(true);
    containerRef.current?.focus();
  }, [car, partKey, readInputs, onTakeControl]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    const loop = loopRef.current;
    if (!loop) return;
    const fresh = resetSession(loop.getSession());
    loop.setSession(fresh);
    setFrame(frameOf(fresh));
  }, []);

  // Changing car or build invalidates the run entirely.
  useEffect(() => {
    stop();
    setFrame(null);
  }, [car, partKey, stop]);

  // Always tear the loop and the audio down when the component goes away.
  useEffect(
    () => () => {
      loopRef.current?.stop();
      void soundRef.current?.stop();
    },
    [],
  );

  // Toggling sound mid-drive starts or stops the note without ending the run.
  useEffect(() => {
    soundOnRef.current = soundOn;
    if (!driving) return;
    if (!soundOn) {
      stopSound();
      return;
    }
    if (!soundRef.current) {
      const sound = new EngineSound({
        cylinders: cylindersFor(car.id),
        engineType: car.engineType,
        idleRpm: IDLE_RPM,
        redlineRpm: car.redlineRpm,
      });
      soundRef.current = sound;
      void sound.start(frame?.outputs.expected.rpm ?? IDLE_RPM);
    }
  }, [soundOn, driving, car, stopSound]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!driving) return;
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup") {
        targetRef.current.throttle = 1;
        e.preventDefault();
      } else if (k === "s" || k === "arrowdown") {
        targetRef.current.brake = 1;
        e.preventDefault();
      } else if (k === "r") {
        reset();
        e.preventDefault();
      } else if (k === "escape") {
        stop();
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup") targetRef.current.throttle = 0;
      if (k === "s" || k === "arrowdown") targetRef.current.brake = 0;
    };
    // Releasing focus or leaving the tab must release the pedals, or the car
    // drives away on its own.
    const release = () => {
      targetRef.current = { throttle: 0, brake: 0 };
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
    };
  }, [driving, reset, stop]);

  const out = frame?.outputs;
  const driven = out?.expected;
  const speed = driven?.speedMph ?? 0;
  const rpm = driven?.rpm ?? 0;
  const collapsed = frame?.collapsed ?? partIds.length === 0;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="rounded-lg border border-white/10 bg-white/[0.02] p-5 outline-none focus-visible:ring-1 focus-visible:ring-amber-400/40"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
          Drive it
        </h2>
        <span className="text-xs text-slate-500">
          {car.brand} {car.name} &middot;{" "}
          {partIds.length === 0 ? "stock" : `${partIds.length} parts`}
        </span>
      </div>

      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        You drive the typical build. The two faint needles are the pessimistic
        and optimistic ends of the same model, driven from your inputs at the
        same moment &mdash; the spread between them is how much the parts data
        is unsure of itself.
      </p>

      {/* ---- Cluster ---- */}
      <div className="relative mt-4 rounded-md border border-white/10 bg-black/20 p-4">
        {/* The badge lives INSIDE the cluster, so a screenshot of the gauges
            cannot travel without it. */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-amber-300">
            Sim
          </span>
          <span className="text-[10px] text-amber-200/70">typical parts</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Gauge
            label="Speed"
            unit="sim mph"
            max={ranges.speedMax}
            expected={speed}
            low={out?.pessimistic.speedMph ?? 0}
            high={out?.optimistic.speedMph ?? 0}
            tickStep={Math.round(ranges.speedMax / 6)}
            collapsed={collapsed}
          />
          <Gauge
            label="Engine"
            unit="rpm"
            max={ranges.rpmMax}
            expected={rpm}
            low={out?.pessimistic.rpm ?? 0}
            high={out?.optimistic.rpm ?? 0}
            redlineFrom={car.redlineRpm}
            tickStep={1000}
            collapsed={collapsed}
            note={
              frame && !frame.gearsAgree && !frame.collapsed
                ? "the three cars are in different gears, so this spread is not a range"
                : undefined
            }
          />
        </div>

        <dl className="mt-3 grid grid-cols-4 gap-3 border-t border-white/10 pt-3 text-sm">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">Gear</dt>
            <dd
              className={[
                "mt-0.5 tabular-nums font-semibold",
                driven?.shifting ? "text-amber-400" : "text-slate-100",
              ].join(" ")}
            >
              {driven?.shifting ? "—" : (driven?.gear ?? 1)}
              {frame && !frame.gearsAgree && !frame.collapsed && (
                <span className="ml-1 text-[10px] font-normal text-amber-400/80">
                  disagrees
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">Time</dt>
            <dd className="mt-0.5 tabular-nums font-semibold text-slate-100">
              {fmt(frame?.elapsedS ?? 0, 1)}
              <span className="text-xs font-normal text-slate-500">s</span>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">
              Distance
            </dt>
            <dd className="mt-0.5 tabular-nums font-semibold text-slate-100">
              {fmt(frame?.distanceM ?? 0, 0)}
              <span className="text-xs font-normal text-slate-500"> m</span>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">
              Ghost gap
            </dt>
            <dd className="mt-0.5 tabular-nums font-semibold text-slate-100">
              {collapsed ? (
                <span className="text-xs font-normal text-slate-500">n/a</span>
              ) : (
                <>
                  {fmt(frame?.gapM ?? 0, 0)}
                  <span className="text-xs font-normal text-slate-500"> m</span>
                </>
              )}
            </dd>
          </div>
        </dl>

        {collapsed && (
          <p className="mt-3 rounded border border-white/10 bg-white/[0.03] p-2.5 text-xs leading-relaxed text-slate-400">
            <span className="text-slate-300">
              This view cannot show uncertainty on a stock car.
            </span>{" "}
            With no parts fitted, all three versions of the model are the same
            car, so the ghosts sit exactly on top of each other. A zero gap here
            means the parts range is empty, <em>not</em> that the figures are
            certain &mdash; the model itself still carries error that this view
            has no way to draw. Fit a part to see the spread.
          </p>
        )}
      </div>

      {/* ---- Controls ---- */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (driving ? stop() : start())}
          className={[
            "rounded-md border px-4 py-2 text-sm font-medium transition",
            driving
              ? "border-red-400/50 bg-red-500/10 text-red-100 hover:bg-red-500/20"
              : "border-amber-400/60 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20",
          ].join(" ")}
        >
          {driving ? "Stop" : "Take control"}
        </button>
        {driving && (
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-white/10 px-3 py-2 text-sm text-slate-400 hover:border-white/25 hover:text-slate-200"
          >
            Back to the line
          </button>
        )}
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={soundOn}
            onChange={(e) => setSoundOn(e.target.checked)}
            className="accent-amber-500"
          />
          Engine sound
        </label>
        <span className="text-xs text-slate-500">
          {driving ? (
            <>
              <kbd className="rounded border border-white/15 px-1">W</kbd> throttle
              &middot; <kbd className="rounded border border-white/15 px-1">S</kbd>{" "}
              brake &middot;{" "}
              <kbd className="rounded border border-white/15 px-1">R</kbd> restart
            </>
          ) : (
            "Keyboard, or the pedals below."
          )}
        </span>
      </div>

      {/* On-screen pedals: keyboard is not the only way in. */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {(["throttle", "brake"] as const).map((pedal) => (
          <div key={pedal}>
            <button
              type="button"
              disabled={!driving}
              aria-label={pedal === "throttle" ? "Throttle" : "Brake"}
              onPointerDown={() => {
                targetRef.current[pedal] = 1;
              }}
              onPointerUp={() => {
                targetRef.current[pedal] = 0;
              }}
              onPointerLeave={() => {
                targetRef.current[pedal] = 0;
              }}
              className={[
                "w-full rounded-md border px-3 py-2 text-sm capitalize transition",
                driving
                  ? "border-white/15 bg-white/[0.04] text-slate-200 hover:border-white/30 active:bg-white/10"
                  : "cursor-not-allowed border-white/5 text-slate-600",
              ].join(" ")}
            >
              {pedal}
            </button>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={pedal === "throttle" ? "h-full bg-amber-500" : "h-full bg-red-500"}
                style={{ width: `${pedals[pedal] * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-500">
        <span className="text-slate-400">What these numbers are.</span> They are
        the simulation&rsquo;s own state, which is exact within the model. What
        is uncertain is how closely the model matches a real car, and that
        uncertainty is not drawn here &mdash; the gauges show only the spread in
        the parts data.{" "}
        <Link href="/methods" className="text-amber-400 underline underline-offset-2">
          Methods
        </Link>{" "}
        lists every number this mode invents and why.
      </p>
    </div>
  );
}
