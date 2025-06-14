
// Sequencer dimensions and state
export let STEPS       = 16;
export let CHANNELS    = 0;
export let gridState   = [];   // boolean on/off per [row][step]
export let noteState   = [];   // note string per [row][step]
export let volumeState = [];   // 0.0–1.0 per [row]
export let muted       = [];   // row‐level mute flags

// drag/stretch state
let isDragging    = false,
    dragRow       = null,
    dragStart     = null,
    dragEnd       = null,
    dragOccurred  = false;

/** All possible instruments */
export const INSTRUMENT_OPTIONS = [
  'square','triangle','sawtooth','pulse25','pulse50','pulse75',
  'fmsynth','amsynth','metal',
  'membrane','noise-white','noise-pink',
  'drum-kick','drum-snare','drum-tom','drum-hat',
  'pluck','duosynth','sampler'
];

export function initGrid(containerId, instrumentTypes = [], steps = 16) {
  // 1) preserve old state
  const oldG = gridState, oldN = noteState, oldV = volumeState;
  const oldR = oldG.length, oldC = oldG[0]?.length || 0;

  CHANNELS = instrumentTypes.length;
  STEPS    = steps;

  gridState   = Array.from({ length: CHANNELS }, (_, r) =>
                  Array.from({ length: STEPS }, (_, c) =>
                    r < oldR && c < oldC ? oldG[r][c] : false ));
  noteState   = Array.from({ length: CHANNELS }, (_, r) =>
                  Array.from({ length: STEPS }, (_, c) =>
                    r < oldR && c < oldC ? oldN[r][c] : 'C4' ));
  volumeState = Array.from({ length: CHANNELS }, (_, r) =>
                  r < oldV.length ? oldV[r] : 0.8 );
  muted       = Array.from({ length: CHANNELS }, () => false);

  // 2) clear container
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  // 3) end drag on mouseup
  document.addEventListener('mouseup', () => {
    if (isDragging && dragOccurred) {
      const from = Math.min(dragStart, dragEnd),
            to   = Math.max(dragStart, dragEnd);
      for (let s = from; s <= to; s++) {
        gridState[dragRow][s] = true;
      }
    }
    isDragging = dragOccurred = false;
    dragRow = dragStart = dragEnd = null;
    updateConnectedStyles(container);
  });

  // 4) build rows
  instrumentTypes.forEach((type, row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row flex items-center';

    // ─── fixed controls ───
    const ctrl = document.createElement('div');
    ctrl.className = 'row-controls flex-shrink-0 flex items-center gap-1';

    // instrument select
    const sel = document.createElement('select');
    sel.className = 'instrument-select';
    INSTRUMENT_OPTIONS.forEach(opt => {
      const o = document.createElement('option');
      o.value = o.textContent = opt;
      if (opt === type) o.selected = true;
      sel.append(o);
    });
    sel.addEventListener('change', e =>
      document.dispatchEvent(new CustomEvent('instrumentChanged', {
        detail: { row, type: e.target.value }
      }))
    );
    ctrl.append(sel);

    // mute
    const muteBtn = document.createElement('button');
    muteBtn.className = 'mute-btn';
    muteBtn.addEventListener('click', () => {
      muted[row] = !muted[row];
      muteBtn.classList.toggle('muted', muted[row]);
      document.dispatchEvent(new CustomEvent('rowMuteToggled', {
        detail: { row, muted: muted[row] }
      }));
    });
    ctrl.append(muteBtn);

    // remove
    const rm = document.createElement('button');
    rm.className = 'remove-row-btn';
    rm.textContent = '✖';
    rm.addEventListener('click', e => {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('removeRowClicked', {
        detail: { row }
      }));
    });
    ctrl.append(rm);

    // volume
    const vol = document.createElement('input');
    vol.type      = 'range';
    vol.min       = 0; vol.max = 1; vol.step = 0.01;
    vol.value     = volumeState[row];
    vol.className = 'volume-slider';
    vol.addEventListener('input', e =>
      document.dispatchEvent(new CustomEvent('volumeChanged', {
        detail: { row, volume: parseFloat(e.target.value) }
      }))
    );
    ctrl.append(vol);

    rowEl.append(ctrl);

    // ─── scrollable notes ───
    const notesWrapper = document.createElement('div');
    notesWrapper.className = 'notes-wrapper flex overflow-x-auto';
    notesWrapper.style.gap = 'var(--grid-gap)';

    for (let step = 0; step < STEPS; step++) {
      const cell = document.createElement('div');
      cell.className    = 'cell';
      cell.dataset.row  = row;
      cell.dataset.step = step;
      if (gridState[row][step]) {
        cell.classList.add('active');
        cell.textContent = noteState[row][step];
      }

      // --- drag start ---
      cell.addEventListener('mousedown', () => {
        isDragging   = true;
        dragRow      = row;
        dragStart    = step;
        dragEnd      = step;
        dragOccurred = false;
      });

      // --- drag preview ---
      cell.addEventListener('mouseover', () => {
        if (isDragging && dragRow === row) {
          dragOccurred = true;
          dragEnd      = step;
          const from = Math.min(dragStart, dragEnd),
                to   = Math.max(dragStart, dragEnd);
          // clear preview
          for (let s = 0; s < STEPS; s++) {
            if (!gridState[row][s]) {
              const c = notesWrapper.querySelector(`.cell[data-step="${s}"]`);
              c.classList.remove('active');
              c.textContent = '';
            }
          }
          // show preview
          for (let s = from; s <= to; s++) {
            const c = notesWrapper.querySelector(`.cell[data-step="${s}"]`);
            c.classList.add('active');
            c.textContent = noteState[row][s];
          }
        }
      });

      // --- single toggle ---
      cell.addEventListener('click', () => {
        if (!dragOccurred) {
          const on = gridState[row][step];
          gridState[row][step] = !on;

          if (!on) {
            const pitch = noteState[row][step] || "C4";
            noteState[row][step] = pitch;
            cell.classList.add('active');
            cell.textContent = pitch;
          } else {
            noteState[row][step] = null;
            cell.classList.remove('active');
            cell.textContent = '';
          }

          updateConnectedStyles(container);

          // Dispatch a clear, custom event to signal state change
          document.dispatchEvent(new CustomEvent('cellToggled', {
            detail: { row, step, active: gridState[row][step], pitch: noteState[row][step] }
          }));
        }
      });

      // --- edit note ---
      cell.addEventListener('contextmenu', e => {
        e.preventDefault();
        const curr = noteState[row][step];
        const nn   = prompt('Enter note (e.g. C4, A#3):', curr);
        if (nn) {
          noteState[row][step] = nn;
          if (gridState[row][step]) cell.textContent = nn;
        }
      });
      
      notesWrapper.append(cell);
    }

    rowEl.append(notesWrapper);
    container.append(rowEl);
  });

  // 5) add‐row button
  const add = document.createElement('div');
  add.className = 'add-row';
  add.textContent = '+';
  add.addEventListener('click', () =>
    document.dispatchEvent(new Event('addRowClicked'))
  );
  container.append(add);

  updateConnectedStyles(container);
}

