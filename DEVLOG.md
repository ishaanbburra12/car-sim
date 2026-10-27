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

---

## 2026-10-15 — Session 4: hear the launch

### What we did

The rev test can now **replay a real standing start**. Press Play launch and
the simulated run is played back in real time, feeding its rpm to the
synthesiser, so the gear changes land exactly where the physics put them.
Live readouts show time, speed, current gear (a dash while mid-shift) and the
number of gear changes, with a strip showing where each shift falls between
launch and the quarter mile.

**New in the engine:** `traceRun()`, which runs the same simulation as the
stats but records a sample every 20 ms. It is additive - nothing that already
worked changed, and a test asserts that tracing produces the identical 0-60
and quarter-mile times as the untraced run.

**New in the synth:** `setThrottle()`. Off-throttle the engine goes quiet and
dull rather than silent, which is what makes a gear change sound like a cut
instead of a dropout.

Tests 70 -> 81.

### What broke

**A test said speed should only ever increase on a standing start. It failed,
and the engine was right again.** Mid-shift there is no drive, so drag and
rolling resistance genuinely slow the car slightly. Replaced it with three
tests: speed rises while driving, the car *does* dip during a shift, and the
dip is never more than 2 mph. That dip is audible in the replay.

### Something that looked like a bug and was not

During the first ~1.2 seconds the engine note is flat, pinned at the launch
rpm, while the car accelerates from 0 to about 25 mph. That looked wrong until
we checked the trace: it is the `max(wheelRpm, launchRpm)` clamp, which models
the clutch slipping. A real launch does exactly this - the engine holds near
constant while the clutch slips, then rpm follows the wheels once the
drivetrain locks up. Correct, and it sounds right.

### How we checked it

Drove the GT-R replay in a real browser with an analyser node in the audio
graph, sampling the readouts and the dominant frequency together:

```
1.62s  36mph gear 1   audio rising
1.86s  39mph gear —   (mid-shift)
3.70s  67mph gear 2   334 Hz
4.14s  71mph gear 3   248 Hz   <- revs drop into the next gear
```

That frequency drop at the gear change is the whole feature working.

### What I decided

- **`traceRun` is additive, not a rewrite.** The recording reads the
  simulation loop's state and changes nothing about it, and a test pins that
  the traced and untraced runs agree exactly.
- **The replay is stock-only.** Builds belong in the Garage; mixing the two
  would make it unclear which car you are hearing.

### Who wrote what

- **Me (Raju):** asked for the launch replay.
- **Claude:** `traceRun`, the throttle control, the replay panel, 11 new tests,
  and the browser verification.

### Next session

1. Driving: a real-time loop reusing the same per-step maths, keyboard
   controlled.
2. Then 3D, if it still seems worth it.

---

## 2026-10-16 — Session 5: designing driving mode, and the step function underneath it

### What we did

**Ran a design panel before writing any driving code.** Eleven agents: three
read the engine, data model and UI in parallel; four produced independent
designs (MVP-first, physics-first, honesty-first, architecture-first); three
judged all four on separate lenses (fit with our rules, honesty, buildability);
one synthesised a staged plan. Scores out of 30: architecture 24, MVP 21,
honesty 21, physics 15.

**Decided the honesty architecture for a live UI** (my design, sharpened by the
panel). The key move: the readout is exact, the claim is uncertain. The
simulation's state is exact within the model; what is uncertain is how well the
model matches a real car. So the live HUD is permanently badged as a
simulation, uncertainty is shown as something visible rather than a number
(ghost cars and multiple needles), and ranges go on the results screen where
claims about real cars are actually made.

**Added the expected (midpoint) scenario** so a driver drives a typical build,
with pessimistic and optimistic as the two ghost bounds.

**Extracted stepDrive() from simulate().** One pure timestep:
`stepDrive(spec, gearTotal, state, inputs, opts) -> StepOutput`. No clock, no
React, no audio. simulate() is now just a driver that holds the throttle flat
and steps it, so there is exactly one copy of the physics in the project.
Throttle and brake are now driver inputs rather than assumptions.

Tests 87 -> 101.

### What broke, and what I checked

**The panel told me one of our own numbers was wrong. I checked, and it was not.**
It found that simulate() applies the launch-rpm clamp in EVERY gear, not just
from a standstill, and recommended telling users our published 0-60 figures are
slightly optimistic as a result. The leak is real — I measured 0.40 s of it in
second gear on the Pulse, 0.42 s on the GT-R, 0.24 s on the GT3 RS, 0.00 s on
the Type R. But patching the clamp to first gear only changed 0-60, quarter
mile and top speed by less than one 5 ms timestep on all four cars. The reason:
at those speeds the engines are already past their torque peak, so pretending
the rpm is higher gives very slightly LESS torque, not more. The leak is real,
the optimism is not, and the plan's disclosure stage was dropped.

**My first run of that check "proved" no effect from a patch that had silently
failed to apply.** The string replace did not match and I nearly reported the
result. Caught it because identical-to-three-decimals was too clean. Every
patch-and-measure experiment now asserts the replacement actually happened.

**The design agents wrote scratch files into src/.** Four of them, while the
workflow ran. Nothing tracked was touched — I checked the diff — but briefing
agents to read a live working directory is not enough; next time they get a
worktree. One file was worth keeping and is in the scratchpad: a prototype
proving the extraction could be bit-identical.

### The guard that makes the refactor safe

The Pulse's numbers are pinned to ten decimal places, so "all tests still pass"
was not a strong enough check for moving the physics. `src/stepdrive.test.ts`
holds `legacyLoop()`: a verbatim copy of the pre-refactor loop, with its own
copies of the constants so the engine cannot quietly change what we compare
against. It runs both loops for all 24,000 steps of a 120-second run and
compares t, x, v, gear, shiftTimer and rpm with `Object.is` — bit identity, not
closeness. Across four cars, every part that fits each one, and all three
scenarios: identical.

Then I mutation-tested the guard, because a test that cannot fail is worthless.
Changing a drag constant from 0.5 to 0.5000000001 made it fail within 12 steps
and name the exact step, time and field. It works.

### What I decided

- **Three needles, not a band and not two.** Faint pessimistic and optimistic
  needles plus a primary needle at the expected car. The panel argued for
  deleting the needle entirely and making a filled band the reading; I wanted
  the instrument to still read like an instrument.
- **Engine braking goes in**, as a declared and bounded assumption. A 1500 kg
  car that coasts almost undiminished when you lift is itself a misleading
  simulation, just with the error unlabelled rather than absent.
- **Split stage 1.** The extraction lands on its own, invisible, with the
  guard. Driving arrives next, on a core that is already proven.
- **Real cars stay visible.** My earlier "used only for testing" line was about
  validation methodology, not about removing them from the app.
- **The out-of-sample check is the honest one.** Our ~2% agreement with
  published figures is in-sample: I tuned the Type R's traction fraction and
  the per-car shift times to get there. Until the model is tested on a car it
  was never fitted to, the model band says "assumed", not a borrowed number.

### Who wrote what

