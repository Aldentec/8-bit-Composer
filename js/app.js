// js/app.js
const Tone = window.Tone;  
import {
  initGrid, clearGrid, gridState, noteState,
  INSTRUMENT_OPTIONS
} from './grid.js';
import { createVoices }    from './voices.js';
import { initSequencer }   from './sequencer.js';
import { exportAudio }     from './audioExport.js';
import { getControls, initControls } from './controls.js';
let controls;
import { initPlayback }    from './playback.js';
import { initGenerate }    from './generate.js';
import { saveComposition, loadComposition, clearComposition } from './storage.js';

let instrumentNames, muted, trackVolume, voiceRows, triggers, lastTitle = 'composition';

// This function is used to convert the grid/composition data into JSON to be saved to local storage
function serializeGridToJSON(title = lastTitle, tempo = Number(controls.bpmIn.value)) {
  const composition = {
    title,
    tempo,
    channels: instrumentNames.map((name, rowIndex) => {
      const notes = [];
      gridState[rowIndex].forEach((active, stepIndex) => {
        if (active) {
          notes.push({
            step: stepIndex,
            pitch: noteState[rowIndex][stepIndex] || "C4",
            length: "quarter",
            volume: trackVolume[rowIndex],
          });
        }
      });
      return { name, patternLength: gridState[rowIndex].length, notes };
    }),
  };
  return composition;
}

function persistState() {
  const composition = serializeGridToJSON();
  saveComposition(composition);
}

/**  
 * Redraw grid, wire up observers, re-make voices, re-schedule the Transport  
 */
function build(steps, bpm) {
  // 1) draw the empty grid
  initGrid('grid', instrumentNames, steps);
  

  // 2) re-establish your per-cell MutationObserver (copy your code from main.js here)
  //    … without it, cells will never get a pitch label when you click them

  // 3) make voices & wire volumes
  muted       = instrumentNames.map((_,i) => muted[i]       ?? false);
  trackVolume = instrumentNames.map((_,i) => trackVolume[i] ?? 1.0);
  voiceRows    = createVoices(instrumentNames);
  triggers     = voiceRows.map(r => r.trigger);
  voiceRows.forEach((vr,i) => vr.gainNode.gain.value = muted[i] ? 0 : trackVolume[i]);

  // 4) reset and schedule the Transport
  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.position = 0;
  Tone.Transport.bpm.value = bpm;
  initSequencer(triggers, bpm);

  // 5) reset play/pause UI
  controls.playBtn.disabled  = false;
  controls.pauseBtn.disabled = true;
  controls.stopBtn.disabled  = true;
  
  // ─────────────────────────────────────────────────────
  // 6) Hook up per-row mute buttons
  const rows = document.querySelectorAll('.grid-row');
  rows.forEach((tr, rowIndex) => {
    const muteBtn = tr.querySelector('.mute-btn');
    if (!muteBtn) return;

    // ensure the button has the correct initial color
    muteBtn.classList.toggle('muted', muted[rowIndex]);

    // remove any old listener to avoid duplicates
    muteBtn.replaceWith(muteBtn.cloneNode(true));
    const freshBtn = tr.querySelector('.mute-btn');

    freshBtn.addEventListener('click', () => {
      // toggle our flag
      muted[rowIndex] = !muted[rowIndex];
      // silence or restore the gain
      voiceRows[rowIndex].gainNode.gain.value = muted[rowIndex]
        ? 0
        : trackVolume[rowIndex];
      // toggle the red styling
      freshBtn.classList.toggle('muted', muted[rowIndex]);
    });
  });
}

