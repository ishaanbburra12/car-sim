# Vantora Pulse — car configurator and performance estimator

A browser-based car configurator. Pick a car, bolt on parts, and watch
estimated performance update live: power, 0-60, quarter mile, top speed,
braking, cornering grip, mass and price.

**Every performance figure is a modelled estimate, not a measurement.** They
are shown as low-high ranges with "est." next to them, and the
[Methods page](app/methods/page.tsx) lists every assumption, every omission,
and how far the model lands from the real cars' published figures.

## What's in it

- **Four cars.** One fictional (the Vantora Pulse) and three real ones: a
  Porsche 911 GT3 RS (992), a Nissan GT-R (R35) and a Honda Civic Type R (FL5).
  They span naturally aspirated and turbo, FWD / RWD / AWD, and downforce
  versus none.
- **Ten parts** across seven categories, with rule-based fitment — a turbo kit
  will not fit a naturally aspirated engine, and the configurator explains why
  rather than silently hiding the option.
- **A physics engine** that simulates a standing start in 5 ms steps: gear
  selection, a power curve, traction limits, drag, rolling resistance and
  downforce. Braking is integrated separately because downforce fades as a car
  slows.
- **Drive mode.** Fit parts, take control, and drive the car in real time with
  the keyboard, with a synthesised engine note that follows the revs and cuts
  when you change gear. It idles, brakes to a standstill, pulls away again, and
  slows on engine braking when you lift off. After a run, a card reports what
  you achieved beside what the model says the build should do — as two separate
  bands, one for how much the parts data varies and one for how wrong the model
  itself might be. Cars with a real manual gearbox hand you the gears; the
  dual-clutch cars shift themselves. You drive the *typical* build while the pessimistic and
  optimistic builds run alongside from the same inputs — the gap between them
  on the road is the uncertainty in the parts data. Every gauge carries three
  needles and the cluster is permanently badged as a simulation.
- **A rev test page** with a synthesised engine note built from each car's
  cylinder count and rev range, and a **launch replay** that plays a simulated
  standing start back in real time so you can hear the gear changes land where
  the physics put them. It is a synthesiser, not a recording, and makes no
  claim to sound like any real car.
- **194 tests**, including checks that the three real cars land within 10% of
  their published 0-60 and top speed.

## How accurate is it?

The honest answer is **one measurement: &minus;4.6%**, on a car the model had
never seen.

The three cars below cannot tell you how good the model is, because the model
was tuned to match them &mdash; when they first came out 14&ndash;15% slow to
60, the Civic's traction fraction and every car's shift time were adjusted
until they lined up. So the model was tested once on a holdout, a 2019 Mazda
MX-5 chosen for being as unlike the fitted three as possible, with every
assumed value copied from an existing car *before* the result was seen and
nothing adjusted afterwards. It predicted 5.43 s to 60 mph against a tested
5.70 s.

That same test found a real failure: the model gives the MX-5 a 158 mph top
speed and the real car does about 135, because road cars are often
electronically limited and the model only knows the physical limit. Treat top
speed as the least trustworthy figure here.

### The three fitted cars (in-sample, so not evidence)

| Car | 0-60 model | published | Top speed model | published |
|---|---|---|---|---|
| Civic Type R | 5.02s | 5.0s | 172 | 171 |
| GT-R | 2.95s | 2.9s | 197 | 196 |
| 911 GT3 RS | 2.99s | 3.0s | 184 | 184 |

0-60 is compared using the one-foot rollout convention that published US
figures use. These agree closely because they were tuned to; see the holdout
result above for the number that actually means something.

One caveat stated up front, and repeated on the Methods page: **the GT3 RS top
speed match is circular.** Porsche publishes no drag coefficient for that car,
so one was derived from its published top speed. It matches because it was made
to. The other two use published drag coefficients and are honest checks.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000/garage  and  /drive
npm test        # 194 tests
npm run build
```

## How the code is laid out

```
src/types.ts      the vocabulary: Car, Part, Spec, Stats, Estimate
src/data.ts       the fictional Pulse and all ten parts
src/cars.ts       the three real cars, with sources cited per value
src/validation.ts the holdout car, used only to measure error, never shown
src/engine.ts     all the physics; knows nothing about React
src/ui/format.ts  display helpers; does no arithmetic of its own
src/drive/        the real-time driving core: fixed timestep, three cars,
                  injected clock, and the enforced assumption ledger
src/ui/sound.ts   engine-note synthesiser; no physics, no feedback
app/garage/       the configurator screen and its chart
app/drive/        the rev test: slider, synthesised engine note
app/methods/      the assumptions, in full
```

The engine is deliberately separate from the UI. The whole Garage screen runs
on one function call — `estimate(car, selectedPartIds)` — and renders whatever
comes back.

## Honesty rules this project follows

- Every modelled number is a range with "est.", never a bare figure.
- Car data values are tagged `[published]`, `[derived]` or `[assumed]` in the
  source. The assumed bucket is large: tire grip, brake limit, driveline
  efficiency and several others are required by the model and published by
  nobody.
- Every number drive mode invents is in a frozen tunables object with a
  matching plain-English entry that the Methods page renders, and a test fails
  the build if the two ever disagree in either direction.
- Validation tests use a loose 10% tolerance on purpose. Tuning the model until
  it matched three cars exactly would make it a lookup table, not a model.
- The real cars are named as factual references. This project is not affiliated
  with or endorsed by any manufacturer, and uses no logos, photos or brand
  colours.

## Does the honesty labelling actually work?

Unknown. [USER-TEST.md](USER-TEST.md) is a five-person protocol for finding
out whether people read the simulated speedometer as a measurement. It has not
been run yet, and the results section is deliberately blank until it is.

## Status

See [DEVLOG.md](DEVLOG.md) for the session-by-session log, including what
broke and why. Not built yet, deliberately: 3D, engine sound, and driving.
