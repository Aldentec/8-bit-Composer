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
 *  • stamping the user’s selected note from #note-input
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
    // columns: dropdown + STEPS cells
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

    // 2) Sequencer cells: click to toggle & stamp note
    for (let step = 0; step < STEPS; step++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row  = row;
      cell.dataset.step = step;
      cell.textContent  = ''; // will show note when active

      cell.addEventListener('click', () => {
        // get the user-chosen note from the global picker
        const note = document.getElementById('note-input').value;

        if (!gridState[row][step]) {
          // turn on & stamp the current note
          gridState[row][step] = true;
          noteState[row][step] = note;
          cell.classList.add('active');
          cell.textContent = note;
        } else {
          // turn off & clear
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
