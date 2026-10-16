# The five-person test

A protocol for finding out whether drive mode's labelling actually works, or
whether people read a simulated speedometer as a measurement.

**Status: not yet run.** This file is the method and a blank results section.
Nothing in it is filled in. If you are reading this looking for findings and
the results section is still empty, the test has not happened.

---

## What is being tested

The project's central claim is:

> The readout is exact. The claim is uncertain. The speedometer shows the
> simulation's own state, which is exact within the model. What is uncertain
> is how closely the model matches a real car.

Drive mode tries to convey that with a permanent **SIM · typical parts** badge
inside the gauge cluster, the unit **"sim mph"** rather than "mph", two ghost
needles showing the spread, and a run card that puts every claim in a range.

**The hypothesis:** after driving, a person will not believe they have been
shown what the car really does.

**The failure condition:** they treat the speedometer as a measurement. If
that happens, the labels and ghosts are not working and need redesigning, no
matter how carefully they were argued for.

This test can only fail usefully. A pass tells you the labels survived five
people; it does not prove they are good.

---

## Who to ask

Five people. Aim for a mix:

- at least two who know cars well
- at least two who do not
- nobody who has watched you build this

**Do not use anyone who already knows what the project is about.** A person
who has heard you talk about honesty in estimates cannot give you a clean
answer, and you only get one first impression per person.

---

## The rules

1. **Do not say the word "simulation" before the questions.** Not once. Not in
   the invitation, not while they drive.
2. **Do not explain the badge, the ghosts, the ranges, or anything else.** If
   they ask what something means, say "whatever you think it means" and move
   on.
3. **The badge stays on screen.** It is the thing being tested. Hiding it or
   pointing at it both ruin the test.
4. **Do not react to answers.** No "exactly", no "well, actually". Write it
   down and go to the next question.
5. **Write what they said, not what you think they meant.** Quotes beat
   summaries.

---

## The script

Say exactly this, or close to it:

> "I built a car thing. Can you try driving it for a minute? Hold W to go, S
> to brake."

Let them drive for about a minute. Say nothing else. If they stop early, that
is fine.

Then ask these **in order**, and write the answers down before asking the
next one:

**Q1.** "What did that just tell you?"
*(Open. Do not narrow it. This is the one that catches the whole problem.)*

**Q2.** "How fast would this car actually go, in real life?"

**Q3.** "How sure are you about that? Give me a number out of ten."

**Q4.** "Where did the numbers you saw come from?"

**Q5.** "Was there anything on screen telling you how much to trust it?"
*(Only ask this last. Asking it earlier teaches them the answer.)*

---

## How to score it

For each person, mark one:

| Mark | Meaning |
|---|---|
| **Measurement** | They talked about the car's real performance as if shown it. "It does 86." |
| **Mixed** | They hedged without being able to say why. "I guess around 86? Maybe." |
| **Simulation** | They distinguished the sim from reality unprompted, at Q1 or Q2. |

Also note, separately:

- Did they mention the **badge**, the **"sim mph"** unit, or the **ghost
  needles** at any point before Q5?
- At Q5, did they find anything, and how long did it take?
- Did anyone read the **ghost gap** as something other than uncertainty?

**The bar:** at least four of five mark **Simulation** or **Mixed**, and at
least two notice something unprompted before Q5.

Two or more **Measurement** marks means the labelling has failed and needs
redesigning before anything else gets built.

---

## If it fails

Likely fixes, roughly in order of how much they cost:

1. The badge is too small or too far from the number. Move it onto the gauge
   face, under the digits.
2. "sim mph" is being read as a brand of mph. Try "simulated" spelled out.
3. The ghost needles read as decoration. Try labelling them on the dial, or
   animating the gap.
4. The run card arrives too late to shape the impression. Show the model range
   during the drive, not only after.

Change **one** thing, then test on five new people. Changing several at once
tells you nothing about which one worked.

---

## Results

**Run on:** _(date)_
**Build tested:** _(git commit)_

| # | Knows cars | Q1 verdict | Noticed unprompted | Found it at Q5 | Notes / quotes |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |

**Tally:** _ Measurement · _ Mixed · _ Simulation

**Did it pass?** _(yes / no, against the bar above)_

**What I changed as a result:**

**What I would test next:**

---

## Reporting it honestly

Whatever happens goes in `DEVLOG.md`, including a failure. A test that only
gets written up when it passes is not a test, it is advertising. If three
people read the speedo as a measurement, that is the single most valuable
thing this project has learned, and it belongs in the README next to the
accuracy number.
