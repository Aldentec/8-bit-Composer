// js/main.js

import { initGrid, createVoices }     from './grid.js';
import { initSequencer, bindPlayButton } from './sequencer.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1) Render the 4×16 grid in <div id="grid">
  initGrid('grid');

  // 2) Create your array of voice‐trigger functions
  const voices = createVoices();

  // 3) Hook up the Tone.Transport scheduler at 120 BPM
  initSequencer(voices, 120);

  // 4) Wire up the Play/Pause button with id="play"
  bindPlayButton('play');
});
