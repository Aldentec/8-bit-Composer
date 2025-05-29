// js/main.js

import {
  initGrid,
  clearGrid,
  INSTRUMENT_OPTIONS
} from './grid.js';
import { createVoices }      from './voices.js';
import { initSequencer }     from './sequencer.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1) Initial rows: pick your first four defaults from the full options
  let instrumentNames = INSTRUMENT_OPTIONS.slice(0, 4);

  // 2) UI controls
  const playBtn  = document.getElementById('play');
  const pauseBtn = document.getElementById('pause');
  const stopBtn  = document.getElementById('stop');
  const clearBtn = document.getElementById('clear');
  const stepsIn  = document.getElementById('steps-input');
  const bpmIn    = document.getElementById('bpm-input');

  let voices = [];  // will hold our trigger functions

  // 3) Build or rebuild the grid + sequencer
  function build(steps, bpm) {
    // a) draw the grid (dropdowns + cells)
    initGrid('grid', instrumentNames, steps);

    // b) create voices in the same order as rows
    voices = createVoices(instrumentNames);

    // c) reset the Transport
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    Tone.Transport.bpm.value = bpm;

    // d) schedule the sequencer
    initSequencer(voices);

    // e) button state reset
    playBtn.disabled  = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = true;
  }

  // 4) Initial build (16 steps @ 120 BPM)
  build(Number(stepsIn.value), Number(bpmIn.value));

  // 5) Play / Pause / Stop / Clear
  playBtn.addEventListener('click', async () => {
  await Tone.start();
  Tone.Transport.stop();
  Tone.Transport.position = 0;
  Tone.Transport.start();

  // highlight buttons
  playBtn.classList.add('active');
  pauseBtn.classList.remove('active');
  stopBtn.classList.remove('active');

  playBtn.disabled  = true;
  pauseBtn.disabled = false;
  stopBtn.disabled  = false;
});

  pauseBtn.addEventListener('click', () => {
  Tone.Transport.pause();

  // highlight buttons
  pauseBtn.classList.add('active');
  playBtn.classList.remove('active');
  stopBtn.classList.remove('active');

  playBtn.disabled  = false;
  pauseBtn.disabled = true;
  stopBtn.disabled  = false;
});

  stopBtn.addEventListener('click', () => {
  Tone.Transport.stop();
  Tone.Transport.position = 0;

  // clear highlights
  playBtn.classList.remove('active');
  pauseBtn.classList.remove('active');
  stopBtn.classList.add('active');

  playBtn.disabled  = false;
  pauseBtn.disabled = true;
  stopBtn.disabled  = true;
});

  clearBtn.addEventListener('click', () => {
    clearGrid();
    Tone.Transport.stop();
    Tone.Transport.position = 0;

    playBtn.classList.remove('active');
    pauseBtn.classList.remove('active');
    stopBtn.classList.remove('active');

    playBtn.disabled  = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = true;
  });

  // 6) Steps change → rebuild everything
  stepsIn.addEventListener('change', () => {
    const s = Math.max(1, Number(stepsIn.value) || 1);
    build(s, Number(bpmIn.value));
  });

  // 7) BPM change → live tempo update
  bpmIn.addEventListener('change', () => {
    const b = Math.max(1, Math.min(300, Number(bpmIn.value) || 120));
    Tone.Transport.bpm.value = b;
  });

  document.addEventListener('addRowClicked', () => {
    // append a new row with default instrument
    instrumentNames.push(INSTRUMENT_OPTIONS[0]);
    // rebuild grid & sequencer
    build(Number(stepsIn.value), Number(bpmIn.value));
  });

  // 8) Instrument dropdown change → update that row’s voice only
  document.addEventListener('instrumentChanged', ({ detail: { row, type } }) => {
    // update the array
    instrumentNames[row] = type;

    // rebuild voices to reflect the new type
    voices = createVoices(instrumentNames);

    // re-schedule the transport so new voice takes effect
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    initSequencer(voices);
  });

  document.addEventListener('removeRowClicked', ({ detail: { row } }) => {
  // Remove that instrument
  instrumentNames.splice(row, 1);
  // Rebuild grid & sequencer
  build(Number(stepsIn.value), Number(bpmIn.value));
});
});