- **Me (Raju):** the honesty architecture for live UI — the exact/uncertain
  split, ghost cars, badge, and the five-person unprimed user test. Chose the
  midpoint scenario, three needles, engine braking, and the stage split.
- **Claude:** ran the design panel, checked its launch-clamp claim and found it
  did not hold, extracted stepDrive, wrote the bit-identity guard and
  mutation-tested it, plus the 14 new tests.

### Next session

1. Stage 2: the drivable panel — keyboard input, the rAF loop with an injected
   clock, three needles, the SIM badge.
2. Then sound on the driven car, idle and engine braking, the run card.

---

## 2026-10-16 — Session 6: the car moves

### What we did

**Drive mode works.** Fit some parts on /drive, press Take control, hold W. The
car accelerates through its gears in real time, S brakes it, R puts it back on
the line. Three cars run at once from the same inputs: the typical build you
drive, plus the pessimistic and optimistic builds as ghosts. The gap that opens
between them is the uncertainty in the parts data, shown as metres of road
rather than claimed as a number.

New files: `src/drive/tunables.ts` (the frozen numbers), `assumptions.ts` (the
prose ledger), `session.ts` (three cars, one set of inputs, pure), `loop.ts`
(the animation loop with its clock injected), plus `app/drive/DrivePanel.tsx`
and `Gauge.tsx`.

Tests 101 -> 141.

### The honesty mechanism, now enforced rather than promised

Every number drive mode invents lives in a frozen `DRIVE_TUNABLES` object, and
every one has an entry in `DRIVE_ASSUMPTIONS` that the Methods page renders.
A test asserts the two key sets match EXACTLY in both directions, so a tunable
cannot be added without being disclosed, and a disclosure cannot go stale after
a tunable is removed. The rule stopped being a habit and became a property.

The split keeps the engine clean: `tunables.ts` holds bare numbers and may be
imported by physics; `assumptions.ts` holds the prose and is imported only by
the Methods page.

### Three bugs the browser found that the tests did not

I drove the car in a real browser rather than trusting a green suite.

**1. The driven needle sat OUTSIDE its own band.** The tacho read 6,039 rpm with
a "range" of 4,000 to 5,548. Not a rendering glitch: the three cars shift at
different moments, so they can be in different gears, and rpm is then not a
range at all. Fixed by drawing the band across all three cars rather than
between two, so it always contains the needle, plus a note on the gauge when
the cars are in different gears.

**2. Then a test I wrote to pin that found something better.** I asserted speed
must be ordered — optimistic never slower than pessimistic. It failed. The
optimistic car reaches redline FIRST, and mid-shift it is not driving while the
pessimistic car still is, so for a few hundredths of a second the faster car is
the slower one. Correct physics. Distance stays ordered; speed does not. There
are now tests pinning both, including one asserting that speed only ever
inverts while a car is mid-shift.

**3. Tick labels read 1167, 2333, 3500, 4667** because the gauge divided its
maximum by six. The outermost one was also clipped by the viewBox. Both fixed.

Also fixed: distance was read off a ref during render, which happened to work
at 10 Hz but is not something React guarantees. It is part of the frame now.

### What I decided

- **Three needles**, not the panel's "delete the needle and let the band be the
  reading". I want the instrument to still read like an instrument.
- **The badge lives INSIDE the gauge cluster**, so a screenshot of the gauges
  cannot travel without it.
- **"sim mph", not "mph".** The unit itself says what the number is.
- **Tenths on the live timer**, hedging on the results screen, as agreed.
- **The readouts update 10 times a second while the physics runs 200 times.** A
  figure flickering through every intermediate value implies precision the
  model does not have.

### What is deliberately NOT in drive mode yet

No idle (the car sits at launch rpm), no engine braking (lifting off coasts on
drag alone), no sound on the driven car, and no post-run card. Those are the
next three stages. The stock-car case says plainly on screen that this view
cannot show uncertainty, rather than drawing two overlapping ghosts.

### Who wrote what

- **Me (Raju):** chose three needles, engine braking, and splitting the
  extraction from the drivable panel. The honesty architecture is mine from
  session 5.
- **Claude:** the session and loop, the gauges, the panel, the assumption
  ledger and its bijection test, 40 drive tests, and the browser runs that
  found the three bugs above.

### Next session

1. Sound on the car you are driving.
2. Idle, a real standstill, and engine braking.
3. The post-run card with the model band.

---

## 2026-10-16 — Session 7: the car you drive makes the noise

### What we did

Wired the engine synthesiser into drive mode. Hold W and the note climbs with
the revs; lift and it goes quiet and dull rather than silent; change gear and
you hear it. A checkbox turns sound off without ending the run, and taking
control now stops the rev-test slider's engine so the two can never play at
once.

Tests 145 -> 154.

### The bug I could only hear

Sound exposed something the numbers had hidden. **The engine note kept
flatlining at exactly 4,000 rpm after every gear change.**

It was the launch-rpm floor — the same one the design panel flagged in session
5 and I measured as harmless. It IS harmless to the numbers: patching it
changed 0-60 by less than one 5 ms step, because by then the engine is past its
torque peak. But the floor never stops applying, so the engine can never rev
BELOW launch rpm, and every early shift lands on exactly the same pitch. On a
chart, nothing. In your ears, broken.

So the finding from session 5 was right and my conclusion was incomplete: the
leak does not matter numerically and does matter audibly. Both halves are now
written down.

**The fix needed no new invented number.** `stepDrive` takes a launch policy.
"legacy" keeps the floor forever and stays the default, so the whole-run
simulation and the bit-identity guard are untouched. "clutch" releases the
floor the first time the drivetrain outruns it — which is just what a clutch
finishing its slip does — and drive mode uses that. Verified in the browser:
revs now fall 5,729 -> 3,792 at a shift and climb again, and the measured audio
frequency follows (3,792 rpm -> 129 Hz measured against 126 predicted).

### Four test assertions I had to walk back

Writing tests for the policy, I got the claim wrong four times, each time too
strong:

1. "legacy produces no rev drop" — false. Later shifts, where the car is
   already above the floor, drop in both policies.
2. "clutch produces more drops than legacy" — false. Same count; the
   difference is how FAR each drop falls.
3. "under legacy every shift lands on exactly launch rpm" — false. Only the
   early ones; by the second shift wheel rpm is already above the floor.
4. The one that survived: under legacy a drop can never land below launch rpm,
   under clutch it can, and the first shift under legacy lands exactly on the
   floor.

Each failure taught me something true about the model that I had asserted
without checking. Writing the assertion first and letting it fail is doing the
work, not failing at it.

### What I decided

- **Audio updates every frame; text updates ten times a second.** The loop
  grew a separate onTick hook for this. Updating an engine note at the display
  rate is audible as stepping, and slowing the text is an honesty measure
  before it is a performance one.
- **Coasting is not silence.** Off throttle the note drops to a floor rather
  than cutting out, because a real engine is still turning. Mid-shift it drops
  further still, which is what makes a gear change sound like a cut.
- **Taking control silences the rev test.** The page hands drive mode a
  callback rather than the two panels knowing about each other.

