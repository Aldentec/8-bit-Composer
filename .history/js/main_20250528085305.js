import { initGrid, clearGrid }            from './grid.js';
import { createVoices }                   from './voices.js';
import { initSequencer }                  from './sequencer.js';

document.addEventListener('DOMContentLoaded', () => {
  const instrumentNames = ['Sq A','Sq B','Tri','Noise'];

  // Control elements
  const playBtn   = document.getElementById('play');
  const pauseBtn  = document.getElementById('pause');
  const stopBtn   = document.getElementById('stop');
  const clearBtn  = document.getElementById('clear');
  const stepsIn   = document.getElementById('steps-input');

  let voices;  // will hold our trigger fns

  // Build or rebuild everything
  function build(steps) {
    // 1) Draw grid
    initGrid('grid', instrumentNames, steps);

    // 2) Build voices
    voices = createVoices();

    // 3) Cancel previous schedules & reset
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;

    // 4) Init sequencer
    initSequencer(voices, /* bpm= */120);

    // 5) Reset button states
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = true;
  }

  // Initial build at default steps
  build(Number(stepsIn.value));

  // ▶️ Play: always start from beginning
  playBtn.addEventListener('click', async () => {
    await Tone.start();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.start();

    playBtn.disabled  = true;
    pauseBtn.disabled = false;
    stopBtn.disabled  = false;
  });

  // ⏸️ Pause: freeze at current position
  pauseBtn.addEventListener('click', () => {
    Tone.Transport.pause();

    playBtn.disabled  = false; // allow resume from start
    pauseBtn.disabled = true;
    stopBtn.disabled  = false;
  });

  // ⏹️ Stop: stop & reset to 0
  stopBtn.addEventListener('click', () => {
    Tone.Transport.stop();
    Tone.Transport.position = 0;

    playBtn.disabled  = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = true;
  });

  // 🧹 Clear: reset grid and playhead
  clearBtn.addEventListener('click', () => {
    clearGrid();
    Tone.Transport.stop();
    Tone.Transport.position = 0;

    playBtn.disabled  = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = true;
  });

  // 🔢 Steps input: rebuild on change
  stepsIn.addEventListener('change', () => {
    const s = Math.max(1, Number(stepsIn.value) || 1);
    build(s);
  });
});
