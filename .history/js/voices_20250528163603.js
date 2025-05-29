// js/voices.js

/**
 * Given an array of instrument‐type strings, returns
 * an array of { trigger, gainNode }—one per row.
 * Each voice accepts (time, note, duration) so stretched notes
 * will stop correctly.
 */
export function createVoices(instrumentTypes) {
  const env = { attack:0.01, decay:0.1, sustain:0.5, release:0.1 };

  return instrumentTypes.map(type => {
    let synth;
    const gainNode   = new Tone.Gain(0.8).toDestination();
    const bitCrusher = new Tone.BitCrusher({ bits: 4 });

    // 1) instantiate the right synth
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
          noise:    { type:'white' },
          envelope: { attack:0.001, decay:0.2, sustain:0 }
        });
        break;
      case 'noise-pink':
        synth = new Tone.NoiseSynth({
          noise:    { type:'pink' },
          envelope: { attack:0.001, decay:0.2, sustain:0 }
        });
        break;
      case 'drum-kick':
        synth = new Tone.MembraneSynth({
          pitchDecay:0.05,
          envelope:   { attack:0.001, decay:0.3, sustain:0, release:1 }
        });
        break;
      case 'drum-snare':
        synth = new Tone.NoiseSynth({
          noise:    { type:'white' },
          envelope: { attack:0.001, decay:0.2, sustain:0 }
        });
        break;
      case 'drum-tom':
        synth = new Tone.MembraneSynth({
          pitchDecay:0.02,
          envelope:   { attack:0.005, decay:0.3, sustain:0, release:1 }
        });
        break;
      case 'drum-hat':
        synth = new Tone.NoiseSynth({
          noise:    { type:'pink' },
          envelope: { attack:0.001, decay:0.05, sustain:0 }
        });
        break;
      default:
        synth = new Tone.Synth({ oscillator:{ type:'square' }, envelope: env });
    }

    // 2) chain through crusher and gain
    synth.chain(bitCrusher, gainNode);

    // 3) trigger function that honors a duration argument
    const trigger = (time, note, duration = '16n') => {
      // convert any duration string or number into a Tone.Time
      const dur = Tone.Time(duration);
      if (synth instanceof Tone.NoiseSynth) {
        // NoiseSynth: only duration matters
        synth.triggerAttackRelease(dur, time);
      } else {
        // melodic / drum-membrane: note + duration
        synth.triggerAttackRelease(note, dur, time);
      }
    };

    return { trigger, gainNode };
  });
}
