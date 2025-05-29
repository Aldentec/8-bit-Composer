// js/voices.js
import * as Tone from 'tone';

/**
 * Returns an array of trigger-functions, one per row.
 * Each trigger schedules its own Synth per note so no reuse errors occur.
 */
export function createVoices() {
  // common envelope settings
  const envSettings = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 };

  return [
    // Square @ 440 Hz
    time => {
      const synth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: envSettings
      }).toDestination();
      synth.triggerAttackRelease(440, '16n', time);
    },

    // Square @ 330 Hz
    time => {
      const synth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: envSettings
      }).toDestination();
      synth.triggerAttackRelease(330, '16n', time);
    },

    // Triangle @ 220 Hz
    time => {
      const synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: envSettings
      }).toDestination();
      synth.triggerAttackRelease(220, '16n', time);
    },

    // White noise
    time => {
      const noise = new Tone.NoiseSynth({
        noise:    { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
      }).toDestination();
      noise.triggerAttackRelease('16n', time);
    },

    // Example drum kick (using MembraneSynth)
    time => {
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 10,
        envelope: { attack:0.001, decay:0.4, sustain:0, release:1 }
      }).toDestination();
      kick.triggerAttackRelease('C2', '8n', time);
    },

    // Example drum snare (using NoiseSynth)
    time => {
      const snare = new Tone.NoiseSynth({
        noise:    { type: 'pink' },
        envelope: { attack:0.001, decay:0.2, sustain:0 }
      }).toDestination();
      snare.triggerAttackRelease('16n', time);
    }
  ];
}
