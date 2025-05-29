import { initGrid, clearGrid }               from './grid.js';
import { createVoices }                       from './voices.js';
import { initSequencer, bindPlayButton }      from './sequencer.js';

document.addEventListener('DOMContentLoaded', () => {
  // your instrument names
  const instrumentNames = [
    'Square A', 'Square B', 'Triangle', 'Noise'
  ];

  // grab controls
  const playBtn   = document.getElementById('play');
  const clearBtn  = document.getElementById('clear');
  const stepsInput = document.getElementById('steps-input');

  // keep voices & sequencer in closure
  let voices;

  // function to (re)build the grid + sequencer
  function buildGridAndSequencer(steps) {
    // 1) draw the grid
    initGrid('grid', instrumentNames, steps);

    // 2) (re)create voices
    voices = createVoices();

    // 3) stop & clear any existing schedule
    Tone.Transport.stop();
    Tone.Transport.cancel();

    // 4) init sequencer with new step count
    initSequencer(voices, /* bpm= */ 120);

    // reset play button label
    playBtn.textContent = '▶️ Play';
  }

  // Initial build at 16 steps
  buildGridAndSequencer(Number(stepsInput.value));

  // Wire Play/Pause
  bindPlayButton('play');

  // Wire Clear
  clearBtn.addEventListener('click', () => {
    clearGrid();
    Tone.Transport.position = 0;
  });

  // **New**: when user changes steps, rebuild
  stepsInput.addEventListener('change', () => {
    const newSteps = Math.max(1, Number(stepsInput.value) || 1);
    buildGridAndSequencer(newSteps);
  });
});
