"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CARS, carById } from "../../src/cars";
import { hpAt } from "../../src/engine";
import { EngineSound, cylindersFor } from "../../src/ui/sound";
import { fmt } from "../../src/ui/format";

const IDLE_RPM = 800;

export default function DrivePage() {
  const [carId, setCarId] = useState(CARS[0].id);
  const [rpm, setRpm] = useState(IDLE_RPM);
  const [running, setRunning] = useState(false);
  const soundRef = useRef<EngineSound | null>(null);

  const car = carById(carId) ?? CARS[0];
  const cylinders = cylindersFor(car.id);

  // Power the engine model says this car makes at the rpm on the slider.
  const hpNow = hpAt(rpm, car.stockHp, car.peakHpRpm, car.engineType);
  const firingHz = (rpm / 60) * (cylinders / 2);

  // Stop the audio if the page goes away or the car changes.
  useEffect(() => {
    return () => {
      void soundRef.current?.stop();
      soundRef.current = null;
    };
  }, []);

  async function stopEngine() {
    await soundRef.current?.stop();
    soundRef.current = null;
    setRunning(false);
  }

  async function startEngine() {
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

  const revFraction = (rpm - IDLE_RPM) / (car.redlineRpm - IDLE_RPM);
  const nearRedline = rpm > car.redlineRpm * 0.92;

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
              {rpm.toLocaleString("en-US")}{" "}
              <span className="text-xs font-normal text-slate-500">rpm</span>
            </span>
          </div>

          <input
            id="rpm"
            type="range"
            min={IDLE_RPM}
            max={car.redlineRpm}
            step={25}
            value={rpm}
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

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-4 text-xs leading-relaxed text-slate-500">
        <p>
          <span className="text-slate-400">How the sound is made.</span> A
          four-stroke engine fires {cylinders} / 2 = {cylinders / 2} times per
          revolution, so at {rpm.toLocaleString("en-US")} rpm the fundamental is{" "}
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
