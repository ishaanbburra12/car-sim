import Link from "next/link";
import { PARTS } from "../../src/data";
import { CARS } from "../../src/cars";
import { estimate } from "../../src/engine";
import { fmt } from "../../src/ui/format";
import { DRIVE_ASSUMPTIONS } from "../../src/drive/assumptions";

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
          tag &mdash; but see the pricing section below for why the part prices
          themselves are still an assumption.
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

      <Section title="Testing the model on a car it had never seen">
        <p>
          The three cars above cannot tell you how good this model is, because
          the model was tuned to match them. When they first came out 14&ndash;15%
          slow to 60, the Civic&rsquo;s traction fraction and every car&rsquo;s
          shift time were adjusted until they lined up. Their agreement is an
          in-sample fit. It measures nothing.
        </p>
        <p>
          So the model was tested once, properly, on a holdout: a 2019 Mazda
          MX-5, chosen for being as unlike the fitted three as a petrol manual
          car gets &mdash; half the weight of the GT-R, a third of the power of
          the GT3 RS, naturally aspirated, rear drive, no aero, very short
          gearing. The protocol was fixed before the result was seen: published
          values entered as published, derived values by the same formulas,
          and every assumed value copied from the most similar existing car
          rather than chosen. Nothing was adjusted afterwards.
        </p>
        <p className="rounded-md border border-white/10 bg-white/[0.03] p-3">
          <span className="text-slate-300">Result: &minus;4.6%.</span> The model
          predicted 5.43 s to 60 mph; the published tested figure is 5.70 s.
          That is the only honest accuracy number this project has, and it is
          the reason the drive mode&rsquo;s model band says &ldquo;assumed
          &plusmn;10%&rdquo; rather than &plusmn;2%.
        </p>
        <p className="rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-amber-100/80">
          <strong className="font-medium">The same test found a real failure.</strong>{" "}
          The model gives that car a 158 mph top speed; the real one does about
          135. Our figure is what the engine and the drag would allow, and the
          real car is almost certainly electronically limited below it &mdash;
          something this model knows nothing about. Top speed was left out of
          the validation because no well-sourced tested figure could be found
          for it, but the gap is reported here rather than quietly dropped.
          Treat top speed for any road car as the least trustworthy number on
          the site.
        </p>
        <p>
          One car is not a sample. A second and third holdout would say much
          more, and an EV or an automatic would probably break something
          interesting.
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
            <strong className="font-medium text-slate-300">Speed limiters.</strong>{" "}
            Many road cars are electronically limited below what their engine
            and drag would allow. The model always reports the physical limit,
            which is why its top speeds can read high.
          </li>
          <li>
            <strong className="font-medium text-slate-300">Everything about driving.</strong>{" "}
            No cornering simulation, no track, no driver skill, no gearbox
            strategy beyond &ldquo;use the gear that pulls hardest&rdquo;.
          </li>
        </ul>
      </Section>

      <Section title="How the catalogue is sourced">
        <p>
          The catalogue and the simulator work to opposite rules, and it is worth
          being clear which you are looking at. The simulator estimates, and labels
          every estimate. The catalogue does not estimate at all: a figure is there
          because somebody published it, or it is not there.
        </p>
        <p>
          That makes the blanks meaningful, so the catalogue distinguishes four
          kinds of them rather than printing &ldquo;not listed&rdquo; for all four.{" "}
          <strong className="font-medium text-slate-300">Not published</strong>{" "}
          means the people who would know have not said &mdash; Tesla has published
          no power figure for the Model 3 since 2015.{" "}
          <strong className="font-medium text-slate-300">No single figure</strong>{" "}
          means none exists: a Le Mans car&rsquo;s weight is a Balance of Performance
          number the organisers reset between races.{" "}
          <strong className="font-medium text-slate-300">Sources disagree</strong>{" "}
          means published figures contradict each other and we are not going to pick
          a winner by coin-toss. A plain{" "}
          <strong className="font-medium text-slate-300">not listed</strong> is the
          only one that is our own gap.
        </p>
        <p>
          Completeness is scored against what could be known about a given car, not
          against a flat five figures. Marking a prototype out of five when three of
          the five are things nobody publishes reported our denominator as the
          car&rsquo;s incompleteness.
        </p>
        <p className="rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-amber-100/80">
          <strong className="font-medium text-amber-100">On links.</strong> Where a
          source carries a link, the page says the date it was checked and how. Most
          say <em>found by search</em>, which is weaker than it sounds: a web search
          returned that page and the content it returned matched the figure cited
          here, but nobody opened it in a browser and read around it. The machine
          this catalogue is written on has no route to any manufacturer or motoring
          press domain, so search is the only channel out. Sources without a link
          name the document instead; a link nobody has followed would look like a
          citation without being one.
        </p>
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
          launch rpm, shift time, idle speed and overrun torque are all
          required by the model and{" "}
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

      <Section title="Drive mode: what the live numbers are, and are not">
        <p>
          Drive mode shows numbers that change sixty times a second, which looks
          like a measurement. It is not one, and the distinction matters:
        </p>
        <p className="rounded-md border border-white/10 bg-white/[0.03] p-3">
          <span className="text-slate-300">The readout is exact. The claim is uncertain.</span>{" "}
          The speedometer shows the simulation&rsquo;s own state, which is exact
          within the model. What is uncertain is how closely the model matches a
          real car. So the live cluster is permanently badged as a simulation and
          reads in &ldquo;sim mph&rdquo;, while claims about real cars stay on
          this page.
        </p>
        <p>
          You drive the <em>typical</em> build &mdash; the middle of every
          part&rsquo;s range. The pessimistic and optimistic builds are driven
          alongside from the same inputs, and the distance that opens between
          them is the spread in the parts data, shown as a gap on the road rather
          than claimed as a number.
        </p>
        <p className="rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-amber-100/80">
          <strong className="font-medium">What that gap does NOT include.</strong>{" "}
          It is the uncertainty in the <em>parts</em> only. It says nothing about
          whether the model itself is right &mdash; tire grip, drag, driveline
          losses, launch rpm and shift times are all numbers we picked. On a
          stock car the three versions are identical and the gap is zero; that
          means the parts range is empty, not that the figures are certain, and
          drive mode says so on screen rather than drawing two overlapping
          ghosts.
        </p>
        <p>
          Two further honesty notes that fell out of building it. The three cars
          shift at different moments, so they are sometimes in different gears:
          when that happens the rev counter&rsquo;s spread is not a range, and
          the gauge says so. And because a car that has just shifted is
          momentarily not driving, the <em>faster</em> car can briefly be the
          slower one &mdash; so the gauge band is drawn across all three cars
          rather than between two, and always contains the needle.
        </p>

        <p>
          <span className="text-slate-300">Who changes gear.</span> Each car
          declares its real gearbox, which is published for all of them, so this
          is one of the few fields that is a fact rather than a guess. Manual
          cars hand the gears to you in drive mode; the dual-clutch cars shift
          themselves, as the real ones do. Choosing badly has consequences the
          model already had: a gear that would pass redline makes no power at
          all, and one that is too tall leaves the engine below its torque. The
          gearbox never overrides you.
        </p>
        <p>
          <span className="text-slate-300">Two more per-car assumptions.</span>{" "}
          Driving needs an idle speed and an overrun torque, and neither is
          printed in any spec sheet. Idle speeds are set at 800 rpm for the two
          four-cylinder cars, 750 for the GT-R&rsquo;s V6 (more cylinders firing
          per revolution means it runs smoothly slower) and 1000 for the GT3
          RS, whose race-derived engine idles high. Overrun torque &mdash; what
          it costs to turn an engine over with no fuel &mdash; uses a rule of
          thumb of roughly 25 Nm per litre of displacement, giving 50, 50, 95
          and 100 Nm. A test bounds the result to between 0.01 g and 0.25 g of
          deceleration for every car, so the figures cannot drift into
          nonsense, but they remain guesses with a justification rather than
          measurements.
        </p>
        <p>
          <span className="text-slate-300">
            One place drive mode differs from the Garage on purpose.
          </span>{" "}
          The Garage&rsquo;s whole-run simulation holds the engine at launch rpm
          for the entire run, which models a slipping clutch but never stops
          applying. Drive mode releases that floor the moment the drivetrain
          outruns it, as a real clutch does once it has finished slipping.
          Without this the engine can never rev below launch rpm, so the note
          lands on the same pitch after every early gear change and the car
          sounds mechanical. The two differ in 0-60 by less than one simulation
          step, because by then the engine is past its torque peak &mdash; the
          change is audible rather than numerical, and the Garage&rsquo;s
          published figures are untouched by it.
        </p>

        <p>
          <span className="text-slate-300">The 3D view is a view.</span> It
          draws the three cars at the positions the simulation already
          computed and feeds nothing back, so the physics is identical whether
          it is on screen or switched off. The road, the sky and the camera
          carry no information about any car: the only thing in that picture
          with meaning is the distance between the three cars, which is the
          same ghost gap the panel reports as a number. Everything else is
          scenery, and the view can be turned off without losing anything the
          model knows.
        </p>

        <h3 className="pt-2 font-medium text-slate-300">
          Every number drive mode invents
        </h3>
        <p>
          This list is generated from the code, and a test fails the build if a
          tunable exists without an entry here, or an entry here describes a
          tunable that no longer exists.
        </p>
        <div className="space-y-3 pt-1">
          {DRIVE_ASSUMPTIONS.map((a) => (
            <div key={a.key}>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium text-slate-300">{a.label}</span>
                <span className="tabular-nums text-slate-400">{a.value}</span>
                <span className="rounded border border-white/10 px-1 text-[10px] uppercase tracking-wide text-slate-500">
                  {a.kind.replace("-", " ")}
                </span>
              </div>
              <p className="text-slate-500">{a.why}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="How part prices are scaled">
        <p>
          Every part price was written for the Vantora Pulse, a $26,000
          hatchback. The same work costs more on an expensive car: more labour,
          rarer parts, and suppliers who price to the market. So part prices are
          multiplied by
        </p>
        <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 font-mono text-xs text-slate-300">
          multiplier = max(1, (base price / $26,000) ^ 0.5)
        </p>
        <p>
          The square root matters. A car costing nine times as much pays about
          three times as much for parts, not nine times, which matches the rough
          shape of real tuning prices better than scaling straight up. The
          reference car has a multiplier of exactly 1, so its prices are
          untouched.
        </p>
        <p className="rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-amber-100/80">
          This is an assumption, not a surveyed price list. Nobody checked what
          a turbo kit actually costs for each of these cars. The multiplier
          makes the numbers less wrong than charging hatchback prices for
          supercar parts, but it is still a guess with a formula attached.
        </p>
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
