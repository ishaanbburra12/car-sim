# DEVLOG

A dated entry per working session: what we built, what broke, what I decided,
and who wrote which part.

---

## 2026-10-15 — Session 1: from a bare engine to a working configurator

### Where we started

Five files existed: `package.json` and `src/{types,data,engine,engine.test}.ts`.
A working stat engine for one fictional car (the Vantora Pulse) with 21 tests
and no UI at all.

### What we did

**Setup.** `npm install`, `npm test` — 21/21 passing from the start. Added
Next.js 15, React 19 and Tailwind 4. Those are the only dependencies added all
session; the chart was hand-written rather than pulling in a chart library.

**Garage screen.** `/garage` with part toggles, a stock-vs-build stats panel,
validation errors and a running price total. Every figure shows as a low-high
range with "est." next to it.

**Engine upgrade (Phase 1).** To support real cars honestly, added:
downforce (`clA`), two power-curve shapes (`engineType: "turbo" | "na"`),
AWD, per-car shift time and launch rpm, and a rollout 0-60 measurement.
Braking changed from a one-line formula to a step-by-step integration, because
downforce bleeds away as a car slows.

**Three real cars (Phase 2).** Porsche 911 GT3 RS (992), Nissan GT-R (R35),
Honda Civic Type R (FL5), in `src/cars.ts`, with sources cited per car and
every value tagged `[published]`, `[derived]` or `[assumed]`.

**Part fitment (Phase 3).** Rule-based, stored in the parts data: a turbo kit
needs a turbo engine; big brakes, sport tires and a rear-seat delete are all
excluded from the GT3 RS. Each rule carries a plain-English reason shown in the
UI instead of silently hiding the part.

**Percentage power gains + four new parts.** Converted `hpGain` (fixed
horsepower) to `hpGainPct` (a fraction of stock power). Added a titanium
exhaust, track tires, an aero package and carbon body panels, plus a new
`aero` part category.

**Chart, Methods page, this DEVLOG (Phases 4-5).** Hand-written inline SVG
small-multiples chart with the range drawn as a band. A `/methods` page listing
the model, the assumptions, the omissions, the sources and the reality check.

Tests went 21 → 65. Everything passes.

### What broke

**My first downforce test was wrong, and the engine was right.** I asserted
that downforce shortens the Pulse's braking distance. It failed. The Pulse has
`brakeLimitG 0.95` and `tireMu 1.0`, so its *brakes* are already the weak link
— adding grip it cannot use changes nothing. Rewrote the test with strong
brakes to isolate the aero, and added a second test pinning the opposite case.
Same trap as the original "sport tires alone don't shorten braking" test.

**Two tests failed on numbers I had guessed.** I hardcoded `6.095` and `143.0`
as the Pulse's locked-in values instead of measuring them first. Real values
were `6.065` and `143.231`.

**Adding a second exhaust broke three older tests.** They assumed "select every
part" was a legal build. With two exhausts, two tire options and two weight
parts, that is now correctly invalid. Added an `onePerCategory()` helper and a
new test asserting that selecting everything *does* fail.

**The real cars came out 14-15% slow to 60 at first.** Three causes, all found
and fixed: the shift time was a manual-gearbox number applied to dual-clutch
cars; we compared our standstill 0-60 against published rollout figures; and
the Type R's traction fraction used *static* front weight instead of accounting
for weight shifting rearward under acceleration.

### What I decided

- **Fictional car first, real cars second.** I had set a "all cars fictional"
  rule. When I asked for a real-car dropdown, Claude flagged that publishing
  invented performance numbers under a real brand is the risky pattern, and
  that the engine could not model a GT3 RS honestly yet. I chose to upgrade the
  engine first rather than ship wrong numbers. The Pulse stays as a baseline.
- **Real cars get a visible honesty split.** Stock figures are published facts
  with sources; every modified figure is labelled an estimate; every real-car
  page carries a "not affiliated with any manufacturer" line. No logos, photos
  or brand colours anywhere.
- **No curve-fitting.** The validation tests use a deliberately loose 10%
  tolerance. We could hit 1% by tuning tire grip and launch rpm per car, but
  then the model is a lookup table for three cars and predicts nothing.
- **Percentage power gains, absolute everything else.** A rear seat weighs the
  same in any car; an exhaust is worth more on a bigger engine.
- **Keep the CSV as a scratch note.** `src/data.ts` stays the single source of
  truth. Revisit if the parts list gets long.
- **No chart library.** Six bars did not justify a dependency.

### Known problems, carried forward

- **The GT3 RS top-speed match is circular.** Porsche publishes no drag
  coefficient for it, so we worked backwards from its published 184 mph top
  speed. It matches because we made it match. Flagged in the code and on the
  Methods page. The GT-R and Type R top speeds are the honest checks.
- **Part prices are hatchback prices.** A $3,200 turbo kit for a GT-R is far
  too cheap. Costs do not scale with the car.
- **The model still ignores** weight transfer under braking, tire temperature,
  aero balance, active aero, turbo lag and real power curves. All listed on
  Methods.
