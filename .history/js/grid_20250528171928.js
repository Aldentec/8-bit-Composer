// js/grid.js

// Sequencer dimensions and state
export let STEPS       = 16;
export let CHANNELS    = 0;
export let gridState   = [];   // boolean on/off per [row][step]
export let noteState   = [];   // note string per [row][step]
export let volumeState = [];   // 0.0–1.0 per [row]

// dragging state
let isDragging    = false;
let dragRow       = null;
let dragStart     = null;
let dragEnd       = null;
let dragOccurred  = false;

/** Master list of instrument types. */
export const INSTRUMENT_OPTIONS = [
  'square','triangle','sawtooth','pulse25','pulse50','pulse75',
  'fmsynth','amsynth','metal','membrane','noise-white','noise-pink',
  'drum-kick','drum-snare','drum-tom','drum-hat'
];

/**
 * Renders the whole grid.
 */
export function initGrid(containerId, instrumentTypes = [], steps = 16) {
  // preserve old state
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

  // end drag on mouseup
  document.addEventListener('mouseup', () => {
    if (isDragging && dragOccurred) {
      const from = Math.min(dragStart, dragEnd);
      const to   = Math.max(dragStart, dragEnd);
      for (let s = from; s <= to; s++) {
        gridState[dragRow][s] = true;
      }
    }
    isDragging   = false;
    dragRow      = null;
    dragStart = dragEnd = null;
    dragOccurred = false;
    updateConnectedStyles(container);
  });

  instrumentTypes.forEach((type, row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    // dropdown 6rem, remove 2rem, slider 4rem, then STEPS×2rem
    rowEl.style.gridTemplateColumns = `6rem 2rem 4rem repeat(${STEPS}, 2rem)`;

    // instrument dropdown
    const sel = document.createElement('select');
    sel.className = 'instrument-select';
    INSTRUMENT_OPTIONS.forEach(optType => {
      const o = document.createElement('option');
      o.value = o.textContent = optType;
      if (optType === type) o.selected = true;
      sel.append(o);
    });
    sel.addEventListener('change', e => {
      document.dispatchEvent(new CustomEvent('instrumentChanged', {
        detail: { row, type: e.target.value }
      }));
    });
    rowEl.append(sel);

    // remove button
    const rm = document.createElement('button');
    rm.className = 'remove-row-btn';
    rm.textContent = '✖';
    rm.addEventListener('click', e => {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('removeRowClicked', {
        detail: { row }
      }));
    });
    rowEl.append(rm);

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

      // start drag or single toggle
      cell.addEventListener('mousedown', () => {
        isDragging = true;
        dragRow    = row;
        dragStart  = step;
        dragEnd    = step;
        dragOccurred = false;
      });
      cell.addEventListener('mouseover', () => {
        if (isDragging && row === dragRow) {
          dragOccurred = true;
          dragEnd = step;
          // preview
          const from = Math.min(dragStart, dragEnd);
          const to   = Math.max(dragStart, dragEnd);
          for (let s = 0; s < STEPS; s++) {
            const c = rowEl.querySelector(`.cell[data-step="${s}"]`);
            if (gridState[row][s]) continue;
            c.classList.remove('active');
            c.textContent = '';
          }
          for (let s = from; s <= to; s++) {
            const c = rowEl.querySelector(`.cell[data-step="${s}"]`);
            c.classList.add('active');
            c.textContent = noteState[row][s];
          }
        }
      });
      cell.addEventListener('click', () => {
        if (!dragOccurred) {
          const on = gridState[row][step];
          gridState[row][step] = !on;
          cell.classList.toggle('active', !on);
          cell.textContent = !on ? noteState[row][step] : '';
          updateConnectedStyles(container);
        }
      });
      cell.addEventListener('contextmenu', e => {
        e.preventDefault();
        const curr = noteState[row][step];
        const nn = prompt('Enter note (e.g. C4, A#3):', curr);
        if (nn) {
          noteState[row][step] = nn;
          if (gridState[row][step]) cell.textContent = nn;
        }
      });
      rowEl.append(cell);
    }

    container.append(rowEl);
  });

  // add-row
  const add = document.createElement('div');
  add.className = 'add-row';
  add.textContent = '➕';
  add.addEventListener('click', () => {
    document.dispatchEvent(new Event('addRowClicked'));
  });
  container.append(add);

  updateConnectedStyles(container);
}

/**
 * Only runs of 2+ cells get chained borders.
 */
function updateConnectedStyles(container) {
  container.querySelectorAll('.cell').forEach(c => {
    c.classList.remove('connected-left','connected-right');
  });

  for (let row = 0; row < CHANNELS; row++) {
    let step = 0;
    while (step < STEPS) {
      if (!gridState[row][step]) { step++; continue; }
      let len = 1;
      while (step + len < STEPS && gridState[row][step + len]) len++;
      if (len > 1) {
        // start
        container
          .querySelector(`.cell[data-row="${row}"][data-step="${step}"]`)
          .classList.add('connected-right');
        // middle
        for (let i = 1; i < len - 1; i++) {
          container
            .querySelector(`.cell[data-row="${row}"][data-step="${step + i}"]`)
            .classList.add('connected-left','connected-right');
        }
        // end
        container
          .querySelector(`.cell[data-row="${row}"][data-step="${step+len-1}"]`)
          .classList.add('connected-left');
      }
      step += len;
    }
  }
}

export function clearGrid() {
  gridState.forEach(r=>r.fill(false));
  document.querySelectorAll('.cell').forEach(c => {
    c.classList.remove('active','connected-left','connected-right');
    c.textContent = '';
  });
}
