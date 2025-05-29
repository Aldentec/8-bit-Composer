// js/voices.js

/**
 * Given an array of instrument type strings, return one trigger(fn) per row.
 */
export function createVoices(instrumentTypes) {
  const env = { attack:0.01, decay:0.1, sustain:0.5, release:0.1 };

  return instrumentTypes.map(type => {
    switch(type) {
      case 'square':
        return time => {
          const s = new Tone.Synth({
            oscillator:{ type:'square' },
            envelope:  env
          }).toDestination();
          s.triggerAttackRelease(440, '16n', time);
        };

      case 'triangle':
        return time => {
          const s = new Tone.Synth({
            oscillator:{ type:'triangle' },
            envelope:  env
          }).toDestination();
          s.triggerAttackRelease(220, '16n', time);
        };

      case 'noise':
        return time => {
          const n = new Tone.NoiseSynth({
            noise:    { type:'white' },
            envelope: { attack:0.001, decay:0.2, sustain:0 }
          }).toDestination();
          n.triggerAttackRelease('16n', time);
        };

      case 'drum-kick':
        return time => {
          const k = new Tone.MembraneSynth({
            pitchDecay:0.05, octaves:10,
            envelope:  { attack:0.001, decay:0.4, sustain:0, release:1 }
          }).toDestination();
          k.triggerAttackRelease('C2','8n', time);
        };

      case 'drum-snare':
        return time => {
          const sn = new Tone.NoiseSynth({
            noise:    { type:'pink' },
            envelope: { attack:0.001, decay:0.2, sustain:0 }
          }).toDestination();
          sn.triggerAttackRelease('16n', time);
        };

      default:
        // fallback silent trigger
        return () => {};
    }
  });
}
