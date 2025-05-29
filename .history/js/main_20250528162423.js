// js/main.js

import {
  initGrid,
  clearGrid,
  INSTRUMENT_OPTIONS,
  volumeState
} from './grid.js';
import { createVoices }   from './voices.js';
import { initSequencer }  from './sequencer.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1) Initial rows: first four defaults
  let instrumentNames = INSTRUMENT_OPTIONS.slice(0, 4);

  // 2) UI controls
  const playBtn  = document.getElementById('play');
  const pauseBtn = document.getElementById('pause');
  const stopBtn  = document.getElementById('stop');
  const clearBtn = document.getElementById('clear');
  const stepsIn  = document.getElementById('steps-input');
  const bpmIn    = document.getElementById('bpm-input');

  let voiceRows = [];  // will hold { trigger, gainNode } per row
  let triggers  = [];  // array of trigger functions

  // 3) Build or rebuild grid + sequencer + volume sliders
  function build(steps, bpm) {
    // a) draw the grid (dropdowns + remove + sliders + cells)
    initGrid('grid', instrumentNames, steps);

    // b) create VoiceRows and extract triggers
    voiceRows = createVoices(instrumentNames);
    triggers  = voiceRows.map(r => r.trigger);

    // c) reset the Transport
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    Tone.Transport.bpm.value = bpm;

    // d) schedule the sequencer
    initSequencer(triggers, bpm);

    // e) reset button states
    playBtn.disabled  = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = true;

    // f) wire up volume sliders
    const sliders = document.querySelectorAll('.volume-slider');
    sliders.forEach((slider, idx) => {
      // initialize from volumeState (merged in grid.js)
      slider.value = volumeState[idx];
      // on user input, update gainNode and persist
      slider.oninput = e => {
        const v = parseFloat(e.target.value);
        voiceRows[idx].gainNode.gain.value = v;
        volumeState[idx] = v;
      };
    });
  }

  // 4) Initial build
  build(Number(stepsIn.value), Number(bpmIn.value));

  // 5) Play / Pause / Stop / Clear handlers
  playBtn.addEventListener('click', async () => {
    await Tone.start();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.start();
    playBtn.classList.add('active');
    pauseBtn.classList.remove('active');
    stopBtn.classList.remove('active');
    playBtn.disabled  = true;
    pauseBtn.disabled = false;
    stopBtn.disabled  = false;
  });

  pauseBtn.addEventListener('click', () => {
    Tone.Transport.pause();
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
    stopBtn.classList.add('active');
    playBtn.classList.remove('active');
    pauseBtn.classList.remove('active');
    playBtn.disabled  = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = true;
  });

  clearBtn.addEventListener('click', () => {
    clearGrid();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    [playBtn, pauseBtn, stopBtn].forEach(b => b.classList.remove('active'));
    playBtn.disabled  = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = true;
  });

  // 6) Steps change → rebuild
  stepsIn.addEventListener('change', () => {
    build(Math.max(1, +stepsIn.value), +bpmIn.value);
  });

  // 7) BPM change → live tempo update
  bpmIn.addEventListener('change', () => {
    const b = Math.max(1, Math.min(300, +bpmIn.value));
    Tone.Transport.bpm.value = b;
  });

  // 8) Add row
  document.addEventListener('addRowClicked', () => {
    instrumentNames.push(INSTRUMENT_OPTIONS[0]);
    build(+stepsIn.value, +bpmIn.value);
  });

  // 9) Remove row
  document.addEventListener('removeRowClicked', ({ detail: { row } }) => {
    instrumentNames.splice(row, 1);
    build(+stepsIn.value, +bpmIn.value);
  });

  // 10) Instrument change → swap voice on the fly
  document.addEventListener('instrumentChanged', ({ detail: { row, type } }) => {
    instrumentNames[row] = type;
    // rebuild voices & triggers
    voiceRows = createVoices(instrumentNames);
    triggers  = voiceRows.map(r => r.trigger);
    // capture play state & pos
    const wasPlaying = Tone.Transport.state === 'started';
    const pos        = Tone.Transport.position;
    // re-init sequencer
    Tone.Transport.stop();
    Tone.Transport.cancel();
    initSequencer(triggers, Number(bpmIn.value));
    if (wasPlaying) Tone.Transport.start(undefined, pos);
    // re-wire slider for the changed row’s gain
    const slider = document.querySelectorAll('.volume-slider')[row];
    if (slider) {
      slider.oninput = e => {
        const v = parseFloat(e.target.value);
        voiceRows[row].gainNode.gain.value = v;
        volumeState[row] = v;
      };
    }
  });
});
