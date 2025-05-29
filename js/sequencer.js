// js/sequencer.js

import { STEPS, gridState, noteState } from './grid.js';

let repeatId = null;

export function initSequencer(voices, bpm = 120) {
  // 1) set tempo
  Tone.Transport.bpm.value = bpm;

  // 2) clear any existing schedule
  if (repeatId !== null) {
    Tone.Transport.clear(repeatId);
    repeatId = null;
  }

  // precompute a 1/16-note duration
  const sixteenth = Tone.Time('16n');

  // 3) schedule on every sixteenth
  repeatId = Tone.Transport.scheduleRepeat((time) => {
    const ticksPer16th = Tone.Transport.PPQ / 4;
    const step = Math.floor(Tone.Transport.ticks / ticksPer16th) % STEPS;

    voices.forEach((triggerFn, row) => {
      const prev = (step + STEPS - 1) % STEPS;
      // start only at the beginning of a run
      if (gridState[row][step] && !gridState[row][prev]) {
        // measure run length
        let len = 1;
        while (gridState[row][(step + len) % STEPS] && len < STEPS) {
          len++;
        }
        // duration = len × one sixteenth
        const duration = sixteenth * len;
        const note     = noteState[row][step];
        // call the trigger function directly
        triggerFn(time, note, duration);
      }
    });
  }, '16n');
}
