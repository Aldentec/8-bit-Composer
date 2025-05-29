// js/voices.js

/**
 * Given an array of instrument-type strings, returns
 * an array of objects { trigger, gainNode }—one per row.
 * Each synthesizer is created once, then routed through a GainNode
 * whose value you can tweak at runtime to control that row’s volume.
 */
export function createVoices(instrumentTypes) {
  const env = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 };

  const rows = instrumentTypes.map(type => {
    let synth, gain;

    // 1) Make a GainNode defaulting to 0.8
    gain = new Tone.Gain(0.8).toDestination();

    // 2) Create the right synth & wire it through the gain node
    switch(type) {
      case 'square':
        synth = new Tone.Synth({ oscillator:{ type:'square' }, envelope:env });
        break;
      case 'triangle':
        synth = new Tone.Synth({ oscillator:{ type:'triangle' }, envelope:env });
        break;
      case 'sawtooth':
        synth = new Tone.Synth({ oscillator:{ type:'sawtooth' }, envelope:env });
        break;
      case 'pulse25':
      case 'pulse50':
      case 'pulse75': {
        const width = type==='pulse25'?0.25:type==='pulse50'?0.5:0.75;
        synth = new Tone.Synth({ oscillator:{ type:'pulse', width }, envelope:env });
        break;
      }
      case 'fmsynth':
        synth = new Tone.FMSynth({ modulationIndex:12, envelope:env });
        break;
      case 'amsynth':
        synth = new Tone.AMSynth({ harmonicity:3, envelope:env });
        break;
      case 'metal':
        synth = new Tone.MetalSynth({ envelope:env });
        break;
      case 'membrane':
        synth = new Tone.MembraneSynth({
          envelope:{ attack:0.001, decay:0.4, sustain:0, release:1 }
        });
        break;
      case 'noise-white':
        synth = new Tone.NoiseSynth({ noise:{ type:'white' }, envelope:{ attack:0.001, decay:0.2, sustain:0 } });
        break;
      case 'noise-pink':
        synth = new Tone.NoiseSynth({ noise:{ type:'pink'  }, envelope:{ attack:0.001, decay:0.2, sustain:0 } });
        break;
      default:
        // drums: use a single Sampler per row (point to your samples folder)
        synth = new Tone.Sampler({
          urls:   { C1: `${type}.wav` },
          baseUrl:'/samples/drums/'
        });
    }

    synth.connect(gain);
    return { synth, gain };
  });

  // 3) Return trigger functions + their gainNodes
  return rows.map(({ synth, gain }) => ({
    trigger: (time, note) => {
      // drums: Sampler.triggerAttack
      if (synth instanceof Tone.Sampler) {
        synth.triggerAttack('C1', time);
      } else {
        synth.triggerAttackRelease(note, '16n', time);
      }
    },
    gainNode: gain
  }));
}
