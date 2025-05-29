// js/voices.js

/**
 * Given an array of instrument‐type strings, returns
 * a trigger function for each row that takes (time, note).
 * Synths are pre-created and re-used to avoid GC/CPU spikes.
 */
export function createVoices(instrumentTypes) {
  const env = { attack:0.01, decay:0.1, sustain:0.5, release:0.1 };

  // 1) Create one synth or sampler instance per row
  const synths = instrumentTypes.map(type => {
    switch(type) {
      case 'square':
        // a simple monosynth for square waves
        return new Tone.Synth({
          oscillator:{ type:'square' },
          envelope:    env
        }).toDestination();

      case 'triangle':
        return new Tone.Synth({
          oscillator:{ type:'triangle' },
          envelope:    env
        }).toDestination();

      case 'sawtooth':
        return new Tone.Synth({
          oscillator:{ type:'sawtooth' },
          envelope:    env
        }).toDestination();

      case 'pulse25':
      case 'pulse50':
      case 'pulse75': {
        const width = type==='pulse25'?0.25:type==='pulse50'?0.5:0.75;
        return new Tone.Synth({
          oscillator:{ type:'pulse', width },
          envelope:    env
        }).toDestination();
      }

      case 'fmsynth':
        return new Tone.FMSynth({ modulationIndex:12, envelope: env })
          .toDestination();

      case 'amsynth':
        return new Tone.AMSynth({ harmonicity:3, envelope:env })
          .toDestination();

      case 'metal':
        return new Tone.MetalSynth({ envelope: env })
          .toDestination();

      case 'membrane':
        return new Tone.MembraneSynth({
          envelope:{ attack:0.001, decay:0.4, sustain:0, release:1 }
        }).toDestination();

      case 'noise-white':
        return new Tone.NoiseSynth({
          noise:    { type:'white' },
          envelope: { attack:0.001, decay:0.2, sustain:0 }
        }).toDestination();

      case 'noise-pink':
        return new Tone.NoiseSynth({
          noise:    { type:'pink' },
          envelope: { attack:0.001, decay:0.2, sustain:0 }
        }).toDestination();

      case 'drum-kick':
      case 'drum-snare':
      case 'drum-tom':
      case 'drum-hat':
        // use a single Sampler for any drum type
        return new Tone.Sampler({
          urls: {
            C1: `${type}.wav`
          },
          baseUrl: '/samples/drums/',
          onload: () => console.log(`${type} loaded`)
        }).toDestination();

      default:
        // silent fallback
        return { triggerAttackRelease: () => {} };
    }
  });

  // 2) Return the trigger functions
  return synths.map((synth, i) => {
    const type = instrumentTypes[i];
    return (time, note) => {
      if (synth instanceof Tone.Sampler) {
        // drums ignore pitch: just trigger C1 at time
        synth.triggerAttack('C1', time);
      } else {
        // note is like "C4","D#3", etc.
        synth.triggerAttackRelease(note, '16n', time);
      }
    };
  });
}
