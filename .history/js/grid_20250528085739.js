// js/grid.js

// Sequencer dimensions and state (will be set in initGrid)
export let STEPS    = 16;
export let CHANNELS = 0;
export let gridState = [];

// Available instrument types
const SOUND_OPTIONS = [
  'square',
  'triangle',
  'noise',
  'drum-kick',
  'drum-snare'
];

/**
 * Renders a labeled, selectable, scrollable sequencer grid.
 *
 * @param {string} containerId       id of the <div> to fill
 * @param {string[]} instrumentNames initial instrument type per row
 * @param {number} steps             number of columns (length of your song)
 */
export function initGrid(containerId, instrumentNames = [], steps = 16) {
  CHANNELS = instrumentNames.length;
  STEPS    = steps;

  // rebuild the on/off state
  gridState = Array.from(
    { length: CHANNELS },
    () => Array(STEPS).fill(false)
  );

  const container = document.getElementById(containerId);
  container.innerHTML = '';

  instrumentNames.forEach((initialType, row) => {
    // wrapper for label + dropdown + cells
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    // layout: label (4.5rem) + dropdown (auto) + STEPS * 2rem
    rowEl.style.gridTemplateColumns = `4.5rem auto repeat(${STEPS}, 2rem)`;

    // 1) Instrument label
    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = `Row ${row + 1}`;
    rowEl.append(label);

    // 2) Dropdown to select instrument
    const select = document.createElement('select');
    select.className = 'instrument-select';
    SOUND_OPTIONS.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      if (type === initialType) option.selected = true;
      select.append(option);
    });
    select.addEventListener('change', e => {
      const newType = e.target.value;
      // notify other parts of the app that this row’s instrument changed
      document.dispatchEvent(new CustomEvent('instrumentChanged', {
        detail: { row, type: newType }
      }));
    });
    rowEl.append(select);

    // 3) Sequencer cells
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
