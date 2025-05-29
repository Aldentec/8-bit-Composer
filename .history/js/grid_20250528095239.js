// js/grid.js

// Sequencer dimensions and state (set in initGrid)
export let STEPS     = 16;
export let CHANNELS  = 0;
export let gridState = [];   // boolean on/off per [row][step]
export let noteState = [];   // note string per [row][step]

/**
 * A master list of all available instrument types for the dropdowns.
 */
export const INSTRUMENT_OPTIONS = [
  'square','triangle','sawtooth','pulse25','pulse50','pulse75',
  'fmsynth','amsynth','metal','membrane','noise-white','noise-pink',
  'drum-kick','drum-snare','drum-tom','drum-hat'
];

/**
 * Renders a scrollable sequencer grid with:
 *  • a dropdown per row for instrument selection
 *  • clickable cells that prompt for a note (e.g. "C4", "A#3")
 *    and toggle on/off, showing the chosen note
 *  • a “➕” button below to add more rows
 *
 * Preserves existing gridState/noteState when steps or rows change.
 *
 * @param {string} containerId       id of the <div> to fill
 * @param {string[]} instrumentTypes initial instrument type per row
 * @param {number} steps             number of columns
 */
export function initGrid(containerId, instrumentTypes = [], steps = 16) {
  // keep old state for merging
  const oldGrid = gridState;
  const oldNotes = noteState;
  const oldRows = oldGrid.length;
  const oldCols = oldGrid[0]?.length || 0;

  CHANNELS = instrumentTypes.length;
  STEPS    = steps;

  // rebuild gridState & noteState, merging old values
  gridState = Array.from({ length: CHANNELS }, (_, r) =>
    Array.from({ length: STEPS }, (_, c) =>
      r < oldRows && c < oldCols
        ? oldGrid[r][c]
        : false
    )
  );
  noteState = Array.from({ length: CHANNELS }, (_, r) =>
    Array.from({ length: STEPS }, (_, c) =>
      r < oldRows && c < oldCols
        ? oldNotes[r][c]
        : 'C4'
    )
  );

  const container = document.getElementById(containerId);
  container.innerHTML = '';

  instrumentTypes.forEach((initialType, row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    rowEl.style.gridTemplateColumns = `auto repeat(${STEPS}, 2rem)`;

    // 1) Instrument dropdown
    const select = document.createElement('select');
    select.className = 'instrument-select';
    INSTRUMENT_OPTIONS.forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      if (type === initialType) opt.selected = true;
      select.append(opt);
    });
    select.addEventListener('change', e => {
      document.dispatchEvent(new CustomEvent('instrumentChanged', {
        detail: { row, type: e.target.value }
      }));
    });
    rowEl.append(select);

    // 2) Sequencer cells
    for (let step = 0; step < STEPS; step++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row  = row;
      cell.dataset.step = step;

      // restore UI from merged state
      if (gridState[row][step]) {
        cell.classList.add('active');
        cell.textContent = noteState[row][step];
      }

      cell.addEventListener('click', () => {
        if (!gridState[row][step]) {
          // prompt for a note when turning on
          const newNote = prompt(
            'Enter note (e.g. C4, A#3):',
            noteState[row][step]
          );
          if (!newNote) return;  // cancel toggling on
          gridState[row][step] = true;
          noteState[row][step] = newNote;
          cell.classList.add('active');
          cell.textContent = newNote;
        } else {
          // toggle off
          gridState[row][step] = false;
          cell.classList.remove('active');
          cell.textContent = '';
        }
      });

      rowEl.append(cell);
    }

    container.append(rowEl);
  });

  // ➕ Add-row button below the grid
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
  gridState.forEach(rowArr => rowArr.fill(false));
  document.querySelectorAll('.cell.active')
    .forEach(cell => {
      cell.classList.remove('active');
      cell.textContent = '';
    });
}
