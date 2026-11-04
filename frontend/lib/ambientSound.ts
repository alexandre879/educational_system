import { useSyncExternalStore } from "react";

/**
 * Background sounds for studying, synthesised with the Web Audio API (no audio files):
 * brown noise, "rain" (high-passed pink noise), white noise and "ocean waves" (brown noise
 * that swells and recedes). Also the chime played when a focus session ends.
 */

export type Ambience = "off" | "brown" | "rain" | "white" | "waves";

interface AmbienceState {
  kind: Ambience;
  volume: number;
}

const VOLUME_KEY = "ambienceVolume";

let context: AudioContext | null = null;
let master: GainNode | null = null;
let playing: AudioScheduledSourceNode[] = [];
let state: AmbienceState = { kind: "off", volume: 0.5 };
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const saved = Number(window.localStorage.getItem(VOLUME_KEY));
  if (saved > 0 && saved <= 1) state = { ...state, volume: saved };
}

function emit(patch: Partial<AmbienceState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function audio(): AudioContext {
  if (!context) context = new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

function noise(ctx: AudioContext, color: "white" | "pink" | "brown"): AudioBuffer {
  const seconds = 8;
  const buffer = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let last = 0;

    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      if (color === "white") {
        data[i] = white;
      } else if (color === "pink") {
        // Paul Kellet's refined pink-noise filter.
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    }
  }
  return buffer;
}

function stopNodes(fade: number) {
  const ctx = context;
  const nodes = playing;
  const gain = master;
  playing = [];
  master = null;
  if (!ctx || !gain) return;

  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setTargetAtTime(0, ctx.currentTime, fade / 4);
  setTimeout(() => {
    nodes.forEach((node) => {
      try {
        node.stop();
      } catch {
        // Already stopped.
      }
    });
    gain.disconnect();
  }, fade * 1000 + 50);
}

export function playAmbience(kind: Ambience) {
  load();
  stopNodes(0.6);
  emit({ kind });
  if (kind === "off") return;

  const ctx = audio();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  gain.gain.setTargetAtTime(state.volume, ctx.currentTime, 0.4);

  const source = ctx.createBufferSource();
  source.buffer = noise(ctx, kind === "rain" ? "pink" : kind === "white" ? "white" : "brown");
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  const nodes: AudioScheduledSourceNode[] = [source];

  if (kind === "rain") {
    filter.type = "highpass";
    filter.frequency.value = 450;
    source.connect(filter).connect(gain);
  } else if (kind === "white") {
    filter.type = "lowpass";
    filter.frequency.value = 7000;
    const soften = ctx.createGain();
    soften.gain.value = 0.35;
    source.connect(filter).connect(soften).connect(gain);
  } else if (kind === "waves") {
    filter.type = "lowpass";
    filter.frequency.value = 700;
    // A slow LFO swells the surf every ~11 seconds.
    const swell = ctx.createGain();
    swell.gain.value = 0.55;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const depth = ctx.createGain();
    depth.gain.value = 0.45;
    lfo.connect(depth).connect(swell.gain);
    lfo.start();
    nodes.push(lfo);
    source.connect(filter).connect(swell).connect(gain);
  } else {
    filter.type = "lowpass";
    filter.frequency.value = 1100;
    source.connect(filter).connect(gain);
  }

  source.start();
  playing = nodes;
  master = gain;
}

export function setAmbienceVolume(volume: number) {
  load();
  const value = Math.max(0.02, Math.min(1, volume));
  emit({ volume: value });
  try {
    window.localStorage.setItem(VOLUME_KEY, String(value));
  } catch {
    // Volume just won't be remembered.
  }
  if (context && master) master.gain.setTargetAtTime(value, context.currentTime, 0.08);
}

/** Three rising bell tones. */
export function playChime() {
  try {
    const ctx = audio();
    const start = ctx.currentTime + 0.05;
    [659.25, 987.77, 1318.51].forEach((frequency, index) => {
      const at = start + index * 0.18;
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(0.16, at + 0.02);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
      oscillator.connect(envelope).connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + 1.5);
    });
  } catch {
    // No audio available.
  }
}

/** Create (or resume) the audio context during a click, so later sounds are allowed to play. */
export function unlockAudio() {
  try {
    audio();
  } catch {
    // No audio available.
  }
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const serverSnapshot: AmbienceState = { kind: "off", volume: 0.5 };

export function useAmbience(): AmbienceState {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => serverSnapshot
  );
}