function applyComposition(comp) {
  lastTitle = comp.title || lastTitle;
  controls.bpmIn.value   = comp.tempo;
  controls.stepsIn.value = comp.channels[0].patternLength;

  instrumentNames = comp.channels.map(c => c.name);
  muted           = instrumentNames.map(() => false);
  trackVolume     = instrumentNames.map(() => 1.0);

  build(comp.channels[0].patternLength, comp.tempo);

  // fill gridState/noteState & paint cells
  comp.channels.forEach((ch, row) => {
    ch.notes.forEach(n => {
      gridState[row][n.step] = true;
      noteState[row][n.step] = n.pitch;
      const cell = document.querySelector(
        `[data-row="${row}"][data-step="${n.step}"]`
      );
      if (cell) {
        cell.classList.add('active');
        cell.textContent = n.pitch;
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
    initControls();
    controls = getControls();

    const match = window.location.pathname.match(/\/share\/([a-f0-9\-]{36})/);

    if (match) {
      const id = match[1];
      const url = `https://8bitcomposer-shared.s3-us-west-2.amazonaws.com/${id}.json`;

      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('Composition not found.');
          return res.json();
        })
        .then(data => {
          applyComposition(data);
        })
        .catch(err => {
          console.error(err);
          alert('Failed to load shared composition.');
        });
    }

    // 1) initial state
    instrumentNames = INSTRUMENT_OPTIONS.slice(0,4);
    muted           = instrumentNames.map(() => false);
    trackVolume     = instrumentNames.map(() => 1.0);

    // 2) hook up playback & UI
    initPlayback(newSteps => build(newSteps, Number(controls.bpmIn.value)));
    initGenerate(applyComposition);

    const storedComposition = loadComposition();

    if (storedComposition) {
        applyComposition(storedComposition);
    } else {
        instrumentNames = INSTRUMENT_OPTIONS.slice(0,4);
        muted = instrumentNames.map(() => false);
        trackVolume = instrumentNames.map(() => 1.0);
        build(Number(controls.stepsIn.value), Number(controls.bpmIn.value));
    }

    // 3) clear/export events
    document.addEventListener('clearGrid', ()   => clearGrid());
    document.addEventListener('exportAudio', () =>
        exportAudio({
        gridState, noteState,
        instrumentNames,
        STEPS:    Number(controls.stepsIn.value),
        bpmInput: Number(controls.bpmIn.value),
        lastTitle
        })
    );

    document.addEventListener('cellToggled', () => {
        persistState();
    });

    document.addEventListener('volumeChanged', ({ detail: { row, volume } }) => {
        // update our per-row state
        trackVolume[row] = volume;
        // if that row isn’t muted, push the new volume into its GainNode
        if (!muted[row] && voiceRows[row]) {
            voiceRows[row].gainNode.gain.value = volume;
        }
        persistState();
    });
        
    // Add a new empty row:
    document.addEventListener('addRowClicked', () => {
        // default to the first instrument
        instrumentNames.push(INSTRUMENT_OPTIONS[0]);
        muted.push(false);
        trackVolume.push(1.0);
        build(
            Number(controls.stepsIn.value),
            Number(controls.bpmIn.value)
        );
        persistState();
    });

    // Remove a row at the given index:
    document.addEventListener('removeRowClicked', ({ detail: { row } }) => {
        // drop that instrument, its mute flag, and its volume
        instrumentNames.splice(row, 1);
        muted.splice(row, 1);
        trackVolume.splice(row, 1);
        // rebuild with same steps & bpm
        build(
            Number(controls.stepsIn.value),
            Number(controls.bpmIn.value)
        );
        persistState();
    });

    // Share button status
    document.getElementById('share-btn').addEventListener('click', async () => {
      const statusEl = document.getElementById('share-status');
      statusEl.textContent = '⏳ Uploading composition...';

      try {
        const composition = serializeGridToJSON();

        const response = await fetch('https://egght2t2zl.execute-api.us-west-2.amazonaws.com/test/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ composition }),
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.message || 'Failed to share');

        const shareUrl = data.shareUrl;

        statusEl.innerHTML = `✅ Shareable link: <a href="${shareUrl}" class="underline text-accent" target="_blank">${shareUrl}</a>`;
        await navigator.clipboard.writeText(shareUrl);
      } catch (err) {
        console.error(err);
        statusEl.textContent = '❌ Failed to share composition.';
      }
    });
    

  // **wire up reset button** 👇
  controls.resetBtn.addEventListener('click', () => {
    // reset instruments + volumes
    instrumentNames = INSTRUMENT_OPTIONS.slice(0, 4);
    muted           = instrumentNames.map(() => false);
    trackVolume     = instrumentNames.map(() => 1.0);

    // reset UI controls
    controls.stepsIn.value = 16;
    controls.bpmIn.value   = 80;
    Tone.Transport.bpm.value = 80;

    // clear all grid state & rebuild
    clearGrid();
    clearComposition()
    build(16, 80);

    // clear any “generated” status
    controls.genStatus.textContent = '';
    controls.genTextarea.value = '';
    
    
    return;
  });

   document.getElementById('share-btn').addEventListener('click', async () => {
    try {
      const composition = serializeGridToJSON();

      const response = await fetch('https://egght2t2zl.execute-api.us-west-2.amazonaws.com/test/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ composition }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to share');

      const shareUrl = data.shareUrl;
      await navigator.clipboard.writeText(shareUrl);
    } catch (err) {
      console.error(err);
      alert('❌ Failed to share composition.');
    }
  });
  

  // 4) first draw
  build(Number(controls.stepsIn.value), Number(controls.bpmIn.value));

});
