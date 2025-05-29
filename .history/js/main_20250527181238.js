// js/main.js
import { initGrid }         from './grid.js';
import { createVoices }     from './voices.js';
import { initSequencer }    from './sequencer.js';
import { bindPlayButton }   from './sequencer.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1) your instrument labels, in the same order as your voices()
  const instrumentNames = [
    'Square A (440Hz)',
    'Square B (330Hz)',
    'Triangle (220Hz)',
    'Noise'
  ];

  // 2) draw the grid with labels
  initGrid('grid', instrumentNames);

  // 3) build your voices & sequencer
  const voices = createVoices();
  initSequencer(voices, 120);

  // 4) wire up play/pause
  bindPlayButton('play');
});
