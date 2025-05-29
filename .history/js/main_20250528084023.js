import { initGrid }               from './grid.js';
import { createVoices }           from './voices.js';
import { initSequencer, bindPlayButton } from './sequencer.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1) instrument names (one per row)
  const instrumentNames = [
    'Square A (440 Hz)',
    'Square B (330 Hz)',
    'Triangle (220 Hz)',
    'Noise'
  ];

  // 2) draw the labeled grid
  initGrid('grid', instrumentNames);

  // 3) build voices and sequencer
  const voices = createVoices();
  initSequencer(voices, 120);

  // 4) wire up Play/Pause
  bindPlayButton('play');
   document.getElementById('clear').addEventListener('click', () => {
    clearGrid();
    // If you’re playing, you might also reset the playhead:
    Tone.Transport.position = 0;
  });
});
