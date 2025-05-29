// these will be set when initGrid runs
export let STEPS = 16;
export let CHANNELS = 0;

// gridState[row][step] = boolean
export let gridState = [];

/**
 * Renders a labeled, scrollable sequencer grid.
 *
 * @param {string} containerId       id of the <div> to fill
 * @param {string[]} instrumentNames names for each row
 * @param {number} steps             number of columns (length of your song)
 */
export function initGrid(containerId, instrumentNames = [], steps = 16) {
  CHANNELS = instrumentNames.length;
  STEPS    = steps;

  // rebuild state
  gridState = Array.from(
    { length: CHANNELS },
    () => Array(STEPS).fill(false)
  );

  const container = document.getElementById(containerId);
  container.innerHTML = '';

  instrumentNames.forEach((name, row) => {
    // row wrapper: label + STEP cells
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    // dynamically size columns: 4.5rem for the label, then STEPS × 2rem
    rowEl.style.gridTemplateColumns = `4.5rem repeat(${STEPS}, 2rem)`;

    // instrument label
    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = name || '';
    rowEl.append(label);

    // sequencer steps
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
  // reset state
  gridState.forEach(rowArr => rowArr.fill(false));

  // reset UI
  document
    .querySelectorAll('.cell.active')
    .forEach(cell => cell.classList.remove('active'));
}
