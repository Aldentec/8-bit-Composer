// js/voices.js

/**
 * Given an array of instrument‐type strings, returns
 * a trigger function for each row that takes (time, note).
 */
export function createVoices(instrumentTypes) {
  const env = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 };

  return instrumentTypes.map(type => {
    switch (type) {
      // Basic synth voices use the passed-in note
      case 'square':
        return (time, note) => {
          new Tone.Synth({
            oscillator: { type: 'square' },
            envelope: env
          })
            .toDestination()
            .triggerAttackRelease(note, '16n', time);
        };

      case 'triangle':
        return (time, note) => {
          new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: env
          })
            .toDestination()
            .triggerAttackRelease(note, '16n', time);
        };

      case 'sawtooth':
        return (time, note) => {
          new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: env
          })
            .toDestination()
            .triggerAttackRelease(note, '16n', time);
        };

      case 'pulse25':
      case 'pulse50':
      case 'pulse75': {
        const width = type === 'pulse25' ? 0.25
                    : type === 'pulse50' ? 0.5
                    : 0.75;
        return (time, note) => {
          new Tone.Synth({
            oscillator: { type: 'pulse', width },
            envelope: env
          })
            .toDestination()
            .triggerAttackRelease(note, '16n', time);
        };
      }

      // More complex synths
      case 'fmsynth':
        return (time, note) => {
          new Tone.FMSynth({ modulationIndex: 12, envelope: env })
            .toDestination()
            .triggerAttackRelease(note, '16n', time);
        };

      case 'amsynth':
        return (time, note) => {
          new Tone.AMSynth({ harmonicity: 3, envelope: env })
            .toDestination()
            .triggerAttackRelease(note, '16n', time);
        };

      case 'metal':
        return (time, note) => {
          new Tone.MetalSynth({ envelope: env })
            .toDestination()
            .triggerAttackRelease(note, '16n', time);
        };

      case 'membrane':
        return (time, note) => {
          new Tone.MembraneSynth({
            envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 1 }
          })
            .toDestination()
            // for membrane synth we’ll still use the note, defaulting to C2 if none
            .triggerAttackRelease(note || 'C2', '8n', time);
        };

      // Noise synth ignores pitch
      case 'noise-white':
      case 'noise-pink': {
        const noiseType = type.split('-')[1];
        return (time/*, note*/) => {
          new Tone.NoiseSynth({
            noise: { type: noiseType },
            envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
          })
            .toDestination()
            .triggerAttackRelease('16n', time);
        };
      }

      // Drum voices ignore the note argument
      case 'drum-kick':
      case 'drum-tom':
        return (time/*, note*/) => {
          new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 10,
            envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 1 }
          })
            .toDestination()
            .triggerAttackRelease(
              type === 'drum-kick' ? 'C2' : 'C3',
              '8n',
              time
            );
        };

      case 'drum-snare':
      case 'drum-hat':
        return (time/*, note*/) => {
          new Tone.NoiseSynth({
            noise: { type: type === 'drum-snare' ? 'white' : 'pink' },
            envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
          })
            .toDestination()
            .triggerAttackRelease('16n', time);
        };

      // Fallback: no sound
      default:
        return () => {};
    }
  });
}