/**
 * Only runs of length ≥ 2 get chained borders.
 */
function updateConnectedStyles(container) {
  // clear old
  container.querySelectorAll('.cell')
           .forEach(c => c.classList.remove('connected-left','connected-right'));

  for (let row = 0; row < CHANNELS; row++) {
    let step = 0;
    while (step < STEPS) {
      if (!gridState[row][step]) { step++; continue; }
      let len = 1;
      while (step + len < STEPS && gridState[row][step + len]) len++;
      if (len > 1) {
        // start
        container.querySelector(`.cell[data-row="${row}"][data-step="${step}"]`)
                 .classList.add('connected-right');
        // interior
        for (let i = 1; i < len-1; i++) {
          container.querySelector(`.cell[data-row="${row}"][data-step="${step+i}"]`)
                   .classList.add('connected-left','connected-right');
        }
        // end
        container.querySelector(`.cell[data-row="${row}"][data-step="${step+len-1}"]`)
                 .classList.add('connected-left');
      }
      step += len;
    }
  }
}

/**
 * Highlight the given column (step) and scroll it into view.
 */
function highlightStep(step) {
  // 1) remove old highlight
  document.querySelectorAll('.cell.current-step')
          .forEach(c => c.classList.remove('current-step'));

  // 2) add highlight to every cell in this column
  const cells = document.querySelectorAll(`.cell[data-step="${step}"]`);
  cells.forEach(c => c.classList.add('current-step'));

  // 3) absolutely recenter that column in the scrollable grid
  const grid = document.getElementById('grid');
  if (!grid || cells.length === 0) return;

  // pick the first cell in this column
  const cell = cells[0];

  // compute the ideal scrollLeft so that the cell is centered
  const gridWidth   = grid.clientWidth;
  const cellCenter  = cell.offsetLeft + cell.clientWidth / 2;
  const targetScroll = Math.max(0, cellCenter - gridWidth / 2);

  // overwrite any user scroll and smoothly move there
  grid.scrollTo({ left: targetScroll, behavior: 'smooth' });
}

// wire up the event
document.addEventListener('stepChanged', e => {
  highlightStep(e.detail.step);
});

/** Clears all active steps. */
export function clearGrid() {
  gridState.forEach(r => r.fill(false));
  document.querySelectorAll('.cell')
    .forEach(c => {
      c.classList.remove('active','connected-left','connected-right');
      c.textContent = '';
    });
}

export function applyComposition(composition) {
  if (!composition || !Array.isArray(composition.channels)) {
    console.error("Invalid composition data:", composition);
    return;
  }

  const channels = composition.channels;
  const numChannels = channels.length;

  // Resize globals
  window.CHANNELS = numChannels;
  window.STEPS = channels[0]?.patternLength || 16;

  // Reset arrays
  gridState.length = 0;
  noteState.length = 0;
  volumeState.length = 0;
  muted.length = 0;

  for (let i = 0; i < numChannels; i++) {
    const channel = channels[i];
    const row = new Array(STEPS).fill(false);
    const notes = new Array(STEPS).fill(null);

    for (const note of channel.notes) {
      const { step, pitch } = note;
      if (step >= 0 && step < STEPS) {
        row[step] = true;
        notes[step] = pitch;
      }
    }

    gridState.push(row);
    noteState.push(notes);
    volumeState.push(1.0); // Default; or set from note volume averages if needed
    muted.push(false);
  }

  // Optional: re-render grid UI after applying
  if (typeof window.build === 'function') {
    window.build();
  }

  console.log("✅ Composition applied to grid:", composition.title);
}