### Still not built

No idle (the car still sits at launch rpm at a standstill), no engine braking,
no post-run card. Those are next, and idle needs the four idleRpm values signed
off because they go on the Methods page in my name.

### Who wrote what

- **Me (Raju):** asked for sound next.
- **Claude:** the wiring, the launch policy, 9 new tests, and the browser runs
  that found the flatlining note and proved the fix.

---

## 2026-10-16 — Session 8: idle, a real standstill, and engine braking

### What we did

The car now behaves like a car at both ends of its speed range. It idles at a
plausible rpm instead of sitting at launch rpm. It brakes to a complete stop
and STAYS there. It pulls away again afterwards. And lifting off actually
slows it, instead of coasting on air resistance like it is on ice.

Tests 154 -> 167.

### The standstill problem the clutch policy created

Session 7's clutch policy released the launch rpm floor once the drivetrain
outran it, which fixed the flatlining engine note. But it created a quieter
bug: once released, the floor never came back, so a car that stopped had no
torque to pull away with. The fix is what a driver actually does — declutch as
you roll to a stop. The policy now re-arms the floor when wheel rpm falls below
idle, so the car is always ready to launch again.

The rev counter needed its own rule, separate from the torque floor: while the
clutch slips under power the engine sits at launch rpm; otherwise it follows
the wheels and never drops below idle, because an engine at rest is still
running.

### Engine braking, and how it is kept honest

Overrun torque is scaled from half its peak at idle to full at the limiter,
multiplied by how far the driver has lifted, and geared through the drivetrain.
It stops entirely during a gear change and at a standstill, because the clutch
is open at both.

Two mechanisms keep it from being a fudge factor:

- **It is off unless explicitly switched on.** `stepDrive` applies engine
  braking only when given a curve shape in its options. The whole-run
  simulation never passes one, so the Garage's figures are bit-identical
  without relying on "full throttle means the term is zero" as the only
  safeguard.
- **A test bounds the result.** Engine-only deceleration must land between
  0.01 g and 0.25 g for every car. Gentle enough not to be a brake pedal,
  strong enough to feel. The four assumed overrun figures cannot drift into
  nonsense without the suite catching it.

### Verified by driving it

Idles at 800 rpm. Accelerates to 46 mph. Coasts down to 41 with no brake
touched, which is engine braking doing its job. Brakes to zero, tacho returns
to 800, and the distance readout stays at 116 m across several seconds of
standing still. Then pulls away again to 32 mph. No console errors.

### A process mistake worth recording

I rebuilt the app while the production server was still running and then tested
against it. Every readout came back zero and the console filled with 400s. The
server was serving a half-replaced build, not a broken app. Rebuild, THEN
restart, then test. Also: `pkill -f "next-server"` matches its own command line
and kills the shell running it — `pkill -f "[n]ext-server"` does not.

### New assumed values, now on the Methods page

idleRpm: 800 Pulse, 800 Type R, 750 GT-R, 1000 GT3 RS.
engineBrakeTorqueNm: 50, 50, 95, 100, from roughly 25 Nm per litre.
overrunRpmScaleFloor: 0.5, disclosed through the drive ledger like every other
number drive mode invents.

### Who wrote what

- **Me (Raju):** approved the idle and overrun figures, having been told they
  go on the Methods page in my name.
- **Claude:** the clutch re-arm, the idle rpm rule, engine braking and its
  bound, 13 new tests, and the browser run that confirmed the car stops and
  stays stopped.

### Next

The post-run card: your driven 0-60 against the model's range, with the model
band shown separately from the parts band.

---

## 2026-10-16 — Session 9: the run card

### What we did

After a run, drive mode now reports what you actually achieved beside what the
model says the build should do. Three rows: 0-60 from the start of the run,
the quarter mile, and the fastest you reached. Each shows the driven figure,
the parts band marked "est.", and a second band widened by the assumed model
error. Tests 167 -> 179.

This is the last piece of the honesty architecture I set out in session 5. The
split is finally visible end to end: the live gauges show exact simulator state
badged as a simulation, and the claims about how a real car would behave live
here, as ranges, with the thing we do not know labelled as not known.

### Two bands, and why they are separate

The first band is how much the PARTS data varies — every part at its worst
against every part at its best. The second widens it by an assumed plus or
minus 10% for how wrong the MODEL might be, because tire grip, drag, driveline
losses and shift times are all numbers we chose.

**The 10% is a placeholder and the card says so.** This model agrees with
published figures for three real cars to about 2%, but it was tuned to do
that — the Type R's traction fraction and the per-car shift times were adjusted
until those cars lined up. Using an in-sample fit as an error bar would be
laundering a fitted result into a prediction. Earning a real number means
testing against a car the model was never fitted to. That refusal is in the
assumption ledger, on the Methods page, and on the card itself.

### The component that makes the rule structural

`DrivenVsModel` takes `modelLo` and `modelHi` as REQUIRED props. It is a type
error to render what you achieved without what the model says. A future
session cannot put a bare driven number on screen by forgetting the
convention; the compiler stops it.

### A framing bug the browser caught

The first version read "Fastest you went: 86 mph" under the heading "Modelled
for this build, launched perfectly — 152-160 mph". That phrase describes a
standing start, not a top speed run, so the row implied you had underperformed
when you had simply run out of road. Each row now carries its own description
of what the modelled figure means, and the top speed row adds a line saying
that falling well short just means you stopped accelerating.

### Worth noticing in the numbers

A flat-out driven run came out at 5.4 s against a modelled 4.8-5.4 s: right at
the slow edge. That is the pedal ramp doing exactly what it should — a key is a
switch, a throttle is not, and the quarter second it takes to reach full
throttle is time the model's perfect launch never spends. The card explains
this rather than leaving it as a mystery.

### Who wrote what

- **Me (Raju):** designed the two-band split and the rule that the model band
  must say "assumed" until the check is earned.
- **Claude:** the milestone tracking, the card, the required-props component,
  12 new tests, and the browser run that caught the top speed framing.

### Next

Nothing is required. The project is complete and defensible as it stands:
configure, estimate, hear, drive, and a Methods page that admits what it does
not know. Open options are the out-of-sample validation against a fourth real
car, the five-person unprimed user test, a manual gearbox, and 3D.

---

## 2026-10-16 — Session 10: an accuracy number we actually earned, and a test I cannot run

### The out-of-sample result: minus 4.6%

The three cars in the app were never evidence. The model was tuned to match
them — when they came out 14-15% slow to 60 in session 2, I changed the Civic's
traction fraction and every car's shift time until they lined up. Their ~2%
agreement measures nothing.

So the model was tested once on a car it had never seen: a 2019 Mazda MX-5,
picked for being as unlike the fitted three as a petrol manual car gets. Half
the GT-R's weight, a third of the GT3 RS's power, naturally aspirated, rear
drive, no aero, very short gearing.

