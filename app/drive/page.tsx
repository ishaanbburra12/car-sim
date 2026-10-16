"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CARS, carById } from "../../src/cars";
import { hpAt, partsForCar, traceRun } from "../../src/engine";
import { EngineSound, cylindersFor } from "../../src/ui/sound";
import { PARTS } from "../../src/data";
import DrivePanel from "./DrivePanel";
import { fmt } from "../../src/ui/format";
import type { RunSample } from "../../src/types";

const IDLE_RPM = 800;

export default function DrivePage() {
  const [carId, setCarId] = useState(CARS[0].id);
  const [rpm, setRpm] = useState(IDLE_RPM);
  const [buildIds, setBuildIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [live, setLive] = useState<RunSample | null>(null);
  const soundRef = useRef<EngineSound | null>(null);
  /** Set by the drive panel so we can silence it before starting our own note. */
  const silenceDriveRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number | null>(null);

  const car = carById(carId) ?? CARS[0];
  const cylinders = cylindersFor(car.id);

  // Power the engine model says this car makes at the rpm on the slider.
  const hpNow = hpAt(
    live ? live.rpm : rpm,
    car.stockHp,
    car.peakHpRpm,
    car.engineType,
  );
  const firingHz = ((live ? live.rpm : rpm) / 60) * (cylinders / 2);

  // The recorded run for this car, straight from the physics engine. Stock
  // only: builds live in the Garage.
  const trace = useMemo(() => traceRun(car), [car]);

  // Stop the audio and any replay if the page goes away.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      void soundRef.current?.stop();
      soundRef.current = null;
    };
  }, []);

  function stopReplay() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setReplaying(false);
    setLive(null);
    soundRef.current?.setThrottle(1);
    soundRef.current?.setRpm(rpm);
  }

  /**
   * Play the recorded run back in real time. Each frame we look up where the
   * car was at that moment and feed its rpm to the synth, so the gear changes
   * land exactly when the simulation says they did.
   */
  async function playLaunch() {
    if (replaying) {
      stopReplay();
      return;
    }
    if (!soundRef.current) await startEngine();
    const sound = soundRef.current;
    if (!sound) return;

    const samples = trace.samples;
    if (samples.length === 0) return;

    setReplaying(true);
    const startedAt = performance.now();
    let i = 0;

    const step = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      while (i < samples.length - 1 && samples[i + 1].t <= elapsed) i++;
      const s = samples[i];

      sound.setThrottle(s.shifting ? 0.12 : 1);
      sound.setRpm(s.rpm);
      setLive(s);

      if (elapsed >= samples[samples.length - 1].t) {
        stopReplay();
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  async function stopEngine() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setReplaying(false);
    setLive(null);
    await soundRef.current?.stop();
    soundRef.current = null;
    setRunning(false);
  }

  async function startEngine() {
    // Only one engine note at a time, in either direction.
    silenceDriveRef.current?.();
    await stopEngine();
    const sound = new EngineSound({
      cylinders,
      engineType: car.engineType,
      idleRpm: IDLE_RPM,
      redlineRpm: car.redlineRpm,
    });
    soundRef.current = sound;
    await sound.start(rpm);
    setRunning(true);
  }

  function changeRpm(next: number) {
    setRpm(next);
    soundRef.current?.setRpm(next);
  }

  async function changeCar(nextId: string) {
    const wasRunning = running;
    await stopEngine();
    setCarId(nextId);
    setBuildIds([]);
    const next = carById(nextId);
    if (next) {
      const clamped = Math.min(rpm, next.redlineRpm);
      setRpm(clamped);
      if (wasRunning) {
        const sound = new EngineSound({
          cylinders: cylindersFor(next.id),
          engineType: next.engineType,
          idleRpm: IDLE_RPM,
          redlineRpm: next.redlineRpm,
        });
        soundRef.current = sound;
        await sound.start(clamped);
        setRunning(true);
      }
    }
  }

  const shownRpm = live ? Math.round(live.rpm) : rpm;
  const revFraction = (shownRpm - IDLE_RPM) / (car.redlineRpm - IDLE_RPM);
  const nearRedline = shownRpm > car.redlineRpm * 0.92;

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Rev test</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-400">
        Sweep the throttle and hear a synthesised engine note built from the
        car&rsquo;s rev range and cylinder count. The power figure below comes
        from the same model the{" "}
        <Link href="/garage" className="text-amber-400 underline underline-offset-2">
          Garage
        </Link>{" "}
        uses.
      </p>

      <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <label htmlFor="car" className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Car
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <select
            id="car"
            value={carId}
            onChange={(e) => void changeCar(e.target.value)}
            className="rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            {CARS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand} {c.name}
                {c.isReal ? "" : " (fictional)"}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-400">
            {cylinders} cylinders &middot;{" "}
            {car.engineType === "na" ? "naturally aspirated" : "turbocharged"}{" "}
            &middot; {car.redlineRpm.toLocaleString("en-US")} rpm redline
          </span>
        </div>

        {/* ---- Start / stop ---- */}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void (running ? stopEngine() : startEngine())}
            className={[
              "rounded-md border px-4 py-2 text-sm font-medium transition",
              running
                ? "border-red-400/50 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                : "border-amber-400/60 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20",
            ].join(" ")}
          >
            {running ? "Stop engine" : "Start engine"}
          </button>
          {!running && (
            <span className="text-xs text-slate-500">
              Your browser needs a click before it will play audio.
            </span>
          )}
        </div>

        {/* ---- Throttle ---- */}
        <div className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="rpm" className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Engine speed
            </label>
            <span
              className={[
                "text-lg font-semibold tabular-nums",
                nearRedline ? "text-red-400" : "text-slate-100",
              ].join(" ")}
            >
              {shownRpm.toLocaleString("en-US")}{" "}
              <span className="text-xs font-normal text-slate-500">rpm</span>
            </span>
          </div>

          <input
            id="rpm"
            type="range"
            min={IDLE_RPM}
            max={car.redlineRpm}
            step={25}
            value={shownRpm}
            disabled={replaying}
            onChange={(e) => changeRpm(Number(e.target.value))}
            className="w-full accent-amber-500"
            aria-valuetext={`${rpm} rpm`}
          />

          {/* Rev bar, redline marked */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className={[
                "h-full rounded-full transition-[width] duration-75",
                nearRedline ? "bg-red-500" : "bg-amber-500",
              ].join(" ")}
              style={{ width: `${Math.max(0, Math.min(1, revFraction)) * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-slate-600">
            <span>idle {IDLE_RPM}</span>
            <span className={nearRedline ? "text-red-400" : undefined}>
              redline {car.redlineRpm.toLocaleString("en-US")}
            </span>
          </div>
        </div>

        {/* ---- Readouts ---- */}
        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Power at this rpm
            </dt>
            <dd className="mt-0.5 tabular-nums">
              <span className="text-[10px] uppercase tracking-wide text-amber-400/80">
                est.
              </span>{" "}
              <span className="font-semibold text-slate-100">
                {fmt(hpNow, 0)}
              </span>{" "}
              <span className="text-xs text-slate-500">hp</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Share of peak
            </dt>
            <dd className="mt-0.5 tabular-nums font-semibold text-slate-100">
              {fmt((hpNow / car.stockHp) * 100, 0)}
              <span className="text-xs font-normal text-slate-500">%</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Firing rate
            </dt>
            <dd className="mt-0.5 tabular-nums font-semibold text-slate-100">
              {fmt(firingHz, 0)}
              <span className="text-xs font-normal text-slate-500"> Hz</span>
            </dd>
          </div>
        </dl>
      </div>


      {/* ---- Build picker, so the ghosts have something to disagree about ---- */}
      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Build
          </h2>
          <span className="text-xs text-slate-500">
            One part per category. A stock car has no spread to show.
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {partsForCar(car).map((part) => {
            const on = buildIds.includes(part.id);
            return (
              <button
                key={part.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setBuildIds((prev) => {
                    if (prev.includes(part.id)) return prev.filter((x) => x !== part.id);
                    const sameCat = PARTS.filter((p) => p.category === part.category).map(
                      (p) => p.id,
                    );
                    return [...prev.filter((x) => !sameCat.includes(x)), part.id];
                  })
                }
                className={[
                  "rounded-md border px-2.5 py-1.5 text-xs transition",
                  on
                    ? "border-amber-400/60 bg-amber-400/10 text-amber-100"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25",
                ].join(" ")}
              >
                {part.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <DrivePanel
          car={car}
          partIds={buildIds}
          onTakeControl={() => void stopEngine()}
          onRegisterSilence={(fn) => {
            silenceDriveRef.current = fn;
          }}
        />
      </div>

      {/* ---- Launch replay ---- */}
      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Launch replay
          </h2>
          <span className="text-xs text-slate-500">
            stock car &middot; {trace.samples.length} samples &middot; gears 1&ndash;
            {trace.topGearUsed}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Plays the simulated standing start back in real time and feeds its
          rpm to the synthesiser, so the gear changes land exactly where the
          physics put them. The revs you hear are the ones the model computed,
          not an animation.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void playLaunch()}
            className={[
              "rounded-md border px-4 py-2 text-sm font-medium transition",
              replaying
                ? "border-red-400/50 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                : "border-amber-400/60 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20",
            ].join(" ")}
          >
            {replaying ? "Stop replay" : "Play launch"}
          </button>
          <span className="text-xs text-slate-500">
            0&ndash;60 in{" "}
            <span className="text-slate-300">
              {fmt(trace.zeroToSixtyS, 2)}s
            </span>
            , quarter mile in{" "}
            <span className="text-slate-300">{fmt(trace.quarterMileS, 2)}s</span>{" "}
            <span className="text-[10px] uppercase tracking-wide text-amber-400/80">
              est.
            </span>
          </span>
        </div>

        {/* Live run readout */}
        <dl className="mt-4 grid grid-cols-4 gap-4 border-t border-white/10 pt-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Time</dt>
            <dd className="mt-0.5 tabular-nums font-semibold text-slate-100">
              {fmt(live?.t ?? 0, 2)}
              <span className="text-xs font-normal text-slate-500">s</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Speed</dt>
            <dd className="mt-0.5 tabular-nums font-semibold text-slate-100">
              {fmt(live?.speedMph ?? 0, 0)}
              <span className="text-xs font-normal text-slate-500"> mph</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Gear</dt>
            <dd
              className={[
                "mt-0.5 tabular-nums font-semibold",
                live?.shifting ? "text-amber-400" : "text-slate-100",
              ].join(" ")}
            >
              {live?.shifting ? "\u2014" : (live?.gear ?? 1)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Gear changes
            </dt>
            <dd className="mt-0.5 tabular-nums font-semibold text-slate-100">
              {trace.topGearUsed - 1}
            </dd>
          </div>
        </dl>

        {/* Gear map: where each change happens across the run */}
        <div className="mt-4">
          <div className="relative h-7 w-full overflow-hidden rounded-md bg-white/[0.04]">
            {trace.samples.map((s, idx) =>
              idx > 0 && s.gear !== trace.samples[idx - 1].gear ? (
                <div
                  key={s.t}
                  className="absolute top-0 h-full w-px bg-amber-400/70"
                  style={{
                    left: `${(s.t / trace.quarterMileS) * 100}%`,
                  }}
                  title={`Shift into gear ${s.gear} at ${s.t.toFixed(2)}s`}
                />
              ) : null,
            )}
            {live && (
              <div
                className="absolute top-0 h-full w-0.5 bg-slate-100"
                style={{ left: `${(live.t / trace.quarterMileS) * 100}%` }}
              />
            )}
            <div
              className="absolute top-0 h-full border-l border-dashed border-slate-500/60"
              style={{
                left: `${(trace.zeroToSixtyS / trace.quarterMileS) * 100}%`,
              }}
              title={`60 mph at ${trace.zeroToSixtyS.toFixed(2)}s`}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-slate-600">
            <span>launch</span>
            <span>
              <span className="text-amber-400/70">|</span> shifts &middot;{" "}
              <span className="text-slate-500">¦</span> 60 mph
            </span>
            <span>quarter mile</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-4 text-xs leading-relaxed text-slate-500">
        <p>
          <span className="text-slate-400">How the sound is made.</span> A
          four-stroke engine fires {cylinders} / 2 = {cylinders / 2} times per
          revolution, so at {shownRpm.toLocaleString("en-US")} rpm the
          fundamental is{" "}
          {fmt(firingHz, 0)} Hz. Six harmonics of that are stacked and pushed
          through a low-pass filter that opens as the revs rise, with filtered
          noise on top for air rush.
        </p>
        <p className="mt-2">
          <span className="text-slate-400">This is not a recording.</span> It is
          a synthesiser making a plausible engine-ish noise, and it makes no
          claim to sound like any real car. Nothing here feeds back into the
          physics &mdash; the power figure is read from the model, but the sound
          never affects it.
        </p>
      </div>

      <div className="mt-6">
        <Link href="/garage" className="text-sm text-amber-400 underline underline-offset-2">
          &larr; Back to the Garage
        </Link>
      </div>
    </main>
  );
}
