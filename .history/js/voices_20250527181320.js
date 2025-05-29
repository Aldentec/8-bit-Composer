/**
 * Returns an array of trigger-functions
 * in the same order as your rows.
 */
export function createVoices() {
  const osc1 = new Tone.Oscillator(440, 'square').toDestination();
  const osc2 = new Tone.Oscillator(330, 'square').toDestination();
  const osc3 = new Tone.Oscillator(220, 'triangle').toDestination();
  const noise = new Tone.NoiseSynth({
    noise:    { type: 'white' },
    envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
  }).toDestination();

  return [
    time => { osc1.start(time); osc1.stop(time + 0.1); },
    time => { osc2.start(time); osc2.stop(time + 0.1); },
    time => { osc3.start(time); osc3.stop(time + 0.1); },
    time => { noise.triggerAttackRelease('16n', time); }
  ];
}