**The protocol was fixed before the answer was known**, and this is the part
that makes it worth anything: published values entered as published, derived
values by the same formulas, and every assumed value — tire grip, brake limit,
driveline efficiency, rolling resistance, shift time, launch rpm, idle, overrun
torque — COPIED from the Civic Type R rather than chosen. There is a test
asserting that copying, so a later session cannot quietly tune the holdout. One
run, no adjustments.

**Model 5.43 s to 60. Published 5.70 s. Error minus 4.6%.**

That is now the only accuracy claim the project makes, and it is why the drive
mode's model band still says "assumed plus or minus 10%" rather than tightening
to 4.6%. One car is not a sample.

### The same test found a genuine failure

The model gives the MX-5 a 158 mph top speed. The real car does about 135.

Our figure is what the engine and the drag allow, and the real car is almost
certainly electronically limited below that — something the model knows nothing
about. I had already excluded top speed from the validation because no
well-sourced tested figure existed for it, so this is not a failed assertion;
it is an observation I could have quietly dropped and did not. It is on the
Methods page, in the README, and "speed limiters" is now in the list of things
the model ignores.

Worth noticing: the holdout flattered the model on the number I tested and
embarrassed it on the one I did not. That is roughly what an honest first
holdout looks like.

### The user test: built, not run

I cannot run this one. It needs five real people, and a five-person study with
invented participants would be worth less than no study at all.

`USER-TEST.md` is the method: who to recruit and who to exclude, the exact
unprimed script, the five questions in the order that stops each one teaching
the answer to the next, a three-way scoring scheme, a pass bar, the likely
fixes if it fails and the rule to change only one at a time, and a blank
results table.

Two things in it I want to hold myself to. The results section stays blank
until real people have sat down with it — anyone reading the file can tell at a
glance whether the test happened. And a failure gets written up in the DEVLOG
and the README next to the accuracy number, because a test that only gets
reported when it passes is advertising.

### Who wrote what

- **Me (Raju):** designed the five-person test in session 5 — the unprimed
  questions, the badge staying visible, the commitment to report failures.
  Chose to do the validation before anything else got built.
- **Claude:** picked the holdout and justified the choice, fixed the protocol
  in advance, ran it, reported minus 4.6% and the top speed failure, and wrote
  up the test kit.

### Next

Run the five-person test. Until it is run, nobody knows whether any of the
honesty work actually reaches a reader — which makes it the most valuable
unfinished thing in the project.

---

## 2026-10-16 — Session 11: the manual gearbox

### What we did

Cars with a real manual gearbox now hand you the gears. Q and E, or the arrow
keys, or on-screen buttons. The GT-R and the GT3 RS keep shifting themselves,
because that is what they actually do. Tests 184 -> 194.

`gearboxType` is the rare addition that SHRINKS the assumed bucket: it is
published for every car and was already sitting in the code comments, waiting
to be used instead of read.

### The design that made it easy

`DriverInputs` gained an optional `gear`. Omit it and the automatic chooser
runs exactly as before, which is why the bit-identity guard and all 184
existing tests passed on the first run. Supply it and the chooser does not run
at all. The gearbox never second-guesses the driver.

That meant the consequences of choosing badly needed no new code, because the
model already had them: a gear that would pass redline returns the -1 sentinel
and makes no power, and a gear that is too tall leaves the engine below its
torque. Both are now tested. Dropping to first at 50 mph does exactly what it
should, which is nothing at all.

### Verified by driving it

Holding first bounces the engine off the limiter at 6,505 rpm instead of
shifting itself. Upshifting drops the revs to 4,764. Selecting the Nissan
switches the readout to "Gear (auto)" and removes the shift buttons entirely.

### Who wrote what

- **Me (Raju):** asked for the manual gearbox.
- **Claude:** the gear input, the UI, and 10 tests including the money shift
  and the clamping of an out-of-range gear.

---

## 2026-10-16 — Session 12: a code review of everything, and fifteen real bugs

### What we did

Ran a proper review over every commit since the expected scenario landed, then
fixed all fifteen findings and wrote a test for each. Tests 194 -> 203.

Not one of them was a build break. The suite was green and the types were
clean the whole time, which is the point: these are the bugs tests do not
catch on their own.

### The four that mattered most

**The car braked 6% harder than its tires allow.** `brakeDecelMps2` returns
the deceleration the car can ACHIEVE — the smaller of what the tires hold and
what the brakes make — and drive mode turned that back into a force and then
subtracted drag, rolling resistance and engine braking on top of it. Measured
9.902 m/s² against a limit of 9.319. Braking, rolling resistance and engine
braking all reach the road through the same contact patches and are now capped
together. Aerodynamic drag is deliberately NOT capped with them, because it
pushes on the body rather than through the tires, so it genuinely adds.

**The run card ran the whole estimator ten times a second.** `estimate()`
executes four 24,000-step simulations, about 30 ms, and it was called
unmemoized on every render at the display rate — roughly a third of the main
thread, starving the frame budget the physics and the engine note both depend
on. Memoized on the build. Measured afterwards at a sustained 60 fps while
driving.

**Changing car mid-drive leaked a droning AudioContext.** React runs the
teardown effect first, which stops the loop and only SCHEDULES
`setDriving(false)`, so the sound effect still saw `driving === true` in that
render's closure, found a null ref, and built a synth nothing would ever stop.
One live context leaked per car change. It now keys off the live loop rather
than the state flag. Verified in the browser: contexts go 1, 0, 0 across two
car changes instead of accumulating.

**A NaN gear poisoned the entire simulation.** `Math.round(NaN)` is NaN,
clamping NaN is NaN, and `gearTotal[NaN]` turned v, x and rpm to NaN about
fifty steps later, with nothing visible until then. The existing
"out-of-range gear is clamped" test only tried -5, 99 and 1.7 for one step.

### The one that was a broken promise

Three invented numbers — the shift-cut throttle, the coasting floor, and an
idle speed — were defined as constants inside `DrivePanel.tsx`, where the
assumption ledger could not see them. The README says a test fails the build
if any invented number is undisclosed. That guarantee was simply false for the
feature it was built for.

Worse, the hardcoded 800 rpm idle was added in the same session as `Car.idleRpm`,
which exists precisely so that number would stop being guessed. The GT3 RS
idles at 1000 in the physics and the synth was told 800.

Both now come from the ledger and from the car. The fix was to make the claim
true, not to soften the claim.

### Smaller but real

Engine braking was gated on `launchArmed`, a flag only the clutch policy ever
clears, so supplying a curve shape under the legacy policy silently did
nothing. The redline zone was never drawn on three of the four cars, because
the dial rounded up to exactly the redline and the arc only renders when the
redline is below the maximum. `resetSession` dropped a custom parts catalogue
and could rebuild a different car. The audio mute worked in one direction only,
so starting the rev test while driving gave two engine notes at once. Plus a
duplicated fitment filter, a dead `retune()` method, two expressions computing
elapsed time separately, and a gauge whose spoken description recomputed the
band instead of reusing the one it drew.

### What I take from it

Every one of these shipped with a green suite and passing types. Several
shipped in sessions where I had driven the feature in a browser and watched it
work. Tests catch what you thought to ask; a review catches what you did not
think to ask at all.

