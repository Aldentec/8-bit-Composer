// js/grid.js

// Sequencer dimensions and state (set in initGrid)
export let STEPS     = 16;
export let CHANNELS  = 0;
export let gridState = [];  // boolean on/off per [row][step]
export let noteState = [];  // note string per [row][step]

/**
 * Master instrument list for dropdowns.
 */
export const INSTRUMENT_OPTIONS = [
  'square','triangle','sawtooth','pulse25','pulse50','pulse75',
  'fmsynth','amsynth','metal','membrane',
  'noise-white','noise-pink',
  'drum-kick','drum-snare','drum-tom','drum-hat'
];

/**
 * Intervals in semitones for each scale type.
 */
const SCALE_INTERVALS = {
  Major:        [0,2,4,5,7,9,11],
  Minor:        [0,2,3,5,7,8,10],
  Pentatonic:   [0,2,4,7,9],
  Chromatic:    [0,1,2,3,4,5,6,7,8,9,10,11]
};

/**
 * Convert "C#4" -> 61, and vice versa.
 */
function noteToMidi(n) { return Tone.Frequency(n).toMidi(); }
function midiToNote(m) { return Tone.Frequency(m, 'midi').toNote(); }

/**
 * Checks if a given note (eg "C#4") lies in the user-selected key+scale.
 */
function isInScale(note) {
  const key = document.getElementById('key-select').value;       // e.g. "C"
  const scale = document.getElementById('scale-select').value;   // e.g. "Major"
  const rootMidi = noteToMidi(key + '4') % 12;                   // root pitch class
  const intervalClasses = SCALE_INTERVALS[scale] || SCALE_INTERVALS.Major;

  const midi = noteToMidi(note);
  const interval = (midi % 12 - rootMidi + 12) % 12;
  return intervalClasses.includes(interval);
}

/**
 * Renders the sequencer grid, preserving old state when possible.
 */
export function initGrid(containerId, instrumentTypes = [], steps = 16) {
  // merge old state
  const oldG = gridState, oldN = noteState;
  const oldR = oldG.length, oldC = oldG[0]?.length || 0;

  CHANNELS = instrumentTypes.length;
  STEPS    = steps;

  gridState = Array.from({ length: CHANNELS }, (_, r) =>
    Array.from({ length: STEPS }, (_, c) =>
      r < oldR && c < oldC ? oldG[r][c] : false
    )
  );
  noteState = Array.from({ length: CHANNELS }, (_, r) =>
    Array.from({ length: STEPS }, (_, c) =>
      r < oldR && c < oldC ? oldN[r][c] : 'C4'
    )
  );

  const container = document.getElementById(containerId);
  container.innerHTML = '';

  instrumentTypes.forEach((initialType, row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    rowEl.style.gridTemplateColumns = `auto repeat(${STEPS}, 2rem)`;

    // instrument dropdown
    const select = document.createElement('select');
    select.className = 'instrument-select';
    INSTRUMENT_OPTIONS.forEach(type => {
      const o = document.createElement('option');
      o.value = o.textContent = type;
      if (type === initialType) o.selected = true;
      select.append(o);
    });
    select.addEventListener('change', e => {
      document.dispatchEvent(new CustomEvent('instrumentChanged', {
        detail: { row, type: e.target.value }
      }));
    });
    rowEl.append(select);

    // sequencer cells
    for (let step = 0; step < STEPS; step++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row  = row;
      cell.dataset.step = step;
      // restore UI
      if (gridState[row][step]) {
        cell.classList.add('active');
        cell.textContent = noteState[row][step];
      }

      // left-click: toggle on/off, stamping note
      cell.addEventListener('click', () => {
        if (!gridState[row][step]) {
          const note = noteState[row][step];
          if (!isInScale(note)) {
            alert(`${note} is not in ${document.getElementById('key-select').value} ${document.getElementById('scale-select').value} scale`);
            return;
          }
          gridState[row][step] = true;
          cell.classList.add('active');
          cell.textContent = note;
        } else {
          gridState[row][step] = false;
          cell.classList.remove('active');
          cell.textContent = '';
        }
      });

      // right-click: prompt to edit note
      cell.addEventListener('contextmenu', e => {
        e.preventDefault();
        const current = noteState[row][step];
        const newNote = prompt('Enter note (e.g. C4, A#3):', current);
        if (newNote) {
          if (!isInScale(newNote)) {
            alert(`${newNote} is not in ${document.getElementById('key-select').value} ${document.getElementById('scale-select').value} scale`);
            return;
          }
          noteState[row][step] = newNote;
          if (gridState[row][step]) cell.textContent = newNote;
        }
      });

      rowEl.append(cell);
    }

    container.append(rowEl);
  });

  // ➕ Add-row button
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
  gridState.forEach(r => r.fill(false));
  document.querySelectorAll('.cell.active')
    .forEach(c => { c.classList.remove('active'); c.textContent = '' });
}
