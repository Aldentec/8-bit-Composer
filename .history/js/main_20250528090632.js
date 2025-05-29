import { initGrid, clearGrid }            from './grid.js';
import { createVoices }                   from './voices.js';
import { initSequencer }                  from './sequencer.js';

document.addEventListener('DOMContentLoaded', () => {
  const instrumentNames = ['square','square','triangle','noise'];

  // Control elements
  const playBtn   = document.getElementById('play');
  const pauseBtn  = document.getElementById('pause');
  const stopBtn   = document.getElementById('stop');
  const clearBtn  = document.getElementById('clear');
  const stepsIn   = document.getElementById('steps-input');
  const bpmIn   = document.getElementById('bpm-input');

  let voices;  // will hold our trigger fns

  function build(steps, bpm) {
    initGrid('grid', instrumentNames, steps);

    voices = createVoices();

    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;

    initSequencer(voices, /* bpm= */120);

    Tone.Transport.bpm.value = bpm;
    initSequencer(voices,  /* note: sequencer no longer needs to set bpm */);

    // 5) Reset button states
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = true;
  }

  // Initial build at default steps
  build(Number(stepsIn.value), Number(bpmIn.value));

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

  // steps change -> rebuild
  stepsIn.addEventListener('change', () => {
    build(Math.max(1, Number(stepsIn.value)), Number(bpmIn.value));
  });

  // **bpm change** -> update Transport immediately (no rebuild needed)
  bpmIn.addEventListener('change', () => {
    const newBpm = Math.max(1, Math.min(300, Number(bpmIn.value)));
    Tone.Transport.bpm.value = newBpm;
  });
});