The two worth remembering: a helper whose NAME says "deceleration" being used
as one more additive force, and a documented guarantee quietly becoming false
because the new numbers went somewhere the checker could not see.

### Who wrote what

- **Me (Raju):** asked for the project to be finished properly.
- **Claude:** ran the review, fixed all fifteen, wrote nine regression tests,
  and verified the braking cap, the leak, the redline zone, the reciprocal
  mute and the frame rate in a browser.

---

## 2026-10-17 — Session 13: 3D

### What we did

Drive mode has a 3D view: your car and the two ghosts on a road, with a chase
camera, a gradient sky, lane markings, roadside posts and a quarter-mile gate.
`three` is the first runtime dependency the project has taken beyond Next and
React, and I approved it for this.

Tests stay at 203. Nothing about the physics changed, so nothing about the
tests needed to.

### Why it earns its place

Claude pushed back before building it, and the pushback was fair: a car model
does not make a single number better, and 3D is the item on the list that adds
the least per hour.

What changed my mind is that it makes MY OWN design visible. In session 5 I
wrote that the driver should race two ghost cars and that the gap between them
on the track is the model's uncertainty. Until now that gap was a number on a
panel reading "19 m". On a road it is a thing you watch open up as you
accelerate. The honesty architecture stopped being a caption and became the
picture.

That is also why the Methods page now says plainly that the only thing in that
view carrying information is the distance between the three cars. The road,
the sky and the camera are scenery.

### Kept honest

The scene renders what the simulation already computed and feeds nothing back,
so the physics is byte-for-byte identical whether the view is on screen or
switched off. It does not start a clock of its own either: it subscribes to
the existing drive loop, so it cannot drift from the physics or double the
work. And it can be turned off, which is a checkbox, not an apology — the
numbers lose nothing.

### Checked properly

Three.js does not free GPU memory on its own, and this component mounts and
unmounts every time the car changes. Toggling the view eight times and then
changing car four times leaves exactly one canvas and produces no WebGL
warnings, so disposal is working. Browsers hard-cap live WebGL contexts, and
getting this wrong would have broken the page after a handful of car changes
rather than failing loudly.

Also: the first check appeared to show nothing rendering, because reading a
WebGL canvas with toDataURL returns a blank image unless preserveDrawingBuffer
is set. The screenshot showed the scene perfectly. Worth remembering before
trusting a canvas probe again.

### What I left out

I removed a resetView() helper I had added and never wired up. Last session's
review flagged a dead method for exactly this reason, and shipping another one
in the very next session would have been a poor response to it.

### Who wrote what

- **Me (Raju):** chose real 3D over a no-dependency fake, and approved three.
- **Claude:** argued against it first, then built the scene, the subscription
  that keeps it on the physics clock, and the leak check.

### Next

Still the five-person test. It has been the most valuable unfinished thing for
four sessions now, and nothing I build changes that.

---

## 2026-10-17 — Session 14: making the 3D look real

### What we did

The drive view went from boxes on a grey plane to something that reads as a
road: a physically-based sky with a real sun, image-based lighting so the paint
has something to reflect, cars with actual shape and glowing tail lights,
textured asphalt, painted markings, shoulders, guardrails, rolling terrain and
trees on the horizon. Still no new dependency beyond three, and still no asset
files — every texture and every piece of geometry is generated in code.

### The design was orchestrated, and half of it died

Seven agents: a study of the installed three package, four specialists (car,
lighting, world, motion), a performance judge and a synthesiser.

**Three of the seven failed** — the motion specialist, the judge and the
synthesiser all hit a session limit and returned nothing. So there was no
integrated plan. The car and lighting designs survived, and I did the judging
and integration myself, writing the road, scenery and camera work by hand
since those agents never reported.

Worth recording because it is the first time this project leaned on
orchestration and only got part of what it asked for. The partial results were
still worth having, which is the argument for structuring the work that way;
losing the judge is the argument for not depending on it.

### What the surviving agents found that I would not have

The lighting work verified its claims against the actual installed source
rather than recalling them, and two of those checks changed the design:

- `Sky.js` already ends with the tone-mapping and colour-space includes, so
  the horizon-tearing problem was caused by the OLD canvas-gradient background
  and is cured by deleting it, not by working around it.
- A `MeshStandardMaterial` with `envMap === null` has its `envMapIntensity`
  overwritten by `scene.environmentIntensity` every frame, so setting it by
  hand silently does nothing. That is why the reflection strength is applied
  through an explicit helper instead.

It also baked the environment map from the sky itself rather than from the
stock room preset, so the reflections match the world the car is standing in.

### Disposal, which is where Three.js punishes you

`scene.traverse()` finds objects, not resources: it cannot see textures
hanging off materials, `scene.environment`, `scene.background` or a light's
shadow map, and it visits shared geometry once per mesh. The old dispose() was
traverse-based. It is now a `Disposer` keyed on the resource itself. Verified:
eight view toggles plus four car changes still leave exactly one canvas and no
WebGL warnings.

### Performance, honestly

This container has no GPU. The measurement is SwiftShader, a pure CPU
rasteriser, so the numbers say almost nothing about real hardware — but they
do say something about the shape of the problem.

The richer scene dropped from 27 fps to 6 under software rendering. The visible
consequence is NOT stutter: the drive loop's catch-up clamp discards time it
cannot simulate, so the car simply covered less ground in the same real
seconds — 24 m instead of 34 m. A slow renderer makes the simulation run in
slow motion, by design.

So the scene now scales its own resolution: it keeps a rolling average of
frame time and drops the pixel ratio toward 55% when frames run long, raising
it again when they do not. That took software rendering from 6 fps to 9, and
the car from 24 m to 39 m of ground covered. On real hardware it should sit at
full resolution and never engage.

**I cannot verify the frame rate on a real GPU from here, and I have not
claimed one.** That needs checking on an actual machine.

### Who wrote what

- **Me (Raju):** asked for real 3D, like a game.
- **Claude:** ran the design workflow, judged and integrated it after half of
  it failed, wrote the road, scenery and camera feel, added adaptive
  resolution, and verified disposal.

---

## 2026-10-17 — Session 15: making the cars themselves look right

### What we did

Took a proper high-resolution "before" shot of the cars, read what was
actually wrong from it, and fixed three things. Tests stay at 203; no physics
touched.

### What the before shot showed

Looking at a screenshot rather than at the code is what found all three:

**The paint was muddy.** The hero's amber came out brown. The material had
`metalness: 0.55`, but car paint is a DIELECTRIC with a clear lacquer over it,
not a metal. At that metalness the environment was tinting the albedo itself.
Dropped to 0.08 and let the clearcoat provide the gloss; the amber went vivid.

**The ghosts did not look like the same car.** They read as long glowing
lozenges, not as translucent copies of the hero. The cause was an additive
back-side hull at 0.4 opacity drawn over the whole silhouette, plus strong
emissive and full sheen: three glow effects stacked on one object. The
geometry was always identical to the hero's — it was the material language
that destroyed the resemblance. That is a MEANING bug as much as a visual one:
the three cars are the same car with different parts, and the view exists to
let you compare them.

