// js/grid.js

// Sequencer dimensions and state
export let STEPS       = 16;
export let CHANNELS    = 0;
export let gridState   = [];   // boolean on/off per [row][step]
export let noteState   = [];   // note string per [row][step]
export let volumeState = [];   // 0.0–1.0 per [row]
export let muted = [];

// drag/stretch state
let isDragging    = false,
    dragRow       = null,
    dragStart     = null,
    dragEnd       = null,
    dragOccurred  = false;

/** All possible instruments */
export const INSTRUMENT_OPTIONS = [
  'square','triangle','sawtooth','pulse25','pulse50','pulse75',
  'fmsynth','amsynth','metal','membrane','noise-white','noise-pink',
  'drum-kick','drum-snare','drum-tom','drum-hat'
];

/**
 * Renders the grid + controls.
 */
export function initGrid(containerId, instrumentTypes = [], steps = 16) {
  // 1) preserve old state
  const oldG = gridState, oldN = noteState, oldV = volumeState;
  const oldR = oldG.length, oldC = oldG[0]?.length || 0;

  CHANNELS = instrumentTypes.length;
  STEPS    = steps;

  gridState   = Array.from({ length: CHANNELS }, (_, r) =>
                  Array.from({ length: STEPS }, (_, c) =>
                    r<oldR && c<oldC ? oldG[r][c] : false ));
  noteState   = Array.from({ length: CHANNELS }, (_, r) =>
                  Array.from({ length: STEPS }, (_, c) =>
                    r<oldR && c<oldC ? oldN[r][c] : 'C4' ));
  volumeState = Array.from({ length: CHANNELS }, (_, r) =>
                  r<oldV.length ? oldV[r] : 0.8 );

  const container = document.getElementById(containerId);
  container.innerHTML = '';

  // 2) End any drag on mouseup
  document.addEventListener('mouseup', () => {
    if (isDragging && dragOccurred) {
      const from = Math.min(dragStart, dragEnd),
            to   = Math.max(dragStart, dragEnd);
      for (let s = from; s <= to; s++) {
        gridState[dragRow][s] = true;
      }
    }
    isDragging = false;
    dragRow = dragStart = dragEnd = null;
    dragOccurred = false;
    updateConnectedStyles(container);
  });

  // 3) Build each row
  instrumentTypes.forEach((type, row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    rowEl.style.gridTemplateColumns =
      `6rem 3rem 2rem 6rem repeat(${STEPS}, 2rem)`;

    // a) instrument dropdown
    const sel = document.createElement('select');
    sel.className = 'instrument-select';
    INSTRUMENT_OPTIONS.forEach(opt => {
      const o = document.createElement('option');
      o.value = o.textContent = opt;
      if (opt === type) o.selected = true;
      sel.append(o);
    });
    sel.addEventListener('change', e => {
      document.dispatchEvent(new CustomEvent('instrumentChanged', {
        detail: { row, type: e.target.value }
      }));
    });
    rowEl.append(sel);

    // a.5) mute button
    const muteCell = document.createElement('div');
    muteCell.className = 'mute-cell';

    const muteBtn = document.createElement('button');
    muteBtn.className = 'mute-btn';
    muteBtn.textContent = muted[row] ? 'Unmute' : 'Mute';

    muteBtn.addEventListener('click', () => {
      muted[row] = !muted[row];
      voiceRows[row].gainNode.gain.value = muted[row] ? 0 : volumeState[row];
      muteBtn.textContent = muted[row] ? 'Unmute' : 'Mute';
    });

    muteCell.appendChild(muteBtn);
    rowEl.append(muteCell);

    // b) remove-row button
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

    // c) volume slider
    const vol = document.createElement('input');
    vol.type      = 'range';
    vol.min       = 0; vol.max = 1; vol.step = 0.01;
    vol.value     = volumeState[row];
    vol.className = 'volume-slider';
    vol.addEventListener('input', e => {
      document.dispatchEvent(new CustomEvent('volumeChanged', {
        detail: { row, volume: parseFloat(e.target.value) }
      }));
    });
    rowEl.append(vol);

    // d) sequencer cells
    for (let step = 0; step < STEPS; step++) {
      const cell = document.createElement('div');
      cell.className            = 'cell';
      cell.dataset.row          = row;
      cell.dataset.step         = step;
      if (gridState[row][step]) {
        cell.classList.add('active');
        cell.textContent = noteState[row][step];
      }

      // start drag
      cell.addEventListener('mousedown', () => {
        isDragging   = true;
        dragRow      = row;
        dragStart    = step;
        dragEnd      = step;
        dragOccurred = false;
      });

      // preview drag
      cell.addEventListener('mouseover', () => {
        if (isDragging && row === dragRow) {
          dragOccurred = true;
          dragEnd      = step;
          const from = Math.min(dragStart, dragEnd),
                to   = Math.max(dragStart, dragEnd);
          // clear previews
          for (let s = 0; s < STEPS; s++) {
            if (!gridState[row][s]) {
              const c = rowEl.querySelector(`.cell[data-step="${s}"]`);
              c.classList.remove('active');
              c.textContent = '';
            }
          }
          // show preview
          for (let s = from; s <= to; s++) {
            const c = rowEl.querySelector(`.cell[data-step="${s}"]`);
            c.classList.add('active');
            c.textContent = noteState[row][s];
          }
        }
      });

      // single toggle
      cell.addEventListener('click', () => {
        if (!dragOccurred) {
          const on = gridState[row][step];
          gridState[row][step] = !on;
          cell.classList.toggle('active', !on);
          cell.textContent = !on ? noteState[row][step] : '';
          updateConnectedStyles(container);
        }
      });

      // edit note
      cell.addEventListener('contextmenu', e => {
        e.preventDefault();
        const curr = noteState[row][step];
        const nn   = prompt('Enter note (e.g. C4, A#3):', curr);
        if (nn) {
          noteState[row][step] = nn;
          if (gridState[row][step]) cell.textContent = nn;
        }
      });

      rowEl.append(cell);
    }

    container.append(rowEl);
  });

  // e) add-row
  const add = document.createElement('div');
  add.className = 'add-row';
  add.textContent = '➕';
  add.addEventListener('click', () => {
    document.dispatchEvent(new Event('addRowClicked'));
  });
  container.append(add);

  // initial chain visuals
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

/** Clears all active steps. */
export function clearGrid() {
  gridState.forEach(r => r.fill(false));
  document.querySelectorAll('.cell')
    .forEach(c => {
      c.classList.remove('active','connected-left','connected-right');
      c.textContent = '';
    });
}
