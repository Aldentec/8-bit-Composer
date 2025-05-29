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
