// js/main.js

import {
  initGrid,
  clearGrid,
  gridState,
  noteState,
  INSTRUMENT_OPTIONS,
  volumeState  // 1D per-row volume from grid.js; do not treat as 2D
} from './grid.js';
import { createVoices }   from './voices.js';
import { initSequencer }  from './sequencer.js';

let build;                // function that draws/rebuilds the grid & sequencer
let instrumentNames;      // current instruments array (kept in sync with channels)
let muted = [];           // boolean array tracking mute state per row
let trackVolume = [];     // per-row gain (0.0–1.0)

// ───────────────────────────────────────────────────────────────────────────────
// 1) Grab references to playback controls and grid container (once DOM exists)
// ───────────────────────────────────────────────────────────────────────────────
const playBtn  = document.getElementById('play');
const pauseBtn = document.getElementById('pause');
const stopBtn  = document.getElementById('stop');
const clearBtn = document.getElementById('clear');
const stepsIn  = document.getElementById('steps-input');
const bpmIn    = document.getElementById('bpm-input');
const gridEl   = document.getElementById('grid');

// ───────────────────────────────────────────────────────────────────────────────
// 2) Variables to hold our voices/triggers between rebuilds
// ───────────────────────────────────────────────────────────────────────────────
let voiceRows = [];  // Array of { trigger, gainNode }
let triggers  = [];  // Array of trigger functions for Tone.Transport

// ───────────────────────────────────────────────────────────────────────────────
// 3) Define build(...) at the top level so applyGeneratedComposition can call it.
//    build() redraws the grid, recreates voices, resets Transport, and wires sliders.
// ───────────────────────────────────────────────────────────────────────────────
build = (steps, bpm) => {
  // a) Draw/update the grid UI for the current instrumentNames & step count
  initGrid('grid', instrumentNames, steps);

  // Initialize or resize muted & trackVolume arrays
  muted       = instrumentNames.map((_, i) => muted[i] || false);
  trackVolume = instrumentNames.map((_, i) => trackVolume[i] ?? 1.0);

  // b) After grid is drawn, attach a MutationObserver to each cell so that
  //    whenever Grid.js activates or deactivates it (via drag or click), we
  //    update noteState and display the correct pitch or clear it.
  const allCells = gridEl.querySelectorAll('[data-row][data-step]');
  allCells.forEach(cell => {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if (m.attributeName === 'class') {
          const row = parseInt(cell.dataset.row, 10);
          const col = parseInt(cell.dataset.step, 10);
          const inst = instrumentNames[row];

          if (cell.classList.contains('active')) {
            // When Grid.js turns it active, set state & text
            gridState[row][col] = true;

            let pitch;
            if (inst.startsWith('drum-')) {
              pitch = inst.split('drum-')[1];
            } else if (inst.startsWith('noise-')) {
              pitch = 'noise';
            } else {
              pitch = 'C4';
            }

            noteState[row][col] = pitch;
            if (inst.startsWith('drum-') || inst.startsWith('noise-')) {
              cell.textContent = 'C4';
            } else {
              cell.textContent = pitch;
            }
          } else {
            // When Grid.js deactivates it, clear state & text
            gridState[row][col] = false;
            noteState[row][col] = null;
            cell.textContent = '';
          }
        }
      });
    });
    observer.observe(cell, { attributes: true });
  });

  // c) Create VoiceRows (synths + gainNodes) and extract trigger functions
  voiceRows = createVoices(instrumentNames);
  triggers  = voiceRows.map(r => r.trigger);

  // Apply mute/volume to each voiceRow
  voiceRows.forEach((vr, idx) => {
    vr.gainNode.gain.value = muted[idx] ? 0 : trackVolume[idx];
  });

  // d) Reset Tone.Transport completely
  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.position = 0;
  Tone.Transport.bpm.value = bpm;

  // e) Schedule the sequencer to read from gridState/noteState
  initSequencer(triggers, bpm);

  // f) Reset play/pause/stop button states
  playBtn.disabled  = false;
  pauseBtn.disabled = true;
  stopBtn.disabled  = true;

  // g) Attach mute buttons and volume sliders for each row
  const tableRows = gridEl.querySelectorAll('.grid-row');
