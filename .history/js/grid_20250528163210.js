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
 *  • dropdown + remove-row + volume slider + STEPS cells per row
 *  • supports click-and-drag to stretch notes across multiple steps
 *  • merges old grid/note/volume state when rows or steps change
 */
export function initGrid(containerId, instrumentTypes = [], steps = 16) {
  // merge previous state
  const oldG = gridState, oldN = noteState, oldV = volumeState;
  const oldR = oldG.length, oldC = oldG[0]?.length || 0;

  CHANNELS = instrumentTypes.length;
  STEPS    = steps;

  // rebuild on/off and note arrays
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
  // rebuild per-row volumes (default to 0.8)
  volumeState = Array.from({ length: CHANNELS }, (_, r) =>
    r < oldV.length ? oldV[r] : 0.8
  );

  const container = document.getElementById(containerId);
  container.innerHTML = '';

  // end drag on mouseup anywhere
  document.addEventListener('mouseup', () => {
    isDragging = false;
    dragRow = null;
    dragStart = null;
  });

  instrumentTypes.forEach((initialType, row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    // dropdown | remove | slider | STEPS cells
    rowEl.style.gridTemplateColumns = `auto auto auto repeat(${STEPS}, 2rem)`;

    // 1) Instrument select
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

    // 2) Remove-row button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-row-btn';
    removeBtn.textContent = '✖';
    removeBtn.title = 'Remove row';
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('removeRowClicked', {
        detail: { row }
      }));
    });
    rowEl.append(removeBtn);

    // 3) Volume slider
    const vol = document.createElement('input');
    vol.type      = 'range';
    vol.min       = 0;
    vol.max       = 1;
    vol.step      = 0.01;
    vol.value     = volumeState[row];
    vol.className = 'volume-slider';
    vol.title     = 'Volume';
    vol.addEventListener('input', e => {
      document.dispatchEvent(new CustomEvent('volumeChanged', {
        detail: { row, volume: parseFloat(e.target.value) }
      }));
    });
    rowEl.append(vol);

    // 4) Sequencer cells
    for (let step = 0; step < STEPS; step++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row  = row;
      cell.dataset.step = step;
      // restore UI if previously active
      if (gridState[row][step]) {
        cell.classList.add('active');
        cell.textContent = noteState[row][step];
      }

      // mousedown: start stretch
      cell.addEventListener('mousedown', () => {
        isDragging = true;
        dragRow    = row;
        dragStart  = step;
        // activate this cell
        gridState[row][step] = true;
        cell.classList.add('active');
        cell.textContent = noteState[row][step];
      });

      // mouseover: if dragging in same row, stretch
      cell.addEventListener('mouseover', () => {
        if (isDragging && dragRow === row) {
          const from = Math.min(dragStart, step);
          const to   = Math.max(dragStart, step);
          for (let s = from; s <= to; s++) {
            gridState[row][s] = true;
            const c = container.querySelector(`.cell[data-row="${row}"][data-step="${s}"]`);
            c.classList.add('active');
            c.textContent = noteState[row][s];
          }
        }
      });

      // click: toggle single cell when not dragging
      cell.addEventListener('click', e => {
        if (!isDragging) {
          if (!gridState[row][step]) {
            gridState[row][step] = true;
            cell.classList.add('active');
            cell.textContent = noteState[row][step];
          } else {
            gridState[row][step] = false;
            cell.classList.remove('active');
            cell.textContent = '';
          }
        }
      });

      // right-click: edit note
      cell.addEventListener('contextmenu', e => {
        e.preventDefault();
        const current = noteState[row][step];
        const newNote = prompt('Enter note (e.g. C4, A#3):', current);
        if (newNote) {
          noteState[row][step] = newNote;
          if (gridState[row][step]) cell.textContent = newNote;
        }
      });

      rowEl.append(cell);
    }

    container.append(rowEl);
  });

  // ➕ Add-row button
  const addRowEl = document.createElement('div');
  addRowEl.className = 'add-row';
  addRowEl.textContent = '➕';
  addRowEl.title = 'Add a row';
  addRowEl.addEventListener('click', () => {
    document.dispatchEvent(new Event('addRowClicked'));
  });
  container.append(addRowEl);
}

/**
 * Clears all active steps in both state and UI.
 */
export function clearGrid() {
  gridState.forEach(row => row.fill(false));
  document.querySelectorAll('.cell.active')
    .forEach(cell => {
      cell.classList.remove('active');
      cell.textContent = '';
    });
}