- **Cost and torque are not in the chart** — six bars was the readable limit.

### Who wrote what

- **Me (Raju):** the original engine, types, data and all 21 starting tests;
  every design decision this session — real cars over fictional, upgrade the
  engine before adding them, which three cars, both the scaling fix and new
  parts, and the order of work.
- **Claude:** the Next.js/Tailwind setup, the Garage and Methods pages, the SVG
  chart, the Phase 1 physics changes, the car data and its sourcing, the
  fitment system, and tests 22-65. Also caught the legal issue with real brand
  names and the three sources of the 0-60 gap.

### Next session

1. Decide whether part costs should scale per car.
2. Car-specific parts so the GT3 RS has more than four options.
3. Then: 3D, sound, or driving — none started yet, deliberately.

---

## 2026-10-15 — Session 2: saved to GitHub, part prices scale

### What we did

- **Got the project into git and onto GitHub** at
  `ishaanbburra12/car-sim`. It had been living only in an ephemeral container
  all session, one timeout away from gone.
- **Part prices now scale with the car.** Prices were written for the $26,000
  Pulse and applied unchanged to a $241,300 Porsche. Added a multiplier:
  `max(1, (base price / 26000) ^ 0.5)`. The GT-R's turbo kit goes from $3,200
  to about $6,600, and a full build from $13,950 to $28,900.
- **Wrote the README**, including the accuracy table and the circular GT3 RS
  caveat, so the first thing a visitor reads is honest about what the numbers
  are.

Tests 65 -> 70.

### What broke

**The first push was refused with a 403** — the Claude GitHub App was not
installed on the account. After installing it the push was rejected again,
this time because GitHub had auto-created a README when the repo was made.
Rebased onto it rather than force-pushing, so that commit survives.

### What I decided

- **Square root, not linear.** A car costing 9x more pays about 3x for parts,
  which matches the rough shape of real tuning prices. Linear scaling would
  have put a $29,000 exhaust on the Porsche.
- **The multiplier is labelled an assumption.** The Price card names the exact
  factor on screen and says it is a guess with a formula attached, not a
  surveyed price list. Totals stay exact arithmetic, so they still carry no
  "est." tag.
- **Reference car keeps a multiplier of exactly 1**, so the Pulse's prices and
  all its existing tests are untouched.

### Who wrote what

- **Me (Raju):** created the GitHub repo, installed the app, decided to keep
  going after the push.
- **Claude:** the cost multiplier and its five tests, the README, the Methods
  pricing section, the git setup and the rebase.

### Next session

1. Engine sound — Web Audio driven by the rpm the engine already computes.
2. Then driving, then 3D.

---

## 2026-10-15 — Session 3: engine sound

### What we did

Added `/drive`, a rev-test page. Pick a car, press Start engine, and sweep a
slider from idle to redline while a synthesised engine note follows it. Live
readouts show power at that rpm (read from the real engine model via `hpAt`),
share of peak power, and the firing rate in Hz.

**How the synth works.** A four-stroke engine fires `cylinders / 2` times per
revolution, so the fundamental is `rpm/60 * cylinders/2`. Six harmonics of that
are stacked as detuned sawtooth oscillators and pushed through a low-pass
filter whose cutoff opens as revs rise - that filter sweep is most of what
makes an engine sound like it is working harder rather than just higher
pitched. Band-passed white noise on top gives air rush. Naturally aspirated
cars get a brighter harmonic mix than turbo cars, which are deliberately
muffled up top.

### What broke

Nothing in the code. Two process notes: browsers refuse to play audio until
the user clicks something, so the page needs an explicit "Start engine" button
rather than making noise on load. And a `pkill` in the same shell command as
the commit killed the shell before the commit ran - split them next time.

### How we checked it

Not just "it compiles". Drove it in a real browser with an analyser node
spliced into the audio graph and measured the output:

| rpm | predicted fundamental | measured dominant |
|---|---|---|
| 3,000 | 100 Hz | 108 Hz |
| 6,400 | 213 Hz | 215 Hz |

The pitch genuinely tracks the rev counter. Also confirmed the audio context
reaches `running`, stops cleanly, and that switching cars updates cylinder
count and redline.

### What I decided

- **Cylinder counts live in the sound module, not in the `Car` type.** The
  engine knows nothing about audio and should stay that way. The cost is that
  adding a car means editing two files; worth revisiting if that gets annoying.
- **The page says plainly it is not a recording.** It is a synthesiser making a
  plausible engine-ish noise, with no claim to sound like any real car. Same
  honesty rule as the performance figures: never let something synthesised look
  like something measured.
- **Sound never touches the physics.** The power figure is read from the model;
  the audio is downstream of everything and feeds back into nothing.

### Who wrote what

- **Me (Raju):** chose the slider-on-its-own-page design over a control
  embedded in the Garage.
- **Claude:** the synthesiser, the page, and the browser audio verification.

### Next session

1. Replay a real 0-60 run and hear the gear changes land - the simulation
   already knows rpm at every 5 ms step.
2. Then driving, then 3D.

