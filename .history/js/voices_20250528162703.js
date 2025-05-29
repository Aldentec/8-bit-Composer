// js/voices.js

/**
 * Given an array of instrument-type strings, returns
 * an array of { trigger, gainNode }—one per row.
 * Each voice is pre-created, passed through a 4-bit crusher,
 * then into its own GainNode for volume control.
 */
export function createVoices(instrumentTypes) {
  const env = { attack:0.01, decay:0.1, sustain:0.5, release:0.1 };

  return instrumentTypes.map(type => {
    let synth;
    // 1) per-row gain
    const gainNode = new Tone.Gain(0.8).toDestination();
    // 2) an 8-bit crusher (4 bits gives strong 8-bit vibe)
    const bitCrusher = new Tone.BitCrusher({ bits: 4 });

    // 3) pick the right synth
    switch (type) {
      case 'square':
        synth = new Tone.Synth({ oscillator:{ type:'square' }, envelope: env });
        break;
      case 'triangle':
        synth = new Tone.Synth({ oscillator:{ type:'triangle' }, envelope: env });
        break;
      case 'sawtooth':
        synth = new Tone.Synth({ oscillator:{ type:'sawtooth' }, envelope: env });
        break;
      case 'pulse25':
      case 'pulse50':
      case 'pulse75': {
        const width = type==='pulse25'?0.25:type==='pulse50'?0.5:0.75;
        synth = new Tone.Synth({ oscillator:{ type:'pulse', width }, envelope: env });
        break;
      }
      case 'fmsynth':
        synth = new Tone.FMSynth({ modulationIndex:12, envelope: env });
        break;
      case 'amsynth':
        synth = new Tone.AMSynth({ harmonicity:3, envelope: env });
        break;
      case 'metal':
        synth = new Tone.MetalSynth({ envelope: env });
        break;
      case 'membrane':
        synth = new Tone.MembraneSynth({
          envelope:{ attack:0.001, decay:0.4, sustain:0, release:1 }
        });
        break;
      case 'noise-white':
        synth = new Tone.NoiseSynth({
          noise:{ type:'white' },
          envelope:{ attack:0.001, decay:0.2, sustain:0 }
        });
        break;
      case 'noise-pink':
        synth = new Tone.NoiseSynth({
          noise:{ type:'pink' },
          envelope:{ attack:0.001, decay:0.2, sustain:0 }
        });
        break;

      // Pure-synth drums—no external samples needed
      case 'drum-kick':
        synth = new Tone.MembraneSynth({
          pitchDecay:0.05,
          envelope:{ attack:0.001, decay:0.3, sustain:0, release:1 }
        });
        break;
      case 'drum-snare':
        synth = new Tone.NoiseSynth({
          noise:{ type:'white' },
          envelope:{ attack:0.001, decay:0.2, sustain:0 }
        });
        break;
      case 'drum-tom':
        synth = new Tone.MembraneSynth({
          pitchDecay:0.02,
          envelope:{ attack:0.005, decay:0.3, sustain:0, release:1 }
        });
        break;
      case 'drum-hat':
        synth = new Tone.NoiseSynth({
          noise:{ type:'pink' },
          envelope:{ attack:0.001, decay:0.05, sustain:0 }
        });
        break;

      default:
        // fallback to a basic square synth
        synth = new Tone.Synth({ oscillator:{ type:'square' }, envelope:env });
    }

    // 4) chain through crusher into the gain node
    synth.chain(bitCrusher, gainNode);

    // 5) return a trigger() that handles notes vs. drums
    const trigger = (time, note) => {
      switch (type) {
        case 'drum-kick':
          synth.triggerAttackRelease('C2', '8n', time);
          break;
        case 'drum-snare':
          synth.triggerAttackRelease('16n', time);
          break;
        case 'drum-tom':
          synth.triggerAttackRelease('C3', '8n', time);
          break;
        case 'drum-hat':
          synth.triggerAttackRelease('16n', time);
          break;
        default:
          // noise synths ignore note
          if (synth instanceof Tone.NoiseSynth) {
            synth.triggerAttackRelease('16n', time);
          } else {
            synth.triggerAttackRelease(note, '16n', time);
          }
      }
    };

    return { trigger, gainNode };
  });
}
