import { STEPS, gridState } from './grid.js';

export function initSequencer(voices, bpm = 120) {
  let cursor = 0;
  Tone.Transport.bpm.value = bpm;

  Tone.Transport.scheduleRepeat((time) => {
    const step = cursor % STEPS;
    voices.forEach((trigger, row) => {
      if (gridState[row][step]) trigger(time);
    });
    cursor++;
  }, '16n');
}
