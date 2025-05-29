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
 *  • left-click toggles a cell on/off, stamping it with its note (default "C4")
 *  • right-click prompts to edit that cell’s note
 *  • a “➕” button below to add more rows
 *
 * Preserves existing gridState/noteState when rows or steps change.
 *
 * @param {string} containerId       id of the <div> to fill
 * @param {string[]} instrumentTypes initial instrument type per row
 * @param {number} steps             number of columns
 */
export function initGrid(containerId, instrumentTypes = [], steps = 16) {
  // Keep old data to merge
  const oldGrid = gridState;
  const oldNotes = noteState;
  const oldRows = oldGrid.length;
  const oldCols = oldGrid[0]?.length || 0;

  CHANNELS = instrumentTypes.length;
  STEPS    = steps;

  // Build new gridState merging old values
  gridState = Array.from({ length: CHANNELS }, (_, r) =>
    Array.from({ length: STEPS }, (_, c) =>
      r < oldRows && c < oldCols ? oldGrid[r][c] : false
    )
  );
  // Build new noteState merging old notes, defaulting to "C4"
  noteState = Array.from({ length: CHANNELS }, (_, r) =>
    Array.from({ length: STEPS }, (_, c) =>
      r < oldRows && c < oldCols ? oldNotes[r][c] : 'C4'
    )
  );

  const container = document.getElementById(containerId);
  container.innerHTML = '';

  instrumentTypes.forEach((initialType, row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    rowEl.style.gridTemplateColumns = `auto repeat(${STEPS}, 2rem)`;

    // Instrument dropdown
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

    // Sequencer cells
    for (let step = 0; step < STEPS; step++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row  = row;
      cell.dataset.step = step;
      // Restore UI if previously active
      if (gridState[row][step]) {
        cell.classList.add('active');
        cell.textContent = noteState[row][step];
      }

      // Left-click: toggle and stamp note
      cell.addEventListener('click', () => {
        if (!gridState[row][step]) {
          gridState[row][step] = true;
          cell.classList.add('active');
          cell.textContent = noteState[row][step];
        } else {
          gridState[row][step] = false;
          cell.classList.remove('active');
          cell.textContent = '';
        }
      });

      // Right-click: prompt to edit the note
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

  // “➕” Add-row button below the grid
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
  document.querySelectorAll('.cell.active').forEach(cell => {
    cell.classList.remove('active');
    cell.textContent = '';
  });
}
