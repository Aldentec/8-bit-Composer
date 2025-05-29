// js/voices.js

/**
 * Given an array of instrument-type strings, returns
 * a matching trigger function for each row.
 */
export function createVoices(instrumentTypes) {
  const env = { attack:0.01, decay:0.1, sustain:0.5, release:0.1 };

  return instrumentTypes.map(type => {
    switch(type) {
      case 'square':
        return time => {
          new Tone.Synth({
            oscillator:{ type:'square' },
            envelope: env
          }).toDestination()
           .triggerAttackRelease(440, '16n', time);
        };

      case 'triangle':
        return time => {
          new Tone.Synth({
            oscillator:{ type:'triangle' },
            envelope: env
          }).toDestination()
           .triggerAttackRelease(220, '16n', time);
        };

      case 'sawtooth':
        return time => {
          new Tone.Synth({
            oscillator:{ type:'sawtooth' },
            envelope: env
          }).toDestination()
           .triggerAttackRelease(330, '16n', time);
        };

      case 'pulse25':
      case 'pulse50':
      case 'pulse75': {
        const width = type === 'pulse25' ? 0.25
                    : type === 'pulse50' ? 0.5
                    : 0.75;
        return time => {
          new Tone.Synth({
            oscillator:{ type:'pulse', width },
            envelope: env
          }).toDestination()
           .triggerAttackRelease(440, '16n', time);
        };
      }

      case 'fmsynth':
        return time => {
          new Tone.FMSynth({ modulationIndex:12, envelope: env }).toDestination()
             .triggerAttackRelease('C4','16n',time);
        };

      case 'amsynth':
        return time => {
          new Tone.AMSynth({ harmonicity:3, envelope: env }).toDestination()
             .triggerAttackRelease('C4','16n',time);
        };

      case 'metal':
        return time => {
          new Tone.MetalSynth({ envelope: env }).toDestination()
             .triggerAttackRelease('C4','16n',time);
        };

      case 'membrane':
        return time => {
          new Tone.MembraneSynth({
            envelope: { attack:0.001, decay:0.4, sustain:0, release:1 }
          }).toDestination()
            .triggerAttackRelease('C2','8n',time);
        };

      case 'noise-white':
      case 'noise-pink': {
        const noiseType = type.split('-')[1];
        return time => {
          new Tone.NoiseSynth({
            noise:    { type: noiseType },
            envelope: { attack:0.001, decay:0.2, sustain:0 }
          }).toDestination()
            .triggerAttackRelease('16n', time);
        };
      }

      case 'drum-kick':
      case 'drum-tom':
        return time => {
          new Tone.MembraneSynth({
            pitchDecay:0.05, octaves:10,
            envelope:{ attack:0.001, decay:0.4, sustain:0, release:1 }
          }).toDestination()
            .triggerAttackRelease(
              type === 'drum-kick' ? 'C2' : 'C3',
              '8n',
              time
            );
        };

      case 'drum-snare':
      case 'drum-hat':
        return time => {
          new Tone.NoiseSynth({
            noise:    { type: type === 'drum-snare' ? 'white' : 'pink' },
            envelope: { attack:0.001, decay:0.2, sustain:0 }
          }).toDestination()
            .triggerAttackRelease('16n', time);
        };

      default:
        return () => {};  // silent fallback
    }
  });
}
