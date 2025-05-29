// define your grid size and state here
export const STEPS    = 16;
export const CHANNELS = 4;

// gridState[row][step] = boolean
export const gridState = Array.from(
  { length: CHANNELS },
  () => Array(STEPS).fill(false)
);

/**
 * Renders a CHANNELS×STEPS grid inside the container,
 * and lets you pass in instrument labels per row.
 */
export function initGrid(containerId, instrumentNames = []) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  for (let row = 0; row < CHANNELS; row++) {
    // optional label
    if (instrumentNames[row]) {
      const label = document.createElement('div');
      label.className = 'row-label';
      label.textContent = instrumentNames[row];
      container.append(label);
    }

    // the cells
    for (let step = 0; step < STEPS; step++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row  = row;
      cell.dataset.step = step;

      cell.addEventListener('click', () => {
        gridState[row][step] = !gridState[row][step];
        cell.classList.toggle('active', gridState[row][step]);
      });

      container.append(cell);
    }
  }
}
