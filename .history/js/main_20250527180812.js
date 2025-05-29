// js/main.js

// 1) Pull in exactly what each module exports
import { initGrid, createVoices }     from './grid.js';
import { initSequencer, bindPlayButton } from './sequencer.js';

// 2) Kick everything off
// Render the 4×16 grid into <div id="grid">
initGrid('grid');

// Create your 4 chip-tune voices
const voices = createVoices();

// Wire up the Transport scheduler at 120 BPM
initSequencer(voices, 120);

// Hook the Play/Pause button (id="play")
bindPlayButton('play');