**The tail lights read as two pink stickers.** We look at the back of this car
essentially 100% of the time, so the rear is where detail actually pays. The
two lenses were joined by a stub bar too thin to see, and there was nothing
behind them, so they looked painted on. They are now one continuous full-width
bar set into a recessed dark bezel.

### One thing I got wrong while reading the picture

I first concluded the body was far too narrow, because a comment said the max
half-width was 0.634 m. That is the TUB — the floorpan between the wheels. The
SHOULDER is the actual outer skin at 0.934, so the car is 1.87 m wide, which
is correct for a coupe. I nearly "fixed" a proportion that was already right.
Read which part a number belongs to before acting on it.

The other thing that looked wrong and was not: the ghosts appear longer than
the hero. That is just perspective — the hero is dead astern and foreshortened
while the ghosts are offset far enough to show their flanks.

### Who wrote what

- **Me (Raju):** asked for a before shot first, which is what made the
  diagnosis possible.
- **Claude:** read the shot, found the metalness, hull-blending and tail-lamp
  problems, and iterated against screenshots rather than against the code.

---

## 2026-10-17 — Session 16: number plate, tyres, and a feature I removed

### What we did

Two more realism cues on the car, and one attempt that failed and got deleted.

**A number plate.** A dark recess in the tail panel with a pale plate set into
it. Nothing says "car" faster than a rectangle of white on the back, and
nothing says "untextured 3D model" faster than its absence. It costs no new
material: the plate rides in the headlamp material, which is already a pale
near-white, and that is close enough to retroreflective.

**Tyres that are visible.** The rubber was 0x0c0e11, which is all but pure
black. Under the car's own shadow the wheels vanished completely and the car
read as floating rather than standing on four of them. Real rubber in daylight
is a dark grey; 0x1b1d21 is enough to separate it from the shadow.

### The C-pillars: tried three times, then removed

A backlight with no pillars either side is the loudest "this is a model" cue
from the angle we actually view this car, so painted C-pillars should have
been the biggest single win available. Three attempts:

1. Mirrored one pillar with `scale(-1, 1, 1)`. Negative scaling REVERSES a
   geometry's winding order, so the mirrored copy rendered inside-out and
   appeared as a stray orange slash across the glass. Fixed by mirroring the
   sweep angle instead (theta -> PI - theta), which is the correct way to
   reflect a lofted section.
2. Symmetric, but too thick: the backlight became a narrow V and the roof
   looked pinched.
3. Narrower and further back: now they floated in the middle of the glass
   rather than framing it, because pulling the sweep inboard moves the pillar
   off the greenhouse shoulder.

Each attempt looked worse than no pillars at all, so they are gone and the
clean backlight is back. The code keeps a note saying why, and what a fourth
attempt should do differently: build the pillar from the greenhouse's OUTER
EDGE CURVE so it is anchored to the shoulder by construction, instead of from
a theta range that has to be guessed at.

Removing a feature after three attempts is not a failure to report quietly. It
is the correct outcome when every version is worse than the thing it replaces,
and shipping it because effort went into it would have been the actual
mistake.

### Who wrote what

- **Me (Raju):** asked to keep pushing until the cars look real.
- **Claude:** the plate and the tyre fix, three failed pillar attempts, and
  the decision to delete them rather than ship them.


---

## 2026-10-17 — Session 17: the pillars, on the fourth attempt

### What I asked for

Try the C-pillars again, using the outer-edge-curve idea the last session left
a note about, and carry on making the car look like a real one.

### A better way to look at the car

Everything below was found by looking at the car properly, and the first thing
built this session was the means to do that. The game renders the car about
150 pixels wide at chase distance, which is too small to tell a shading quirk
from a hole in the mesh. So: a standalone viewer that imports the *same*
`sceneCar.ts` and `sceneLighting.ts` the game uses, drops the car on a plain
ground plane, and screenshots it at 1520x1020 from any of ten camera angles,
with toggles to hide the glass, drop the self-shadowing, or go wireframe.

It is not part of the app and does not ship. It lives in the scratchpad with
the other verification scripts. It rebuilt in about a second, against roughly
a minute for a full Next build and restart, which is most of why this session
got further than the last one.

### The pillars

The note from last time was half right. "Anchor it to the greenhouse's outer
edge" was the correct instinct, but the first version of it still produced a
patch with a cut edge lying on the glass, and a cut edge on glass reads as a
crack. What actually works is to stop cutting at all:

> One continuous band per side, and both of its long edges are anchored to
> something real. The top edge is `ROOF_EDGE` — the very constant the roof
> skin starts from, so the pillar is the roof panel's own side edge carried
> fore and aft, and cannot drift off it. The bottom edge hugs the roof rail
> past the door and then swings down to `SAIL_KEEL`, which is inside the
> bodywork everywhere it reaches, so it dies in the quarter rather than
> stopping in mid-air.

That one band is now the A-pillar, the roof rail and the C-pillar. Nothing is
cut out of it, so there is no bare panel edge anywhere on the glass.

### Two bugs the eye could see but not explain

Both showed up as the same symptom: a ragged dark tear up the middle of each
C-pillar, like a lightning bolt. My first guess was shadow acne. Turning
self-shadowing off entirely did not change it, so that was wrong, and rather
than guess again I wrote a script that rebuilds *both* tessellations exactly
as `loft()` builds them and asks one question: is any vertex of the painted
panel inside the glass as actually drawn? It was. 49 of 1456 samples, up to
26 mm deep. Two separate causes:

1. **The band's lower edge turned too fast.** It swung up to 0.55 rad between
   two stations, and an edge is a polyline — a step that long cuts a chord
   straight across the greenhouse and dives under the glass. Capped near
   0.2 rad per station, where the chord sits about 4 mm inside the surface.

2. **`inflate` pushed the wrong way.** It offset along the radius from the
   section's centre. On the near-flat section at the tail, the radius and the
   actual surface normal are tens of degrees apart, so a 12 mm radial push
   bought barely 1 mm of real clearance. Ribbons now offset along a normal
   taken from a central difference of the section curve, which makes the
   offset mean what it says. This is a better primitive for the roof skin and
   the ducktail too.

Measured over 3276 samples of the finished panel: **0 mm swallowed**, down
from 26.3.

A third thing was wrong on principle even after the tear was gone: the glass
and the panels riding on it were lofted from *different* station lists, so
between two stations one followed a straight line in z and the other followed
the curve. They now share one ring list (`densify`), which removes the
disagreement at the source instead of leaving it small enough to get away with.

### The rest of the car

With the pillars right, things that had been hiding behind them became
obvious:

**The greenhouse stopped dead at both ends.** A flat pane of glass facing the
car behind, and another facing the road ahead. Both now keep falling until
they are under the decklid and under the bonnet, so each ends in a shutline.
This is most of what turned the back of the car into a fastback.

**The tail bezel was wider than the car.** 1.62 m of bezel across a tail face
that is 1.337 m at lamp height, so its corners hung in open air — that is why
the whole tail read as a slab bolted on. Narrowing it to exactly the lamp
width was *worse*, because then the lamp had no dark surround to sit in. 1.30
of bezel around 1.12 of lamp is right.

