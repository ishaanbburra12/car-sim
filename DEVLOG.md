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

