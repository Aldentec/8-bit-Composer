// js/sequencer.js

import { STEPS, gridState, noteState } from './grid.js';

let repeatId = null;

export function initSequencer(voices, bpm = 120) {
  Tone.Transport.bpm.value = bpm;

  if (repeatId !== null) {
    Tone.Transport.clear(repeatId);
    repeatId = null;
  }

  repeatId = Tone.Transport.scheduleRepeat((time) => {
    // how many ticks per 16th-note?
    const ticksPer16th = Tone.Transport.PPQ / 4;
    // current step index
    const step = Math.floor(Tone.Transport.ticks / ticksPer16th) % STEPS;

    voices.forEach((rowVoice, row) => {
      // if this cell is on, but the previous is off, it's the start of a run
      const prev = (step + STEPS - 1) % STEPS;
      if (gridState[row][step] && !gridState[row][prev]) {
        // measure run length
        let len = 1;
        while (gridState[row][(step + len) % STEPS]) {
          len++;
          if (len >= STEPS) break;
        }
        // e.g. "3 * 16n" → a dotted-etc duration
        const duration = `${len} * 16n`;
        const note     = noteState[row][step];
        rowVoice.trigger(time, note, duration);
      }
    });
  }, '16n');
}
