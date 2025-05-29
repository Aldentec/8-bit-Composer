// js/sequencer.js
import { STEPS, gridState } from './grid.js';

let repeatId = null;

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
    const step = (
      Math.floor(Tone.Transport.ticks / (Tone.Transport.PPQ / 4))
    ) % STEPS;

    voices.forEach((trigger, row) => {
      if (gridState[row][step]) {
        trigger(time);
      }
    });
  }, '16n');
}

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
