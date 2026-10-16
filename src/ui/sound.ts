// ---------------------------------------------------------------------------
// Synthesised engine sound.
//
// IMPORTANT: this is a synthesiser, not a recording and not a simulation. It
// makes a plausible engine-ish noise from the car's rpm and cylinder count. It
// does NOT claim to sound like any real car, and nothing here feeds back into
// the physics engine. Sound is presentation only.
//
// How it works: a four-stroke engine fires (cylinders / 2) times per
// revolution, so the fundamental frequency is rpm/60 * cylinders/2. Stacking
// harmonics of that fundamental and pushing them through a low-pass filter
// gives the basic character. Adding filtered noise gives the air rush.
// ---------------------------------------------------------------------------

/**
 * Cylinder counts live here rather than in the Car type, because they are
 * needed only for sound and the engine deliberately knows nothing about audio.
 * If a car is missing, we fall back to four cylinders.
 */
const CYLINDERS: Record<string, number> = {
  pulse: 4,
  "civic-type-r-fl5": 4,
  "gtr-r35": 6,
  "gt3rs-992": 6,
};

export function cylindersFor(carId: string): number {
  return CYLINDERS[carId] ?? 4;
}

/** Relative loudness of each harmonic, 1st upward. */
const HARMONICS = {
  // A turbo engine is muffled: strong low orders, quieter top end.
  turbo: [1.0, 0.65, 0.4, 0.22, 0.12, 0.06],
  // A naturally aspirated engine is brighter and harder-edged up top.
  na: [1.0, 0.8, 0.62, 0.5, 0.38, 0.28],
};

export type EngineType = "turbo" | "na";

export class EngineSound {
  private ctx: AudioContext;
  private master: GainNode;
  private lowpass: BiquadFilterNode;
  private oscillators: { osc: OscillatorNode; gain: GainNode; order: number }[] = [];
  private noiseGain: GainNode;
  private noiseSource: AudioBufferSourceNode;
  private cylinders: number;
  private engineType: EngineType;
  private idleRpm: number;
  private redlineRpm: number;
  private running = false;
  /** 0 = off throttle (gearbox between gears), 1 = full. */
  private throttle = 1;

  constructor(opts: {
    cylinders: number;
    engineType: EngineType;
    idleRpm: number;
    redlineRpm: number;
  }) {
    this.cylinders = opts.cylinders;
    this.engineType = opts.engineType;
    this.idleRpm = opts.idleRpm;
    this.redlineRpm = opts.redlineRpm;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new Ctor();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    // One shared low-pass: opening it as revs rise is most of what makes an
    // engine sound like it is working harder rather than just higher-pitched.
    this.lowpass = this.ctx.createBiquadFilter();
    this.lowpass.type = "lowpass";
    this.lowpass.frequency.value = 800;
    this.lowpass.Q.value = 0.8;
    this.lowpass.connect(this.master);

    const weights = HARMONICS[this.engineType];
    weights.forEach((weight, i) => {
      const order = i + 1;
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      // A touch of detune per harmonic stops it sounding like one synth note.
      osc.detune.value = (i % 2 === 0 ? 1 : -1) * (3 + i * 2);
      const gain = this.ctx.createGain();
      gain.gain.value = weight * 0.11;
      osc.connect(gain).connect(this.lowpass);
      this.oscillators.push({ osc, gain, order });
    });

    // Air rush: white noise through a band-pass that opens up with revs.
    const seconds = 2;
    const buffer = this.ctx.createBuffer(
      1,
      this.ctx.sampleRate * seconds,
      this.ctx.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 1400;
    noiseFilter.Q.value = 0.7;
    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0;
    this.noiseSource.connect(noiseFilter).connect(this.noiseGain);
    this.noiseGain.connect(this.master);
  }

  /** Browsers require a user gesture before audio starts. */
  async start(rpm: number) {
    if (this.running) return;
    await this.ctx.resume();
    for (const { osc } of this.oscillators) osc.start();
    this.noiseSource.start();
    this.running = true;
    this.setRpm(rpm);
    this.master.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.08);
  }

  /**
   * Off-throttle the engine goes quiet and dull rather than silent, which is
   * what makes a gear change audible as a cut rather than a dropout.
   */
  setThrottle(value: number) {
    this.throttle = Math.min(1, Math.max(0, value));
  }

  setRpm(rpm: number) {
    if (!this.running) return;
    const now = this.ctx.currentTime;
    const smoothing = 0.03; // seconds; keeps slider moves from clicking

    // Four-stroke: each cylinder fires once every two revolutions.
    const fundamental = (rpm / 60) * (this.cylinders / 2);

    for (const { osc, order } of this.oscillators) {
      const f = Math.min(fundamental * order, this.ctx.sampleRate / 2 - 100);
      osc.frequency.setTargetAtTime(f, now, smoothing);
    }

    // Load fraction: how far up the rev range we are, 0 at idle, 1 at redline.
    const load = Math.min(
      1,
      Math.max(0, (rpm - this.idleRpm) / (this.redlineRpm - this.idleRpm)),
    );

    // Open the filter as revs rise so the sound gets harder, not just higher.
    const openness = 0.35 + 0.65 * this.throttle;
    const cutoff = (450 + load * load * 5200 + fundamental * 2.5) * openness;
    this.lowpass.frequency.setTargetAtTime(cutoff, now, smoothing);

    this.noiseGain.gain.setTargetAtTime(
      (0.012 + load * 0.055) * this.throttle,
      now,
      smoothing,
    );
    this.master.gain.setTargetAtTime(
      (0.32 + load * 0.3) * (0.45 + 0.55 * this.throttle),
      now,
      smoothing,
    );
  }

  /**
   * Point the running synth at a different car. Used when the driven car or
   * its build changes mid-session, so the note follows without a gap.
   */
  retune(opts: { cylinders: number; engineType: EngineType; idleRpm: number; redlineRpm: number }) {
    this.cylinders = opts.cylinders;
    this.idleRpm = opts.idleRpm;
    this.redlineRpm = opts.redlineRpm;
    if (opts.engineType !== this.engineType) {
      this.engineType = opts.engineType;
      const weights = HARMONICS[this.engineType];
      this.oscillators.forEach(({ gain }, i) => {
        gain.gain.setTargetAtTime(weights[i] * 0.11, this.ctx.currentTime, 0.05);
      });
    }
  }

  async stop() {
    if (!this.running) {
      await this.ctx.close();
      return;
    }
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    // Let the fade finish before tearing the graph down.
    await new Promise((r) => setTimeout(r, 200));
    for (const { osc } of this.oscillators) {
      try {
        osc.stop();
      } catch {
        // already stopped
      }
    }
    try {
      this.noiseSource.stop();
    } catch {
      // already stopped
    }
    this.running = false;
    await this.ctx.close();
  }
}