tableRows.forEach((tr, rowIndex) => {
  const instrumentSelect = tr.querySelector('.instrument-select');
  if (!instrumentSelect) return;

  // Ensure mute-cell exists immediately after the instrument-select
  let muteCell = tr.querySelector('.mute-cell');
  if (!muteCell) {
    muteCell = document.createElement('div');
    muteCell.className = 'mute-cell';

    const muteBtn = document.createElement('button');
    muteBtn.className = 'mute-btn';
    muteBtn.textContent = muted[rowIndex] ? 'Unmute' : 'Mute';
    muteCell.appendChild(muteBtn);

    instrumentSelect.insertAdjacentElement('afterend', muteCell);

    muteBtn.addEventListener('click', () => {
      muted[rowIndex] = !muted[rowIndex];
      voiceRows[rowIndex].gainNode.gain.value = muted[rowIndex] ? 0 : trackVolume[rowIndex];
      muteBtn.textContent = muted[rowIndex] ? 'Unmute' : 'Mute';
    });
  } else {
    const muteBtn = muteCell.querySelector('button');
    muteBtn.textContent = muted[rowIndex] ? 'Unmute' : 'Mute';
    voiceRows[rowIndex].gainNode.gain.value = muted[rowIndex] ? 0 : trackVolume[rowIndex];
  }

  // Volume slider handling stays the same
  const slider = tr.querySelector('input[type="range"]');
  if (slider) {
    slider.value = trackVolume[rowIndex];
    slider.oninput = e => {
      const v = parseFloat(e.target.value);
      trackVolume[rowIndex] = v;
      if (!muted[rowIndex]) {
        voiceRows[rowIndex].gainNode.gain.value = v;
      }
    };
  }
});
};

