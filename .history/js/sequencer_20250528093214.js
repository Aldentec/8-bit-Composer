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
  // 1) set tempo
  Tone.Transport.bpm.value = bpm;

  // 2) clear any existing scheduled callback
  if (repeatId !== null) {
    Tone.Transport.clear(repeatId);
    repeatId = null;
  }

  // 3) schedule a single repeat on 16th notes
  repeatId = Tone.Transport.scheduleRepeat((time) => {
    // compute current step based on ticks
    const step = Math.floor(Tone.Transport.ticks / (Tone.Transport.PPQ / 4)) % STEPS;

    voices.forEach((trigger, row) => {
      if (gridState[row][step]) {
        const note = noteState[row][step];
        trigger(time, note);
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
