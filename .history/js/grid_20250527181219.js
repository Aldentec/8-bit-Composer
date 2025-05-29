// js/grid.js
import { STEPS, CHANNELS, gridState } from './constants.js';

export function initGrid(containerId, instrumentNames) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  instrumentNames.forEach((name, row) => {
    // create a flex row: label + cells
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';

    // 1) the label
    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = name;
    rowEl.append(label);

    // 2) the cells
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