// ───────────────────────────────────────────────────────────────────────────────
// 4) Once DOM is ready, do initial setup and wire controls
// ───────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 4.1) Initial instrument rows (default to first four)
  instrumentNames = INSTRUMENT_OPTIONS.slice(0, 4);
  muted           = instrumentNames.map(() => false);
  trackVolume     = instrumentNames.map(() => 1.0);

  // 4.2) Initial build with default steps (16) and default BPM (80)
  build(Number(stepsIn.value), Number(bpmIn.value));

  // ─ Play button ───────────────────────────────────────────────────────────────────
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

  // ─ Pause button ──────────────────────────────────────────────────────────────────
  pauseBtn.addEventListener('click', () => {
    Tone.Transport.pause();
    pauseBtn.classList.add('active');
    playBtn.classList.remove('active');
    stopBtn.classList.remove('active');
    playBtn.disabled  = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = false;
  });

  // ─ Stop button ───────────────────────────────────────────────────────────────────
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

  // ─ Clear grid button ─────────────────────────────────────────────────────────────
  clearBtn.addEventListener('click', () => {
    clearGrid();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    [playBtn, pauseBtn, stopBtn].forEach(b => b.classList.remove('active'));
    playBtn.disabled  = false;
    pauseBtn.disabled = true;
    stopBtn.disabled  = true;
  });

  // 4.3) When “Steps” changes, rebuild grid with new step count
  stepsIn.addEventListener('change', () => {
    const newSteps = Math.max(1, +stepsIn.value);
    build(newSteps, +bpmIn.value);
  });

  // 4.4) When BPM changes, update Tone.Transport.bpm live
  bpmIn.addEventListener('change', () => {
    const b = Math.max(1, Math.min(300, +bpmIn.value));
    Tone.Transport.bpm.value = b;
  });

  // 4.5) Add-row event: push a default instrument, then rebuild
  document.addEventListener('addRowClicked', () => {
    instrumentNames.push(INSTRUMENT_OPTIONS[0]);
    muted.push(false);
    trackVolume.push(1.0);
    build(+stepsIn.value, +bpmIn.value);
  });

  // 4.6) Remove-row event: splice out that index, then rebuild
  document.addEventListener('removeRowClicked', ({ detail: { row } }) => {
    instrumentNames.splice(row, 1);
    muted.splice(row, 1);
    trackVolume.splice(row, 1);
    build(+stepsIn.value, +bpmIn.value);
  });

  // 4.7) Instrument change event: update that row’s instrument, re-create voices, re-schedule
  document.addEventListener('instrumentChanged', ({ detail: { row, type } }) => {
    instrumentNames[row] = type;
    voiceRows = createVoices(instrumentNames);
    triggers  = voiceRows.map(r => r.trigger);

    const wasPlaying = Tone.Transport.state === 'started';
    const pos        = Tone.Transport.position;
    Tone.Transport.stop();
    Tone.Transport.cancel();
    initSequencer(triggers, Number(bpmIn.value));
    if (wasPlaying) Tone.Transport.start(undefined, pos);

    // After rebuild, reapply mute/volume for this row
    voiceRows[row].gainNode.gain.value = muted[row] ? 0 : trackVolume[row];

    // Update that row’s mute button and volume slider
    const tableRows = gridEl.querySelectorAll('tr');
    const tr        = tableRows[row];
    const muteCell  = tr.querySelector('.mute-cell');
    if (muteCell) {
      const muteBtn = muteCell.querySelector('button');
      muteBtn.textContent = muted[row] ? 'Unmute' : 'Mute';
    }
    const slider = tr.querySelector('input[type="range"]');
    if (slider) {
      slider.value = trackVolume[row];
    }
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 5) Reset-Button Integration
  // ───────────────────────────────────────────────────────────────────────────────
  const resetBtn = document.getElementById("reset-btn");
  const generateStatusSpan = document.getElementById("generate-status");

  resetBtn.addEventListener("click", () => {
    instrumentNames = INSTRUMENT_OPTIONS.slice(0, 4);
    muted           = instrumentNames.map(() => false);
    trackVolume     = instrumentNames.map(() => 1.0);

    stepsIn.value = 16;
    bpmIn.value = 80;
    Tone.Transport.bpm.value = 80;

    gridState.length = 0;
    noteState.length = 0;
    volumeState.length = 0; // per-row array cleared

    build(16, 80);

    generateStatusSpan.textContent = "";
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// 6) Bedrock “Generate 8-Bit Track” integration (outside DOMContentLoaded)
// ───────────────────────────────────────────────────────────────────────────────
const generatePromptTextarea = document.getElementById("generate-prompt");
const generateBtn            = document.getElementById("generate-btn");
const generateStatusSpan     = document.getElementById("generate-status");

function applyGeneratedComposition(composition) {
  const { title, tempo, channels } = composition;

  const bpmControl = document.getElementById("bpm-input");
  bpmControl.value = tempo;
  Tone.Transport.bpm.value = tempo;

  const patternLength = channels[0].patternLength;
  const stepsControl  = document.getElementById("steps-input");
  stepsControl.value  = patternLength;

  instrumentNames = channels.map(ch => ch.name);
  muted           = instrumentNames.map(() => false);
  trackVolume     = instrumentNames.map(() => 1.0);

  build(patternLength, tempo);

  channels.forEach((channelObj, rowIndex) => {
    const inst  = instrumentNames[rowIndex];
    const notes = channelObj.notes;

    notes.forEach(noteObj => {
      const s = noteObj.step;
      const p = noteObj.pitch;
      const v = noteObj.volume;

      gridState[rowIndex][s]   = true;
      noteState[rowIndex][s]   = p;
      // Do NOT assign into volumeState[row][s]
      const selector = `[data-row="${rowIndex}"][data-step="${s}"]`;
      const cellEl   = document.querySelector(selector);
      if (cellEl) {
        cellEl.classList.add("active");
        if (inst.startsWith('drum-') || inst.startsWith('noise-')) {
          cellEl.textContent = 'C4';
        } else {
          cellEl.textContent = p;
        }
      }
    });
  });
}

generateBtn.addEventListener("click", async () => {
  const promptText = generatePromptTextarea.value.trim();
  if (!promptText) {
    generateStatusSpan.style.color = 'crimson';
    generateStatusSpan.textContent = "⚠️ Please enter a prompt.";
    return;
  }

  const originalBtnText = generateBtn.textContent;
  generateBtn.textContent = "Generating…";
  generateBtn.disabled = true;
  generateStatusSpan.textContent = "";

  try {
    const payload  = { prompt: promptText };
    const response = await fetch("http://localhost:3000/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `Server returned ${response.status}`);
    }

    const compositionJson = await response.json();
    applyGeneratedComposition(compositionJson);

    const fullTitle = compositionJson.title;
    let statusTitle = fullTitle;
    const inMatch = fullTitle.match(/^(.*) in (.+)$/i);
    if (inMatch) {
      statusTitle = `${inMatch[1]} - ${inMatch[2]}`;
    }

    generateStatusSpan.style.color = "var(--fg-color)";
    generateStatusSpan.textContent = `✅ Generated "${statusTitle}"`;
  } catch (err) {
    console.error("Error generating 8-bit track:", err);
    generateStatusSpan.style.color = "crimson";
    generateStatusSpan.textContent = `❌ ${err.message}`;
  } finally {
    generateBtn.textContent = originalBtnText;
    generateBtn.disabled    = false;
  }
});