**The wheels were hubcaps.** The rim profile ran all the way back to the
centre, so the face was a closed dish with five little blocks raised on it —
no gaps, and the brake disc behind was never visible. A real alloy is mostly
hole. The face is open now and the spokes bridge hub to rim, so you see the
disc through it.

**The arch liners hung below the car.** A 189° liner put its ends at y 0.299
where the body's keel is around 0.49, so two dark flaps stuck out under the
sills. 112° keeps the part anyone can see into lined and tucks the ends away.

**Shutlines.** A car with no panel gaps reads as a bar of soap. Door cuts both
sides and a bonnet cut at the base of the windscreen. These are only 1.5 mm
proud, far less than the body's own tessellation error, and they still never
come out dashed — because a ribbon's vertices sit on the true surface while
the body is a polygon inscribed in it, so the strip is at worst flush and
never swallowed. Same geometry fact as bug 2 above, used deliberately.

### What I decided

Keep going on realism rather than stopping at the pillars. Three failed
attempts in the last session had made the pillars feel like a dead end, and
they were not — they were a measurement problem.

### What is still not done

- No tyre tread, no badge, no paint flake. All of those want textures, and
  this project has held a zero-binary-assets line since day one.
- The A-pillar still flares into a wedge where it buries at the cowl. It reads
  as a thick pillar rather than wrong, so I left it.
- Frame rate on a real GPU is still unmeasured. This container only has
  software rendering, so the 8 fps it reports means nothing either way.
- The five-person user test in `USER-TEST.md` still has not been run. It needs
  five real people and I cannot stand in for them.

### Who wrote what

- **Me (Raju):** asked for the fourth pillar attempt, using the outer-edge
  idea, and to keep going until the cars look like real life.
- **Claude:** the viewer harness, the pillar band, both tessellation bugs and
  the measurements that found them, the greenhouse ends, tail bezel, rims,
  arch liners and shutlines.

---

## 2026-10-17 — Session 18: make it look like real life

### What I asked for

"Make it look like real life." Ultracode on, so: use a workflow.

### The workflow, and what went wrong with it

Twelve critics, one per realism lens (proportions, surfacing, materials,
lighting, missing parts, wheels, lamps, procedural textures, glass, the
chase read, photo-versus-render, grounding), each reading the renders and the
source, then clustering, then two adversarial checks per surviving finding,
then a ranked build plan.

It did not go to plan twice:

1. **This container has 4 CPUs**, so the workflow runs at most 2 agents at
   once. Twelve critics each reading thirteen 1500x1000 PNGs would have taken
   hours. Killed it and rewrote it leaner: eight critics, each given only the
   3-4 renders its lens actually needs.
2. **Every agent then died on "You've hit your session limit."** All ten of
   them, in 27 seconds. Retried later and it ran, but slowly — by the time I
   stopped waiting, three of eight critics had reported.

So most of this session's work is mine, with two critics' findings folded in.
Both of those earned their keep, and one of them found a bug I would not have
found by looking.

### Measuring instead of squinting

The useful trick this session was writing a probe for each claim before
acting on it.

**Where can a part actually go?** A script that walks the body's own section
and reports the half-width available at any (y, z). Run against the tail it
said, immediately:

- the exhaust tips hung **26 mm outside the bodywork** at their height;
- the diffuser sat **entirely below the car** — the tail's keel is at y 0.335
  and the diffuser's top was 0.325, so there was a 10 mm gap of daylight above
  a part that is supposed to be let into the bumper;
- the lamp bezel ran **past the body's crown** at the top, into thin air.

All three were visible in a low render as "parts bolted on", but I could not
have said which parts or by how much. Everything on the tail face now fits
inside the section it is mounted to, checked at three heights per part.

**Do the wheels read at chase distance?** Sampling the chase render: tyres at
luminance 8-20 against a road at 40 and an under-car shadow at 24. The wheels
were not invisible, they were merging into one dark mass with the shadow. The
fix was not to brighten rubber but to show more rim: the sidewall was 108 mm
on a 235 mm section, a 46% profile — a family saloon. It is 32% now.

### What the critics found

**Two shadows, both the wrong shape.** buildCar already gave every rig a
ground plane and scene.ts added the atmosphere's blob on top, so each car sat
on two stacked haloes, 2.6 x 5.0 m and 3.2 x 5.8 m, against a car whose plan
is 1.87 x 4.33. Both radial, so both darkest dead centre under the cabin and
fading out at the wheels — the exact inverse of real ground occlusion, which
is near-black at the four contact patches. One shadow now, drawn to the car's
plan. Measured: road luminance a car's width to the side was pulled down 3.1
by the spill before, 0.3 after.

**The paint had half the reflection it asked for.** This is the one I would
not have found. sceneLighting.ts documents it at the top of its own applyTo():
with envMap === null the renderer overwrites envMapIntensity with the scene's
global value every frame, so setting it on a material does nothing. Its
integration note says to call applyTo on the car paint. Nothing ever did —
scene.ts called it only on the guard rail. Paint tuned to 1.35 and glass tuned
to 1.8 had both been silently running at 0.65 since the lighting went in. Car
paint and glass read as real almost entirely through what they reflect, so
this was most of why they looked like coloured plastic.

**No ambient occlusion anywhere**, so the flanks were a flat orange field with
no weight. Baked into vertex colours on the paint geometry.

### What I got wrong, and said so

A critic blamed the washed-out upper body on the probe's sun card being far
too wide. The card IS far too wide — 13.7 degrees against the sun's 0.53, 26
times over — so I tightened it. Then I measured, and it changed nothing:
roof saturation 0.440 to 0.440, haunch 0.497 to 0.500. The diagnosis was
wrong about the cause.

I then guessed the wash was my own restored reflection over-correcting, swept
paint envMapIntensity at 1.35 / 1.05 / 0.85, and that was wrong too — 1.35
measures the MOST saturated of the three. So the pale band is the specular
highlight itself, which is what a glossy car in sunlight does, and the value
stays where it is. The sun card change is kept because a 13.7 degree sun is
indefensible on its own terms, not because it fixed anything.

Two wrong guesses in a row is worth writing down. Both looked obvious and
both would have been shipped as "fixes" without a measurement.

### Also

- **carTextures.ts**, a new file: procedurally drawn maps, no binary assets.
  Orange peel in the clearcoat so the paint is not a perfect mirror, tread and
  sidewall relief on the tyres, a turned and cross-drilled brake disc face.
  Deterministic noise, not Math.random, so two screenshots of the same car are
  comparable.
- The tail lamp stopped clipping. 0xff2a16 at 2.4 blew the red channel out to
  a flat pink slab — the brightest thing on screen for the whole game.
- The tyre lathe went from 20 segments to 32; you could count its corners.
- A backing disc inboard of each tyre: opening the rim face let you see
  between the spokes and straight out the far side of the car.
- Removed addContactShadow from sceneLighting.ts rather than leaving it dead.

### Still not done

