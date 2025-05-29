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
  'square',
  'triangle',
  'sawtooth',
  'pulse25',
  'pulse50',
  'pulse75',
  'fmsynth',
  'amsynth',
  'metal',
  'membrane',
  'noise-white',
  'noise-pink',
  'drum-kick',
  'drum-snare',
  'drum-tom',
  'drum-hat'
];

/**
 * Renders a scrollable sequencer grid with:
 *  • a dropdown per row for instrument selection
 *  • clickable cells that toggle on/off and show the current note
 *  • right-click on a cell to change its note (e.g. "C4", "A#3")
 *  • a “➕” button below to add more rows
 *
 * @param {string} containerId       id of the <div> to fill
 * @param {string[]} instrumentTypes initial instrument type per row
 * @param {number} steps             number of columns
 */
export function initGrid(containerId, instrumentTypes = [], steps = 16) {
  CHANNELS = instrumentTypes.length;
  STEPS    = steps;

  // rebuild on/off state and default notes (C4)
  gridState = Array.from(
    { length: CHANNELS },
    () => Array(STEPS).fill(false)
  );
  noteState = Array.from(
    { length: CHANNELS },
    () => Array(STEPS).fill('C4')
  );

  const container = document.getElementById(containerId);
  container.innerHTML = '';

  instrumentTypes.forEach((initialType, row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    // dropdown + STEPS cells
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
      cell.textContent  = ''; // note label

      // left-click: toggle on/off
      cell.addEventListener('click', () => {
        gridState[row][step] = !gridState[row][step];
        cell.classList.toggle('active', gridState[row][step]);
        cell.textContent = gridState[row][step]
          ? noteState[row][step]
          : '';
      });

      // right-click: change note
      cell.addEventListener('contextmenu', e => {
        e.preventDefault();
        const current = noteState[row][step];
        const newNote = prompt(
          'Enter note (e.g. C4, A#3):',
          current
        );
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
