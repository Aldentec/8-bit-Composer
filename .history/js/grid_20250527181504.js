// js/grid.js
export const STEPS    = 16;
export const CHANNELS = 4;

export const gridState = Array.from(
  { length: CHANNELS },
  () => Array(STEPS).fill(false)
);

export function initGrid(containerId, instrumentNames = []) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  for (let row = 0; row < CHANNELS; row++) {
    // create a row wrapper
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';

    // 1) label cell
    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = instrumentNames[row] || '';
    rowEl.append(label);

    // 2) sixteen step-cells
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
  }
}
