// js/main.js
import { initGrid } from './grid.js';
import { createVoices } from './grid.js';
import { initSequencer, bindPlayButton } from './sequencer.js';

// 1) Render the grid into the <div id="grid">
initGrid('grid');

// 2) Create your array of voice-trigger functions
const voices = createVoices();

// 3) Initialize the sequencer (uses Tone.Transport under the hood)
initSequencer(voices, /* bpm= */ 120);

// 4) Wire up the Play/Pause button
bindPlayButton('play');
