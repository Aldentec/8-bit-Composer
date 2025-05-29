// js/sequencer.js

import { STEPS, gridState, noteState } from './grid.js';

let repeatId = null;

/**
 * Initializes the sequencer:
 *  - Sets the Transport BPM
 *  - Clears any existing schedule
 *  - Schedules a 16th-note repeat that:
 *      • computes the current step
 *      • checks gridState[row][step]
 *      • if active, calls trigger(time, noteState[row][step])
 *
 * @param {Function[]} voices  Array of (time, note) => void trigger functions
 * @param {number} bpm         Tempo in beats per minute
 */
export function initSequencer(voices, bpm = 120) {
  Tone.Transport.bpm.value = bpm;
  if (repeatId) Tone.Transport.clear(repeatId);

  repeatId = Tone.Transport.scheduleRepeat(time => {
    const ticksPer16th = Tone.Transport.PPQ / 4;
    const step = Math.floor(Tone.Transport.ticks / ticksPer16th) % STEPS;

    voices.forEach((trigger, row) => {
      // if this cell is ON but the previous is OFF, it's the start of a run:
      const prev = (step + STEPS - 1) % STEPS;
      if (gridState[row][step] && !gridState[row][prev]) {
        // measure how long the run lasts
        let len = 1;
        while (gridState[row][(step + len) % STEPS]) {
          len++;
          if (len >= STEPS) break;
        }
        // duration string in Tone.js e.g. '4n' for 4 sixteenths
        const dur = `${len} * 16n`;
        const note = noteState[row][step];
        trigger(time, note, dur);
      }
    });
  }, '16n');
}

/**
 * Binds a Play/Pause toggle to a button.
 * @param {string} buttonId  ID of the button element
 */
export function bindPlayButton(buttonId) {
  const btn = document.getElementById(buttonId);
  btn.textContent = '▶️ Play';
  btn.addEventListener('click', async () => {
    await Tone.start();
    if (Tone.Transport.state === 'started') {
      Tone.Transport.stop();
      btn.textContent = '▶️ Play';
    } else {
      Tone.Transport.start();
      btn.textContent = '⏸️ Pause';
    }
  });
}
