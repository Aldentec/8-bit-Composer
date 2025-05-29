// js/sequencer.js

import { STEPS, gridState, noteState } from './grid.js';

let repeatId = null;

export function initSequencer(voices, bpm = 120) {
  // set the tempo
  Tone.Transport.bpm.value = bpm;

  // clear any prior schedule
  if (repeatId !== null) {
    Tone.Transport.clear(repeatId);
    repeatId = null;
  }

  // precompute a single sixteenth-note duration
  const sixteenth = Tone.Time('16n');

  // schedule on every 16th note
  repeatId = Tone.Transport.scheduleRepeat((time) => {
    // which column are we on?
    const step = Math.floor(Tone.Transport.ticks / (Tone.Transport.PPQ / 4)) % STEPS;

    voices.forEach((rowVoice, row) => {
      const prev = (step + STEPS - 1) % STEPS;
      // only fire at the *start* of a run
      if (gridState[row][step] && !gridState[row][prev]) {
        // measure how many in a row
        let len = 1;
        while (gridState[row][(step + len) % STEPS] && len < STEPS) {
          len++;
        }
        // duration = len × one sixteenth
        const dur = sixteenth * len;
        const note = noteState[row][step];
        // trigger with a Time object (works for synths & noise)
        rowVoice.trigger(time, note, dur);
      }
    });
  }, '16n');
}
