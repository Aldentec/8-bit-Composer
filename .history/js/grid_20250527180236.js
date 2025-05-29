export const STEPS    = 16;
export const CHANNELS = 4;

// gridState[row][step]
export const gridState = Array.from(
  { length: CHANNELS },
  () => Array(STEPS).fill(false)
);

export function initGrid(containerId) {
  const gridEl = document.getElementById(containerId);
  gridEl.innerHTML = '';
  for (let row = 0; row < CHANNELS; row++) {
    for (let step = 0; step < STEPS; step++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row  = row;
      cell.dataset.step = step;
      cell.addEventListener('click', () => {
        gridState[row][step] = !gridState[row][step];
        cell.classList.toggle('active', gridState[row][step]);
      });
      gridEl.append(cell);
    }
  }
}
