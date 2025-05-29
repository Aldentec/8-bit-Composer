// js/grid.js

// Sequencer dimensions and state (set in initGrid)
export let STEPS    = 16;
export let CHANNELS = 0;
export let gridState = [];
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
 * Renders a scrollable sequencer grid with a dropdown per row.
 *
 * @param {string} containerId       id of the <div> to fill
 * @param {string[]} instrumentTypes initial instrument type per row
 * @param {number} steps             number of columns
 */
export function initGrid(containerId, instrumentTypes = [], steps = 16) {
  CHANNELS = instrumentTypes.length;
  STEPS    = steps;

  // rebuild the on/off state
  gridState = Array.from(
    { length: CHANNELS },
    () => Array(STEPS).fill(false)
  );

  const container = document.getElementById(containerId);
  container.innerHTML = '';

  instrumentTypes.forEach((initialType, row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    // configure columns: dropdown + STEPS cells
    rowEl.style.gridTemplateColumns = `auto repeat(${STEPS}, 2rem)`;

    // 1) Dropdown to select instrument
    const select = document.createElement('select');
    select.className = 'instrument-select';
    ['square','triangle','noise','drum-kick','drum-snare'].forEach(type => {
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

    // 2) Sequencer step-cells
    for (let step = 0; step < STEPS; step++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row  = row;
      cell.dataset.step = step;
      cell.addEventListener('click', () => {
        gridState[row][step] = !gridState[row][step];
        cell.classList.toggle('active', gridState[row][step]);
      });
      rowEl.append(cell);
    }

    container.append(rowEl);
  });
}

/**
 * Clears all active steps in both state and UI.
 */
export function clearGrid() {
  gridState.forEach(rowArr => rowArr.fill(false));
  document.querySelectorAll('.cell.active')
          .forEach(cell => cell.classList.remove('active'));
}
