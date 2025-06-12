// js/voices.js

/**
 * All possible instruments
 */
export const INSTRUMENT_OPTIONS = [
  'square','triangle','sawtooth','pulse25','pulse50','pulse75',
  'fmsynth','amsynth','metal',
  'membrane','noise-white','noise-pink',
  'drum-kick','drum-snare','drum-tom','drum-hat',
  'pluck','duosynth','sampler'
];

/**
 * Given an array of instrument-type strings, returns
 * an array of { trigger, gainNode }—one per row.
 * Voices are bit-crushed into a Tone.Gain and then to speakers.
 *
 * @param {string[]} instrumentTypes
 */
export function createVoices(instrumentTypes) {
  const synthEnv = { attack: 0.001, decay: 0.05, sustain: 0.8, release: 0 };
  const noiseEnv = { attack: 0.001, decay: 0.05, sustain: 0 };

  return instrumentTypes.map(type => {
    // a Gain node (0.0–1.0) which routes to destination
    const gainNode = new Tone.Gain(0.8).toDestination();

    // bit-crusher → gain
    const bitCrusher = new Tone.BitCrusher({ bits: 4 }).connect(gainNode);

    let synth;
    switch (type) {
      // melodic
      case 'square':
        synth = new Tone.Synth({ oscillator: { type: 'square' }, envelope: synthEnv });
        break;
      case 'triangle':
        synth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: synthEnv });
        break;
      case 'sawtooth':
        synth = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: synthEnv });
        break;
      case 'pulse25':
      case 'pulse50':
      case 'pulse75': {
        const width = type === 'pulse25' ? 0.25 : type === 'pulse50' ? 0.5 : 0.75;
        synth = new Tone.Synth({ oscillator: { type: 'pulse', width }, envelope: synthEnv });
        break;
      }
      case 'fmsynth':
        synth = new Tone.FMSynth({ modulationIndex: 12, envelope: synthEnv });
        break;
      case 'amsynth':
        synth = new Tone.AMSynth({ harmonicity: 3, envelope: synthEnv });
        break;
      case 'metal':
        synth = new Tone.MetalSynth({ envelope: synthEnv });
        break;

      // new voices
      case 'pluck':
        synth = new Tone.PluckSynth({ attackNoise: 0.1, dampening: 4000, resonance: 0.8 });
        break;
      case 'duosynth':
        synth = new Tone.DuoSynth({
          voice0: { oscillator: { type: 'square' }, envelope: synthEnv },
          voice1: { oscillator: { type: 'sawtooth' }, envelope: synthEnv, detune: -10 }
        });
        break;
      case 'sampler':
        synth = new Tone.Sampler({
          urls: { C4: "8bit_C4.mp3", D4: "8bit_D4.mp3", E4: "8bit_E4.mp3" },
          onload: () => console.log("Sampler loaded")
        });
        break;

      // percussion / noise
      case 'membrane':
        synth = new Tone.MembraneSynth({ envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0 } });
        break;
      case 'noise-white':
        synth = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: noiseEnv });
        break;
      case 'noise-pink':
        synth = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: noiseEnv });
        break;
      case 'drum-kick':
        synth = new Tone.MembraneSynth({
          pitchDecay: 0.05,
          envelope:   { attack: 0.001, decay: 0.3, sustain: 0, release: 0 }
        });
        break;
      case 'drum-snare':
        synth = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: noiseEnv });
        break;
      case 'drum-tom':
        synth = new Tone.MembraneSynth({
          pitchDecay: 0.02,
          envelope:   { attack: 0.005, decay: 0.3, sustain: 0, release: 0 }
        });
        break;
      case 'drum-hat':
        synth = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: noiseEnv });
        break;

      // fallback
      default:
        synth = new Tone.Synth({ oscillator: { type: 'square' }, envelope: synthEnv });
    }

    // chain synth → bitCrusher → gain → speakers
    synth.connect(bitCrusher);

    // trigger helper
    const trigger = (time, note, duration = '16n') => {
      if (synth instanceof Tone.NoiseSynth) {
        synth.triggerAttackRelease(duration, time);
      } else if (note && typeof note === 'string') {
        synth.triggerAttackRelease(note, duration, time);
      }
    };

    return { trigger, gainNode };
  });
}