- Tread is a bump map, not a normal map, because LatheGeometry generates no
  tangents. It is fine at the distances the tyre is ever seen.
- The cabin behind the glass is empty. The glass is opaque enough to get away
  with it; making it transparent would show through the car.
- Frame rate on real hardware still unmeasured — this container is software
  rendering only.
- The five-person user test still needs five people.

### Addendum: the audit finished, and found two things I had missed

The workflow's critics all reported in the end. Two of their findings were
bugs, not opinions, and both were things I had looked straight at.

**Four of the eight tail parts were never drawn.** loft() flat-caps both ends
of a sweep, so the body carries a solid disc across its last station at
z = 2.16, and any tail part whose front face is behind that plane is simply
never rasterised. The number plate was 2 mm behind it, its recess 10 mm, the
exhaust surrounds 9 mm, the bore seals 100 mm.

I had the symptom in front of me twice and drew the wrong conclusion both
times. I noted "I can't see the number plate" in a render and assumed it was
small and dark. And the exhaust surround I added earlier the same day - the
dark cut-out whose whole job was to stop the tips reading as chrome washers
stuck on the paint - was itself invisible, so that fix had done nothing at
all. 0 of 8 hidden now, against 4 of 8.

**Squat and dive were rotating the wheels and the shadow.** scene.ts did
`cars.expected.group.rotation.x = pitch`, and the group holds the shell, the
four wheels and the ground shadow, so the whole car rotated about the road
rather than the body rotating on its springs. Measured at the 0.05 rad clamp
the code uses under power:

    pitch on the group: tyre contact heights  66.1  66.1  -66.9  -66.9 mm
    pitch on the body:  tyre contact heights   0.0   0.0    0.0    0.0 mm

Two front tyres hanging 66 mm in the air and two rear tyres 67 mm through the
tarmac, during hard acceleration, which is the only thing this game ever does.
CarRig now exposes `body` - the sprung mass - and the wheels and shadow stay
on `group`.

That one could not be screenshotted: the canvas will not render mid-launch
under this container's software rasteriser, so it was proved with a probe that
reads the tyres' world positions instead. Better evidence than a picture.

**And a scare that was not a bug.** Midway through, every browser check
started failing with the drive page blank and no buttons on it. It looked like
I had broken the app. The running server had simply survived SIGTERM, so port
3000 was still being served by a process built from older code, handing out
HTML that referenced a chunk hash no longer on disk. `lsof -ti tcp:3000 |
xargs kill` is not enough; it needs `-9`. Worth remembering, because for a few
minutes I was debugging code that was fine.

### Who wrote what

- **Me (Raju):** "make it look like real life", and told it to try again when
  the first workflow fell over.
- **Claude:** the workflow and its two rewrites, the measurement probes, the
  tail geometry, wheels, shadow, AO, textures, and the two wrong guesses above.

---

## 2026-10-27 — Session 19: a different product

### What I asked for

Stop trying to render cars. Turn this into a learning platform about real
cars: a search bar, a category dropdown next to it (sports, hypercars,
prototypes, normal cars), a page per car, and a page per brand that links to
all of that brand's cars and to its real site.

### Two things I settled before writing anything

**Where the numbers come from.** "Search for any car" is unbounded, and I
cannot produce an accurate database of every car ever made from memory. A
learning platform full of invented specifications would be worse than no
platform at all, because a reader has no way to tell a guessed 0-60 time from
a real one on a page that looks like a reference work. So: a hand-written
catalogue, every figure published by the manufacturer or measured by an
independent tester, each tagged with which, and `null` — printed as "Not
listed" — wherever a number could not be sourced. 50 cars and 26 brands to
start.

**Real brands.** The original brief for this project said no real brands at
all. That rule is now reversed by design, so it is worth writing down what
replaced it: names and factual specifications are used, and every brand links
out to its own site. No logos and no manufacturer photographs, anywhere —
those are the parts that carry actual legal weight, and leaving them out also
keeps the zero-binary-assets line the project has held since day one.

### What got built

    src/catalog/types.ts        the vocabulary, and the Figure/null rule
    src/catalog/brands.ts       26 manufacturers
    src/catalog/cars/*.ts       50 cars, four files by category
    src/catalog/index.ts        search and filtering, pure functions
    src/catalog/catalog.test.ts 24 tests

    app/page.tsx                landing page
    app/cars/                   browse, with search + category dropdown
    app/cars/[slug]/            a page per car        (50 prerendered)
    app/brands/                 brand index
    app/brands/[slug]/          a page per brand      (26 prerendered)

The data layer is kept out of the UI exactly as the physics engine is, and for
the same reason: the catalogue is the thing with the honesty guarantee on it,
and it should be testable without a browser.

### The tests are mostly about the data

A catalogue fails in dull ways a human will not catch by reading: a brand slug
typed wrong on the fortieth entry, two cars sharing a URL, a source list left
empty. So the suite checks the data, not just the code — unique slugs,
URL-safe slugs, every car pointing at a brand that exists, every car citing a
source, every brand having a real https link.

Two are worth naming:

- **No invented figures.** Every printed figure must carry a provenance tag
  and a positive finite value; `null` is always allowed. The type makes the
  field required so that omitting a number is a decision rather than an
  oversight.
- **Prototypes may not have road-car numbers.** Nobody publishes a 0-60 time
  for a Le Mans car, so if one ever appears in that category it was invented.
  The test asserts those fields stay null.

There is also a sanity band on each figure — power under 2,500 hp, weight
between 500 and 4,000 kg — which cannot check accuracy but does catch a
misplaced decimal point or a kW figure pasted into an hp field.

### The one bug the tests found

Searching "mx5" returned nothing, because normalising "MX-5" splits it into
two tokens and "mx5" is one. Real people type "mx5", "gt3rs", "f150" without
the separator. The matcher now also keeps a squashed copy of each name with
every separator removed, used for terms of three characters or more — shorter
than that it matches far too much to be useful.

Search also strips accents, so "huracan" finds the Huracán. Typing an accent
on a keyboard that lacks one is a real obstacle, and a search box that fails
there feels broken even when the data is fine.

### What I did not do

I did not delete the simulator. The brief said "massive change", not "throw
the old thing away", and the drive mode, the engine and its 203 tests are all
still there under /garage and /drive, reachable from the nav and from the
landing page. They are described as what they are: a model that outputs
estimates, kept deliberately separate from a catalogue that outputs facts.
Say the word and I will retire them properly.

### Still open

- 50 cars is a start, not a catalogue. Adding more is now a matter of writing
  records; the schema and the tests will catch most mistakes.
- Every brand has a site link but no car has a link to its own model page,
  because those URLs move and a dead link on a reference site is worse than
  no link.
- No images at all, by choice. If the site ever wants them, they have to be
  drawn rather than downloaded.

### Who wrote what

- **Me (Raju):** the pivot, and the shape of it — search bar, dropdown with
  those four categories, a page per car, a page per brand linking to its cars
  and its real site.
- **Claude:** the catalogue, the search, the pages and the tests, plus the two
  judgement calls above about sourcing and trademarks.
