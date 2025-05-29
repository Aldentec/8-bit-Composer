// js/main.js

import { initGrid, clearGrid }        from './grid.js';
import { createVoices }               from './voices.js';
import { initSequencer }              from './sequencer.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1) Your starting rows
  let instrumentNames = ['square','square','triangle','noise'];

  // 2) Controls
  const playBtn  = document.getElementById('play');
  const pauseBtn = document.getElementById('pause');
  const stopBtn  = document.getElementById('stop');
  const clearBtn = document.getElementById('clear');
  const stepsIn  = document.getElementById('steps-input');
  const bpmIn    = document.getElementById('bpm-input');

  let voices = [];  // will hold our scheduled trigger functions

  // 3) Build or rebuild the grid + sequencer
  function build(steps, bpm) {
    // a) draw the grid (with dropdowns!)
    initGrid('grid', instrumentNames, steps);

    // b) create one voice per row
    voices = createVoices(instrumentNames);

    // c) reset the transport
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    Tone.Transport.bpm.value = bpm;

    // d) schedule your sequencer once
    initSequencer(voices);

    // e) reset button states
    playBtn.disabled  = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = true;
  }

  // Initial build (16 steps @ 120 BPM)
  build(Number(stepsIn.value), Number(bpmIn.value));

  // 4) Play, Pause, Stop, Clear handlers
  playBtn.addEventListener('click', async () => {
    await Tone.start();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.start();
    playBtn.disabled  = true;
    pauseBtn.disabled = false;
    stopBtn.disabled  = false;
  });

  pauseBtn.addEventListener('click', () => {
    Tone.Transport.pause();
    playBtn.disabled  = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = false;
  });

  stopBtn.addEventListener('click', () => {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    playBtn.disabled  = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = true;
  });

  clearBtn.addEventListener('click', () => {
    clearGrid();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    playBtn.disabled  = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = true;
  });

  // 5) Rebuild on steps-change
  stepsIn.addEventListener('change', () => {
    const s = Math.max(1, Number(stepsIn.value) || 1);
    build(s, Number(bpmIn.value));
  });

  // 6) Live BPM adjustment
  bpmIn.addEventListener('change', () => {
    const b = Math.max(1, Math.min(300, Number(bpmIn.value) || 120));
    Tone.Transport.bpm.value = b;
  });

  // 7) Update instrument on dropdown change
  document.addEventListener('instrumentChanged', ({ detail: { row, type } }) => {
    // update the name
    instrumentNames[row] = type;
    // rebuild voices so the new type takes effect
    voices = createVoices(instrumentNames);
  });
});
