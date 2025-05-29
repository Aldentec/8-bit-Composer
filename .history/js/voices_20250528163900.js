// js/voices.js

/**
 * Given an array of instrument‐type strings, returns
 * an array of { trigger, gainNode }—one per row.
 * Voices are bit-crushed and routed through a GainNode.
 * Melodic synths use a zero-release envelope so notes never overrun.
 */
export function createVoices(instrumentTypes) {
  // a short, snappy envelope: zero release for perfect cut-off
  const synthEnv = { attack: 0.001, decay: 0.05, sustain: 0.8, release: 0 };
  const noiseEnv = { attack: 0.001, decay: 0.05, sustain: 0 };

  return instrumentTypes.map(type => {
    let synth;
    const gainNode   = new Tone.Gain(0.8).toDestination();
    const bitCrusher = new Tone.BitCrusher({ bits: 4 });

    switch (type) {
      // ─── Melodic Synths ───
      case 'square':
        synth = new Tone.Synth({ oscillator: { type:'square' }, envelope: synthEnv });
        break;
      case 'triangle':
        synth = new Tone.Synth({ oscillator: { type:'triangle' }, envelope: synthEnv });
        break;
      case 'sawtooth':
        synth = new Tone.Synth({ oscillator: { type:'sawtooth' }, envelope: synthEnv });
        break;
      case 'pulse25':
      case 'pulse50':
      case 'pulse75': {
        const width = type==='pulse25'?0.25:type==='pulse50'?0.5:0.75;
        synth = new Tone.Synth({ oscillator: { type:'pulse', width }, envelope: synthEnv });
        break;
      }
      case 'fmsynth':
        synth = new Tone.FMSynth({ modulationIndex:12, envelope: synthEnv });
        break;
      case 'amsynth':
        synth = new Tone.AMSynth({ harmonicity:3, envelope: synthEnv });
        break;
      case 'metal':
        synth = new Tone.MetalSynth({ envelope: synthEnv });
        break;

      // ─── Drums & Noise ───
      case 'membrane':
        synth = new Tone.MembraneSynth({ envelope: { attack:0.001, decay:0.4, sustain:0, release:0 } });
        break;
      case 'noise-white':
        synth = new Tone.NoiseSynth({ noise:{ type:'white' }, envelope: noiseEnv });
        break;
      case 'noise-pink':
        synth = new Tone.NoiseSynth({ noise:{ type:'pink'  }, envelope: noiseEnv });
        break;
      case 'drum-kick':
        synth = new Tone.MembraneSynth({
          pitchDecay:0.05,
          envelope:   { attack:0.001, decay:0.3, sustain:0, release:0 }
        });
        break;
      case 'drum-snare':
        synth = new Tone.NoiseSynth({ noise:{ type:'white' }, envelope: noiseEnv });
        break;
      case 'drum-tom':
        synth = new Tone.MembraneSynth({
          pitchDecay:0.02,
          envelope:   { attack:0.005, decay:0.3, sustain:0, release:0 }
        });
        break;
      case 'drum-hat':
        synth = new Tone.NoiseSynth({ noise:{ type:'pink' }, envelope: noiseEnv });
        break;

      // ─── Fallback ───
      default:
        synth = new Tone.Synth({ oscillator:{ type:'square' }, envelope: synthEnv });
    }

    // connect: synth → crusher → gain → speakers
    synth.chain(bitCrusher, gainNode);

    // trigger must accept duration so stretched notes still work
    const trigger = (time, note, duration = '16n') => {
      if (synth instanceof Tone.NoiseSynth) {
        // NoiseSynth signature: (duration, time)
        synth.triggerAttackRelease(duration, time);
      } else {
        // melodic & membrane: (note, duration, time)
        synth.triggerAttackRelease(note, duration, time);
      }
    };

    return { trigger, gainNode };
  });
}
