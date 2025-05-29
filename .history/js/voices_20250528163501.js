// js/voices.js

/**
 * Given an array of instrument‐type strings, returns
 * an array of { trigger, gainNode }—one per row.
 * Each voice accepts (time, note, duration) so stretched notes
 * (duration > '16n') will play correctly.
 */
export function createVoices(instrumentTypes) {
  const env = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 };

  return instrumentTypes.map(type => {
    let synth;
    // per-row gain node
    const gainNode = new Tone.Gain(0.8).toDestination();
    // 4-bit crusher for that authentic 8-bit grit
    const bitCrusher = new Tone.BitCrusher({ bits: 4 });

    // pick the right synth
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
      case 'membrane':
        synth = new Tone.MembraneSynth({
          envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 1 }
        });
        break;
      case 'noise-white':
        synth = new Tone.NoiseSynth({
          noise:    { type: 'white' },
          envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
        });
        break;
      case 'noise-pink':
        synth = new Tone.NoiseSynth({
          noise:    { type: 'pink' },
          envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
        });
        break;

      // Pure-synth drums—no external samples needed
      case 'drum-kick':
        synth = new Tone.MembraneSynth({
          pitchDecay: 0.05,
          envelope:    { attack: 0.001, decay: 0.3, sustain: 0, release: 1 }
        });
        break;
      case 'drum-snare':
        synth = new Tone.NoiseSynth({
          noise:    { type: 'white' },
          envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
        });
        break;
      case 'drum-tom':
        synth = new Tone.MembraneSynth({
          pitchDecay: 0.02,
          envelope:    { attack: 0.005, decay: 0.3, sustain: 0, release: 1 }
        });
        break;
      case 'drum-hat':
        synth = new Tone.NoiseSynth({
          noise:    { type: 'pink' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0 }
        });
        break;

      default:
        // fallback to a basic square synth
        synth = new Tone.Synth({ oscillator: { type: 'square' }, envelope: env });
    }

    // chain through crusher into gain
    synth.chain(bitCrusher, gainNode);

    // trigger function: honors duration parameter
    const trigger = (time, note, duration = '16n') => {
      switch (type) {
        case 'drum-kick':
          synth.triggerAttackRelease('C2', duration || '8n', time);
          break;
        case 'drum-snare':
          synth.triggerAttackRelease(duration || '16n', time);
          break;
        case 'drum-tom':
          synth.triggerAttackRelease('C3', duration || '8n', time);
          break;
        case 'drum-hat':
          synth.triggerAttackRelease(duration || '16n', time);
          break;
        default:
          // noise synths ignore pitch, duration first
          if (synth instanceof Tone.NoiseSynth) {
            synth.triggerAttackRelease(duration, time);
          } else {
            synth.triggerAttackRelease(note, duration, time);
          }
      }
    };

    return { trigger, gainNode };
  });
}
