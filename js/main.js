// js/main.js

import {
  initGrid,
  clearGrid,
  gridState,
  noteState,
  INSTRUMENT_OPTIONS,
  volumeState
} from './grid.js';
import { createVoices }   from './voices.js';
import { initSequencer }  from './sequencer.js';

// ───────────────────────────────────────────────────────────────────────────────
// 0) We need 'build' available to both initial setup and applyGeneratedComposition.
//    So we declare it here in the outer scope, and assign it inside DOMContentLoaded.
// ───────────────────────────────────────────────────────────────────────────────
let build;            // function that draws/rebuilds the grid & sequencer
let instrumentNames;  // current instruments array (kept in sync with channels)

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

  // b) Create VoiceRows (synths + gainNodes) and extract trigger functions
  voiceRows = createVoices(instrumentNames);
  triggers  = voiceRows.map(r => r.trigger);

  // c) Reset Tone.Transport completely
  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.position = 0;
  Tone.Transport.bpm.value = bpm;

  // d) Schedule the sequencer to read from gridState/noteState
  initSequencer(triggers, bpm);

  // e) Reset play/pause/stop button states
  playBtn.disabled  = false;
  pauseBtn.disabled = true;
  stopBtn.disabled  = true;

  // f) Attach existing volumeState values back onto each row’s GainNode
  const sliders = document.querySelectorAll('.volume-slider');
  sliders.forEach((slider, idx) => {
    slider.value = volumeState[idx];
    slider.oninput = e => {
      const v = parseFloat(e.target.value);
      voiceRows[idx].gainNode.gain.value = v;
      volumeState[idx] = v;
    };
  });
};

// ───────────────────────────────────────────────────────────────────────────────
// 4) Once DOM is ready, do initial setup and wire controls
// ───────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // 4.1) Initial instrument rows (default to the first four INSTRUMENT_OPTIONS)
  instrumentNames = INSTRUMENT_OPTIONS.slice(0, 4);

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
    build(+stepsIn.value, +bpmIn.value);
  });

  // 4.6) Remove-row event: splice out that index, then rebuild
  document.addEventListener('removeRowClicked', ({ detail: { row } }) => {
    instrumentNames.splice(row, 1);
    build(+stepsIn.value, +bpmIn.value);
  });

  // 4.7) Instrument change event: update that row’s instrument, re-create voices, re-schedule
  document.addEventListener('instrumentChanged', ({ detail: { row, type } }) => {
    instrumentNames[row] = type;
    // Re-create voices/triggers for the new instrument list
    voiceRows = createVoices(instrumentNames);
    triggers  = voiceRows.map(r => r.trigger);

    // If transport was playing, preserve its position
    const wasPlaying = Tone.Transport.state === 'started';
    const pos        = Tone.Transport.position;

    // Re-init sequencer on the new triggers
    Tone.Transport.stop();
    Tone.Transport.cancel();
    initSequencer(triggers, Number(bpmIn.value));
    if (wasPlaying) Tone.Transport.start(undefined, pos);

    // Rewire only that row’s volume slider handler
    const slider = document.querySelectorAll('.volume-slider')[row];
    if (slider) {
      slider.oninput = e => {
        const v = parseFloat(e.target.value);
        voiceRows[row].gainNode.gain.value = v;
        volumeState[row] = v;
      };
    }
  });

  // ───────────────────────────────────────────────────────────────────────────────
  // 5) Reset‐Button Integration
  // ───────────────────────────────────────────────────────────────────────────────
  const resetBtn = document.getElementById("reset-btn");
  resetBtn.addEventListener("click", () => {
    instrumentNames = INSTRUMENT_OPTIONS.slice(0, 4);

    stepsIn.value = 16;
    bpmIn.value = 80;
    Tone.Transport.bpm.value = 80;

    // Clear the imported arrays instead of reassigning them:
    gridState.length = 0;
    noteState.length = 0;
    volumeState.length = 0;

    build(16, 80);

    generateStatusSpan.textContent = "";
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// 5) Bedrock “Generate 8-Bit Track” integration
//    This code runs after the grid/sequencer setup above.
// ───────────────────────────────────────────────────────────────────────────────

// 5.1) Grab references to the new UI elements (prompt textarea, generate button, status span)
const generatePromptTextarea = document.getElementById("generate-prompt");
const generateBtn            = document.getElementById("generate-btn");
const generateStatusSpan     = document.getElementById("generate-status");

// 5.2) applyGeneratedComposition: parses Bedrock JSON → populates instrumentNames, gridState, noteState, volumeState
function applyGeneratedComposition(composition) {
  const { title, tempo, channels } = composition;

  // 1) Update the BPM control to match the generated tempo
  const bpmControl = document.getElementById("bpm-input");
  bpmControl.value = tempo;
  Tone.Transport.bpm.value = tempo;

  // 2) Determine the pattern length from channels[0] (they all share the same patternLength)
  const patternLength = channels[0].patternLength;
  const stepsControl  = document.getElementById("steps-input");
  stepsControl.value  = patternLength;

  // 3) Sync instrumentNames to exactly match the returned channel names (in order)
  //    Each channelObj.name should correspond to one of your synth types (e.g. "square1", "triangle", etc).
  //    If you need to transform Bedrock’s names into your INSTRUMENT_OPTIONS, handle it here.
  instrumentNames = channels.map(ch => ch.name);

  // 4) Rebuild the grid/voices with the new instruments & step count
  build(patternLength, tempo);

  // 5) Overwrite gridState/noteState/volumeState based on the returned “notes” arrays
  channels.forEach((channelObj, rowIndex) => {
    const { patternLength: len, notes } = channelObj;

    notes.forEach(noteObj => {
      const step   = noteObj.step;      // 0..len-1
      const pitch  = noteObj.pitch;     // e.g. "C4" or "kick"
      const volume = noteObj.volume;    // 0.0–1.0

      // Mark that cell in gridState and noteState/volumeState
      gridState[rowIndex][step] = true;
      noteState[rowIndex][step] = pitch;
      volumeState[rowIndex]     = volume;

      // Update the corresponding cell DOM element:
      // Use a proper template literal to select `.cell[data-row="…"][data-step="…"]`
      const selector = `.cell[data-row="${rowIndex}"][data-step="${step}"]`;
      const cellEl   = document.querySelector(selector);
      if (cellEl) {
        cellEl.classList.add("active");
        cellEl.textContent = pitch;
      }
    });
  });
}

// 5.3) Wire up the “Generate” button to call our local Bedrock endpoint
generateBtn.addEventListener("click", async () => {
  const promptText = generatePromptTextarea.value.trim();
  if (!promptText) {
    generateStatusSpan.textContent = "⚠️ Please enter a prompt.";
    return;
  }

  generateStatusSpan.style.color = "white";
  generateStatusSpan.textContent = "⏳ Generating…";

  try {
    // Call our local Bedrock‐proxy server
    const payload = {
      prompt: promptText    
    };

    const response = await fetch("http://localhost:3000/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Unknown server error");
    }

    const compositionJson = await response.json();
    applyGeneratedComposition(compositionJson);

    generateStatusSpan.style.color = "green";
    generateStatusSpan.textContent = `✅ Generated "${compositionJson.title}"`;
  }
  catch (err) {
    console.error("Error generating 8-bit track:", err);
    generateStatusSpan.style.color = "darkred";
    generateStatusSpan.textContent = `❌ ${err.message}`;
  }
});
