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
 * Given an array of instrument-type strings and optional ADSR settings,
 * returns an array of { trigger, gainNode }—one per row.
 * Voices are bit-crushed into a Tone.Gain and then to speakers.
 *
 * @param {string[]} instrumentTypes
 * @param {Array<{attack: number, decay: number, sustain: number, release: number}>} adsrSettings
 */
export function createVoices(instrumentTypes, adsrSettings = []) {
  const noiseEnv = { attack: 0.001, decay: 0.05, sustain: 0 };

  return instrumentTypes.map((type, row) => {
    const gainNode = new Tone.Gain(0.8).toDestination();
    const bitCrusher = new Tone.BitCrusher({ bits: 4 }).connect(gainNode);

    const env = adsrSettings[row] || { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 };

    let synth;

    switch (type) {
      case 'square':
        synth = new Tone.Synth({ oscillator: { type: 'square' }, envelope: env });
        break;
      case 'triangle':
        synth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: env });
        break;
      case 'sawtooth':
        synth = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: env });
        break;
      case 'pulse25':
      case 'pulse50':
      case 'pulse75': {
        const width = type === 'pulse25' ? 0.25 : type === 'pulse50' ? 0.5 : 0.75;
        synth = new Tone.Synth({ oscillator: { type: 'pulse', width }, envelope: env });
        break;
      }
      case 'fmsynth':
        synth = new Tone.FMSynth({ modulationIndex: 12, envelope: env });
        break;
      case 'amsynth':
        synth = new Tone.AMSynth({ harmonicity: 3, envelope: env });
        break;
      case 'metal':
        synth = new Tone.MetalSynth({ envelope: env });
        break;

      case 'pluck':
        synth = new Tone.PluckSynth({ attackNoise: 0.1, dampening: 4000, resonance: 0.8 });
        break;
      case 'duosynth':
        synth = new Tone.DuoSynth({
          voice0: { oscillator: { type: 'square' }, envelope: env },
          voice1: { oscillator: { type: 'sawtooth' }, envelope: env, detune: -10 }
        });
        break;
      case 'sampler':
        synth = new Tone.Sampler({
          urls: { C4: "8bit_C4.mp3", D4: "8bit_D4.mp3", E4: "8bit_E4.mp3" },
          onload: () => console.log("Sampler loaded")
        });
        break;

      case 'membrane':
        synth = new Tone.MembraneSynth({
          envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0 }
        });
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
          envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0 }
        });
        break;
      case 'drum-snare':
        synth = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: noiseEnv });
        break;
      case 'drum-tom':
        synth = new Tone.MembraneSynth({
          pitchDecay: 0.02,
          envelope: { attack: 0.005, decay: 0.3, sustain: 0, release: 0 }
        });
        break;
      case 'drum-hat':
        synth = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: noiseEnv });
        break;

      default:
        synth = new Tone.Synth({ oscillator: { type: 'square' }, envelope: env });
    }

    synth.connect(bitCrusher);

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
