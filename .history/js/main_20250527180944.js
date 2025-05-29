// js/main.js

import { initGrid }            from './grid.js';
import { createVoices }        from './voices.js';
import { initSequencer, bindPlayButton } from './sequencer.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1) draw the 4×16 grid
  initGrid('grid');

  // 2) build your voices
  const voices = createVoices();

  // 3) start the scheduler at 120 BPM
  initSequencer(voices, 120);

  // 4) hook up Play/Pause on the ▶️ button
  bindPlayButton('play');
});
