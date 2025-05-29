// js/grid.js

// Sequencer dimensions and state (set in initGrid)
export let STEPS       = 16;
export let CHANNELS    = 0;
export let gridState   = [];   // boolean on/off per [row][step]
export let noteState   = [];   // note string per [row][step]
export let volumeState = [];   // 0.0–1.0 per [row]

// drag state for stretching notes
let isDragging = false;
let dragRow = null;
let dragStart = null;
let dragEnd = null;
let dragOccurred = false;

/**
 * A master list of all available instrument types for the dropdowns.
 */
export const INSTRUMENT_OPTIONS = [
  'square','triangle','sawtooth','pulse25','pulse50','pulse75',
  'fmsynth','amsynth','metal','membrane','noise-white','noise-pink',
  'drum-kick','drum-snare','drum-tom','drum-hat'
];

/**
 * Renders the sequencer:
 *  • dropdown + remove + volume + cells per row
 *  • click‐and‐drag to stretch notes
 *  • single click for toggling one cell
 *  • visual “connected” classes on active runs
 */
export function initGrid(containerId, instrumentTypes = [], steps = 16) {
  // merge old state
  const oldG = gridState, oldN = noteState, oldV = volumeState;
  const oldR = oldG.length, oldC = oldG[0]?.length || 0;

  CHANNELS = instrumentTypes.length;
  STEPS    = steps;

  gridState = Array.from({ length: CHANNELS }, (_, r) =>
    Array.from({ length: STEPS }, (_, c) =>
      r < oldR && c < oldC ? oldG[r][c] : false
    )
  );
  noteState = Array.from({ length: CHANNELS }, (_, r) =>
    Array.from({ length: STEPS }, (_, c) =>
      r < oldR && c < oldC ? oldN[r][c] : 'C4'
    )
  );
  volumeState = Array.from({ length: CHANNELS }, (_, r) =>
    r < oldV.length ? oldV[r] : 0.8
  );

  const container = document.getElementById(containerId);
  container.innerHTML = '';

  // end any drag on mouseup anywhere
  document.addEventListener('mouseup', () => {
    if (isDragging && dragOccurred) {
      // on drag end: commit the range
      const from = Math.min(dragStart, dragEnd);
      const to   = Math.max(dragStart, dragEnd);
      for (let s = from; s <= to; s++) {
        gridState[dragRow][s] = true;
      }
    }
    isDragging = false;
    dragRow = null;
    dragStart = null;
    dragEnd = null;
    dragOccurred = false;
    // after drag ends, refresh connected styles
    updateConnectedStyles(container);
  });

  instrumentTypes.forEach((initialType, row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    rowEl.style.gridTemplateColumns = `auto auto auto repeat(${STEPS}, 2rem)`;

    // dropdown
    const select = document.createElement('select');
    select.className = 'instrument-select';
    INSTRUMENT_OPTIONS.forEach(type => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = type;
      if (type === initialType) opt.selected = true;
      select.append(opt);
    });
    select.addEventListener('change', e => {
      document.dispatchEvent(new CustomEvent('instrumentChanged', {
        detail: { row, type: e.target.value }
      }));
    });
    rowEl.append(select);

    // remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-row-btn';
    removeBtn.textContent = '✖';
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('removeRowClicked', {
        detail: { row }
      }));
    });
    rowEl.append(removeBtn);

    // volume slider
    const vol = document.createElement('input');
    vol.type = 'range';
    vol.min = 0; vol.max = 1; vol.step = 0.01;
    vol.value = volumeState[row];
    vol.className = 'volume-slider';
    vol.addEventListener('input', e => {
      document.dispatchEvent(new CustomEvent('volumeChanged', {
        detail: { row, volume: parseFloat(e.target.value) }
      }));
    });
    rowEl.append(vol);

    // cells
    for (let step = 0; step < STEPS; step++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = row;
      cell.dataset.step = step;
      if (gridState[row][step]) {
        cell.classList.add('active');
        cell.textContent = noteState[row][step];
      }

      // mousedown: begin drag or single toggle
      cell.addEventListener('mousedown', () => {
        isDragging = true;
        dragRow    = row;
        dragStart  = step;
        dragEnd    = step;
        dragOccurred = false;
      });

      // mouseover: if dragging same row, mark drag
      cell.addEventListener('mouseover', () => {
        if (isDragging && row === dragRow) {
          dragOccurred = true;
          dragEnd = step;
          // preview highlight
          const from = Math.min(dragStart, dragEnd);
          const to   = Math.max(dragStart, dragEnd);
          // first clear preview on this row
          for (let s = 0; s < STEPS; s++) {
            const c = rowEl.querySelector(`.cell[data-row="${row}"][data-step="${s}"]`);
            if (gridState[row][s]) continue;
            c.classList.remove('active');
            c.textContent = '';
          }
          // then preview active cells
          for (let s = from; s <= to; s++) {
            const c = rowEl.querySelector(`.cell[data-row="${row}"][data-step="${s}"]`);
            c.classList.add('active');
            c.textContent = noteState[row][s];
          }
        }
      });

      // click: if no drag, toggle single cell
      cell.addEventListener('click', () => {
        if (!dragOccurred) {
          const isOn = gridState[row][step];
          gridState[row][step] = !isOn;
          cell.classList.toggle('active', !isOn);
          cell.textContent = !isOn ? noteState[row][step] : '';
          updateConnectedStyles(container);
        }
      });

      // right-click edit note
      cell.addEventListener('contextmenu', e => {
        e.preventDefault();
        const current = noteState[row][step];
        const newNote = prompt('Enter note (e.g. C4, A#3):', current);
        if (newNote) {
          noteState[row][step] = newNote;
          if (gridState[row][step]) {
            cell.textContent = newNote;
          }
        }
      });

      rowEl.append(cell);
    }

    container.append(rowEl);
  });

  // add-row button
  const addRowEl = document.createElement('div');
  addRowEl.className = 'add-row';
  addRowEl.textContent = '➕';
  addRowEl.addEventListener('click', () => {
    document.dispatchEvent(new Event('addRowClicked'));
  });
  container.append(addRowEl);

  // finally update borders for any pre-existing runs
  updateConnectedStyles(container);
}

/** 
 * Scans all rows & steps and adds 'connected-left' / 'connected-right'
 * to cells in continuous runs, giving a merged visual.
 */
function updateConnectedStyles(container) {
  for (let row = 0; row < CHANNELS; row++) {
    for (let step = 0; step < STEPS; step++) {
      const cell = container.querySelector(`.cell[data-row="${row}"][data-step="${step}"]`);
      if (!cell) continue;
      cell.classList.remove('connected-left', 'connected-right');
      if (gridState[row][step]) {
        if (gridState[row][step - 1]) cell.classList.add('connected-left');
        if (gridState[row][step + 1]) cell.classList.add('connected-right');
      }
    }
  }
}

/**
 * Clears all active steps in both state and UI.
 */
export function clearGrid() {
  gridState.forEach(row => row.fill(false));
  document.querySelectorAll('.cell.active').forEach(cell => {
    cell.classList.remove('active', 'connected-left', 'connected-right');
    cell.textContent = '';
  });
}
