import Link from "next/link";
import { PARTS } from "../../src/data";
import { CARS } from "../../src/cars";
import { estimate } from "../../src/engine";
import { fmt } from "../../src/ui/format";

export const metadata = {
  title: "Methods | Vantora Pulse Configurator",
  description: "Every assumption behind the estimates on this site.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-white/10 py-8">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-400">{children}</div>
    </section>
  );
}

export default function MethodsPage() {
  const realCars = CARS.filter((c) => c.isReal);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Methods</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Every performance number on this site comes out of a simplified physics
        model, not a measurement. This page lists what the model does, what it
        ignores, where the inputs came from, and how far off the real cars it
        is. If a number here matters to you, read this page first.
      </p>

      <Section title="What the model actually does">
        <p>
          A standing-start run is simulated in 5 millisecond steps. At each step
          the model picks a gear, works out the force at the wheels from a
          simplified power curve, caps that force at what the tires can grip,
          subtracts aerodynamic drag and rolling resistance, and updates the
          speed. It records the clock when the car reaches 60 mph and when it
          has covered a quarter mile. Whatever speed it has settled at after
          120 seconds is reported as top speed.
        </p>
        <p>
          Braking is integrated separately in 1 millisecond steps, because a car
          with downforce loses grip as it slows. At each step the deceleration
          is whichever is smaller: what the tires can hold, or what the brakes
          can produce. That is why better tires on their own often do nothing.
        </p>
        <p>
          Cornering grip is reported at 60 mph, with downforce included. A car
          with a big wing corners harder than that above 60 mph and no better
          than its tires below it.
        </p>
      </Section>

      <Section title="Why every number is a range">
        <p>
          Each part is described by a low and a high figure rather than one
          number, because real tuning results vary enormously with the specific
          car, the tune, and the parts around it. The model runs twice: once
          taking the pessimistic end of every part, once taking the optimistic
          end.
        </p>
        <p className="rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-amber-100/80">
          This is important: the low end assumes <em>every single part
          underdelivers at once</em>, and the high end assumes{" "}
          <em>every part overdelivers at once</em>. Both are unlikely. Real
          results usually land somewhere in the middle, not at the edges. The
          band is a plausible spread, not a confidence interval, and it has no
          statistical meaning.
        </p>
        <p>
          Prices are the one exception. A total is just the base price plus the
          part costs, so it is exact arithmetic and carries no &ldquo;est.&rdquo;
          tag. The underlying part prices are invented, though, and were written
          for a mainstream hatchback, so they are almost certainly too low for
          an exotic.
        </p>
      </Section>

      <Section title="How close the model gets to the real cars">
        <p>
          The three real cars are the only reality check available. Published
          0-60 figures use the US convention of a one-foot rollout, so the model
          reports a rollout time too and compares like with like.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 text-left font-medium">Car</th>
                <th className="py-2 text-right font-medium">0-60 model</th>
                <th className="py-2 text-right font-medium">published</th>
                <th className="py-2 text-right font-medium">Top model</th>
                <th className="py-2 text-right font-medium">published</th>
              </tr>
            </thead>
            <tbody>
              {realCars.map((car) => {
                const s = estimate(car, []).stock;
                return (
                  <tr key={car.id} className="border-t border-white/5">
                    <td className="py-2 text-slate-300">
                      {car.brand} {car.name}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-300">
                      {fmt(s.zeroToSixtyRolloutS, 2)}s
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-500">
                      {fmt(car.published?.zeroToSixtyS ?? 0, 1)}s
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-300">
                      {fmt(s.topSpeedMph, 0)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-500">
                      {car.published?.topSpeedMph}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="rounded-md border border-red-500/20 bg-red-500/5 p-3 text-red-100/80">
          <strong className="font-medium">One of those rows is circular.</strong>{" "}
          Porsche does not publish a drag coefficient for the 992 GT3 RS, so we
          worked backwards from its published 184 mph top speed to estimate one.
          That means the GT3 RS top speed matching is guaranteed and proves
          nothing. The GT-R and Type R top speeds use published drag
          coefficients and are honest checks.
        </p>
      </Section>

      <Section title="What the model ignores">
        <ul className="list-inside list-disc space-y-1.5">
          <li>
            <strong className="font-medium text-slate-300">Weight transfer under braking.</strong>{" "}
            Real cars load the front tires when stopping. We treat grip as if
            weight stayed put.
          </li>
          <li>
            <strong className="font-medium text-slate-300">Tire temperature and wear.</strong>{" "}
            Grip is one fixed number. Cold tires, hot tires and worn tires all
            behave the same here.
          </li>
          <li>
            <strong className="font-medium text-slate-300">Aero balance.</strong>{" "}
            Downforce is a single number for the whole car, with no front/rear
            split, so handling balance is not modelled at all.
          </li>
          <li>
            <strong className="font-medium text-slate-300">Drag reduction systems.</strong>{" "}
            Cars with active aero are modelled in one fixed configuration.
          </li>
          <li>
            <strong className="font-medium text-slate-300">Real power curves.</strong>{" "}
            Two generic curve shapes stand in for every engine. No turbo lag, no
            variable valve timing, no boost-by-gear.
          </li>
          <li>
            <strong className="font-medium text-slate-300">Launch control detail.</strong>{" "}
            A single launch rpm per car stands in for the whole clutch and
            traction strategy.
          </li>
          <li>
            <strong className="font-medium text-slate-300">Everything about driving.</strong>{" "}
            No cornering simulation, no track, no driver skill, no gearbox
            strategy beyond &ldquo;use the gear that pulls hardest&rdquo;.
          </li>
        </ul>
      </Section>

      <Section title="Where the car data came from">
        <p>
          Values in the car data are tagged in the source as one of three kinds.{" "}
          <strong className="font-medium text-slate-300">Published</strong>{" "}
          figures come from the manufacturer or a major test.{" "}
          <strong className="font-medium text-slate-300">Derived</strong>{" "}
          figures are calculated from a published one.{" "}
          <strong className="font-medium text-slate-300">Assumed</strong>{" "}
          figures are our own estimates.
        </p>
        <p className="rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-amber-100/80">
          The assumed bucket is larger than you might expect. Tire grip, brake
          limit, driveline efficiency, rolling resistance, traction fraction,
          launch rpm and shift time are all required by the model and{" "}
          <em>published by nobody</em>. So a meaningful part of every
          &ldquo;real&rdquo; car here is our guesswork wearing a real car&rsquo;s
          name. Frontal areas are all approximated as 0.8 &times; width &times;
          height, the standard rule of thumb.
        </p>
        <div className="space-y-4 pt-2">
          {realCars.map((car) => (
            <div key={car.id}>
              <div className="font-medium text-slate-300">
                {car.brand} {car.name}
              </div>
              <p className="text-slate-500">{car.note}</p>
              <ul className="mt-1 space-y-0.5">
                {car.sources?.map((s) => (
                  <li key={s}>
                    <a
                      href={s}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-xs text-amber-400/80 underline underline-offset-2 hover:text-amber-300"
                    >
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="How part effects are modelled">
        <p>
          Power gains are percentages of the car&rsquo;s stock power, not fixed
          horsepower, because a given exhaust is worth far more on a 565 hp
          engine than on a 200 hp one. Weight, tire grip, brake limit and
          downforce changes are absolute, because a rear seat weighs the same
          whatever it is bolted into.
        </p>
        <p>
          Power parts stack with diminishing returns: gains are sorted
          largest-first and each one after the first counts for 92% as much as
          the one before it. Sorting means the order you click parts in never
          changes the result.
        </p>
        <div className="space-y-3 pt-2">
          {PARTS.map((part) => (
            <div key={part.id}>
              <div className="font-medium text-slate-300">
                {part.name}{" "}
                <span className="font-normal text-slate-500">
                  &mdash; ${part.costUsd.toLocaleString("en-US")}
                </span>
              </div>
              <p className="text-slate-500">{part.assumption}</p>
              {part.fits && (
                <p className="mt-0.5 text-xs text-slate-600">
                  Fitment: {part.fits.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Constants">
        <p>
          Air density 1.2 kg/m&sup3; (sea level, about 20 &deg;C). Gravity 9.81
          m/s&sup2;. Rotational inertia is approximated by treating the car as
          4% heavier than it is. Simulation step 5 ms for acceleration, 1 ms for
          braking. Cornering grip is reported at 60 mph. The one-foot rollout is
          0.3048 m.
        </p>
      </Section>

      <Section title="Legal and naming">
        <p>
          Vantora and Pulse are invented names for a fictional car. The other
          three cars are real production vehicles, named here as factual
          references. This site is not affiliated with, endorsed by, or
          connected to any manufacturer. It uses no manufacturer logos, photos,
          fonts or brand colours.
        </p>
        <p>
          Stock figures for the real cars are published facts, cited above.
          Every modified figure is this model&rsquo;s estimate and should not be
          taken as a claim about what any real car does.
        </p>
      </Section>

      <div className="border-t border-white/10 pt-8">
        <Link href="/garage" className="text-sm text-amber-400 underline underline-offset-2">
          &larr; Back to the Garage
        </Link>
      </div>
    </main>
  );
}
