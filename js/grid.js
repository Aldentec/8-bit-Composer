import { trackActivity } from './analytics.js';

// Sequencer dimensions and state
export let STEPS       = 16;
export let CHANNELS    = 0;
export let gridState   = [];   // boolean on/off per [row][step]
export let noteState   = [];   // note string per [row][step]
export let volumeState = [];   // 0.0–1.0 per [row]
export let muted       = [];   // row‐level mute flags
export let adsrSettings = []; // Array of { attack, decay, sustain, release } per row

// drag/stretch state
let isDragging    = false,
    dragRow       = null,
    dragStart     = null,
    dragEnd       = null,
    dragOccurred  = false;

// Mobile touch support variables
let longPressTimer = null;
let longPressActive = false;
let touchStartPos = null;
let lastTap = 0;
const LONG_PRESS_DURATION = 600; // milliseconds
const TOUCH_MOVE_THRESHOLD = 10; // pixels
const DOUBLE_TAP_DELAY = 500; // milliseconds

/** All possible instruments */
export const INSTRUMENT_OPTIONS = [
  'square','triangle','sawtooth','pulse25','pulse50','pulse75',
  'fmsynth','amsynth','metal',
  'membrane','noise-white','noise-pink',
  'drum-kick','drum-snare','drum-tom','drum-hat',
  'pluck','duosynth','sampler'
];

let lastManualTrackTime = 0;

// Add mobile-friendly CSS styles
function addMobileGridStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .cell.long-press-active {
      background-color: var(--accent) !important;
      color: var(--bg) !important;
      transform: scale(1.1);
      transition: all 0.1s ease;
    }

    .cell {
      touch-action: manipulation;
      user-select: none;
    }

    .notes-wrapper {
      touch-action: manipulation;
    }

    @media (max-width: 768px) {
      .cell {
        min-width: 40px;
        min-height: 40px;
        font-size: 0.6rem;
      }
      
      .notes-wrapper {
        gap: 2px;
      }
    }
  `;
  document.head.appendChild(style);
}

// Clear long press state
function clearLongPress(cell) {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  cell.classList.remove('long-press-active');
  longPressActive = false;
  touchStartPos = null;
}

// Open note editor (mobile-friendly prompt)
function openNoteEditor(cell, row, step) {
  const currentNote = noteState[row][step] || 'C4';
  
  const newNote = prompt(
    `🎵 Edit Note (Row ${row + 1}, Step ${step + 1})\n\nExamples: C4, D#5, F3, A2\n\nCurrent note:`, 
    currentNote
  );
  
  if (newNote && newNote.trim()) {
    noteState[row][step] = newNote.trim();
    if (gridState[row][step]) {
      cell.textContent = newNote.trim();
    }
    
    // Dispatch event for any listeners
    document.dispatchEvent(new CustomEvent('noteChanged', {
      detail: { row, step, note: newNote.trim() }
    }));
  }
}

// Add mobile-friendly touch events to each cell
function addMobileTouchEvents(cell, row, step) {
  // Long press detection
  cell.addEventListener('touchstart', (e) => {
    // Store starting position to detect movement
    touchStartPos = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    
    longPressActive = false;
    
    // Start long press timer
    longPressTimer = setTimeout(() => {
      longPressActive = true;
      
      // Add visual feedback
      cell.classList.add('long-press-active');
      
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Open note editor after brief visual feedback
      setTimeout(() => {
        cell.classList.remove('long-press-active');
        openNoteEditor(cell, row, step);
      }, 100);
      
    }, LONG_PRESS_DURATION);
  });

  cell.addEventListener('touchmove', (e) => {
    if (!touchStartPos) return;
    
    // Calculate distance moved
    const deltaX = Math.abs(e.touches[0].clientX - touchStartPos.x);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartPos.y);
    
    // If user moved finger too much, cancel long press
    if (deltaX > TOUCH_MOVE_THRESHOLD || deltaY > TOUCH_MOVE_THRESHOLD) {
      clearLongPress(cell);
    }
  });

  cell.addEventListener('touchend', (e) => {
    // Prevent click event if long press was triggered
    if (longPressActive) {
      e.preventDefault();
      e.stopPropagation();
      clearLongPress(cell);
      return;
    }
    
    // Double tap detection
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    // Double tap detected (between 100-500ms)
    if (tapLength < DOUBLE_TAP_DELAY && tapLength > 100) {
      e.preventDefault();
      e.stopPropagation();
      openNoteEditor(cell, row, step);
      clearLongPress(cell);
      return;
    }
    
    lastTap = currentTime;
    clearLongPress(cell);
  });

  cell.addEventListener('touchcancel', () => {
    clearLongPress(cell);
  });
}

export function initGrid(containerId, instrumentTypes = [], steps = 16) {
  const oldG = gridState, oldN = noteState, oldV = volumeState;
  const oldR = oldG.length, oldC = oldG[0]?.length || 0;

  CHANNELS = instrumentTypes.length;
  STEPS    = steps;

  gridState   = Array.from({ length: CHANNELS }, (_, r) =>
                  Array.from({ length: STEPS }, (_, c) =>
                    r < oldR && c < oldC ? oldG[r][c] : false ));
  noteState   = Array.from({ length: CHANNELS }, (_, r) =>
                  Array.from({ length: STEPS }, (_, c) =>
                    r < oldR && c < oldC ? oldN[r][c] : 'C4' ));
  volumeState = Array.from({ length: CHANNELS }, (_, r) =>
                  r < oldV.length ? oldV[r] : 0.8 );
  adsrSettings = Array.from({ length: CHANNELS }, (_, r) =>
    adsrSettings[r] ?? { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 }
  );
  muted = Array.from({ length: CHANNELS }, () => false);

  const container = document.getElementById(containerId);
  container.innerHTML = '';

  // Add mobile styles if not already added
  if (!document.querySelector('style[data-mobile-grid]')) {
    addMobileGridStyles();
    document.querySelector('style:last-of-type').setAttribute('data-mobile-grid', 'true');
  }

  document.addEventListener('mouseup', () => {
    if (isDragging && dragOccurred) {
      const from = Math.min(dragStart, dragEnd),
            to   = Math.max(dragStart, dragEnd);
      for (let s = from; s <= to; s++) {
        gridState[dragRow][s] = true;
      }
    }
    isDragging = dragOccurred = false;
    dragRow = dragStart = dragEnd = null;
    updateConnectedStyles(container);
  });

  instrumentTypes.forEach((type, row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row flex items-center gap-2';

    // ─── Instrument Select ───
    const sel = document.createElement('select');
    sel.className = 'instrument-select';
    INSTRUMENT_OPTIONS.forEach(opt => {
      const o = document.createElement('option');
      o.value = o.textContent = opt;
      if (opt === type) o.selected = true;
      sel.append(o);
    });
    sel.addEventListener('change', e =>
      document.dispatchEvent(new CustomEvent('instrumentChanged', {
        detail: { row, type: e.target.value }
      }))
    );
    rowEl.append(sel);

    // ─── Mute ───
    const muteBtn = document.createElement('button');
    muteBtn.className = 'mute-btn';
    muteBtn.addEventListener('click', () => {
      muted[row] = !muted[row];
      muteBtn.classList.toggle('muted', muted[row]);
      document.dispatchEvent(new CustomEvent('rowMuteToggled', {
        detail: { row, muted: muted[row] }
      }));
    });
    rowEl.append(muteBtn);

    // ─── Remove ───
    const rm = document.createElement('button');
    rm.className = 'remove-row-btn';
    rm.textContent = '✖';
    rm.addEventListener('click', e => {
      e.stopPropagation();
      document.dispatchEvent(new CustomEvent('removeRowClicked', {
        detail: { row }
      }));
    });
    rowEl.append(rm);

    // ─── Volume ───
    const vol = document.createElement('input');
    vol.type = 'range';
    vol.min = 0; vol.max = 1; vol.step = 0.01;
    vol.value = volumeState[row];
    vol.className = 'volume-slider w-[60px]';
    vol.addEventListener('input', e =>
      document.dispatchEvent(new CustomEvent('volumeChanged', {
        detail: { row, volume: parseFloat(e.target.value) }
      }))
    );
    rowEl.append(vol);

    // ─── Step Grid ───
    const notesWrapper = document.createElement('div');
    notesWrapper.className = 'notes-wrapper flex overflow-x-auto';
    notesWrapper.style.gap = 'var(--grid-gap)';

    for (let step = 0; step < STEPS; step++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = row;
      cell.dataset.step = step;

      if (gridState[row][step]) {
        cell.classList.add('active');
        cell.textContent = noteState[row][step];
      }

      // Mouse events (existing functionality)
      cell.addEventListener('mousedown', () => {
        isDragging = true;
        dragRow = row;
        dragStart = step;
        dragEnd = step;
        dragOccurred = false;
      });

      cell.addEventListener('mouseover', () => {
        if (isDragging && dragRow === row) {
          dragOccurred = true;
          dragEnd = step;
          const from = Math.min(dragStart, dragEnd),
                to   = Math.max(dragStart, dragEnd);
          for (let s = 0; s < STEPS; s++) {
            if (!gridState[row][s]) {
              const c = notesWrapper.querySelector(`.cell[data-step="${s}"]`);
              c.classList.remove('active');
              c.textContent = '';
            }
          }
          for (let s = from; s <= to; s++) {
            const c = notesWrapper.querySelector(`.cell[data-step="${s}"]`);
            c.classList.add('active');
            c.textContent = noteState[row][s];
          }
        }
      });

      cell.addEventListener('click', () => {
        // Don't process click if it was a long press or double tap
        if (longPressActive) {
          return;
        }

        if (!dragOccurred) {
          const on = gridState[row][step];
          gridState[row][step] = !on;
          if (!on) {
            const pitch = noteState[row][step] || 'C4';
            noteState[row][step] = pitch;
            cell.classList.add('active');
            cell.textContent = pitch;
          } else {
            noteState[row][step] = null;
            cell.classList.remove('active');
            cell.textContent = '';
          }

          updateConnectedStyles(container);
          document.dispatchEvent(new CustomEvent('cellToggled', {
            detail: { row, step, active: gridState[row][step], pitch: noteState[row][step] }
          }));

          const now = Date.now();
          if (now - lastManualTrackTime > 60000) { // Only track once per minute
              trackActivity('manual_compose').catch(console.error);
              lastManualTrackTime = now;
          }
        }
      });

      // Right-click for desktop (existing functionality)
      cell.addEventListener('contextmenu', e => {
        e.preventDefault();
        openNoteEditor(cell, row, step);
      });

      // Add mobile touch events
      addMobileTouchEvents(cell, row, step);

      notesWrapper.append(cell);
    }

    rowEl.append(notesWrapper);
    container.append(rowEl);
  });

  const add = document.createElement('div');
  add.className = 'add-row';
  add.textContent = '+';
  add.addEventListener('click', () =>
    document.dispatchEvent(new Event('addRowClicked'))
  );
  container.append(add);

  updateConnectedStyles(container);
}

/**
 * Only runs of length ≥ 2 get chained borders.
 */
function updateConnectedStyles(container) {
  // clear old
  container.querySelectorAll('.cell')
           .forEach(c => c.classList.remove('connected-left','connected-right'));

  for (let row = 0; row < CHANNELS; row++) {
    let step = 0;
    while (step < STEPS) {
      if (!gridState[row][step]) { step++; continue; }
      let len = 1;
      while (step + len < STEPS && gridState[row][step + len]) len++;
      if (len > 1) {
        // start
        container.querySelector(`.cell[data-row="${row}"][data-step="${step}"]`)
                 .classList.add('connected-right');
        // interior
        for (let i = 1; i < len-1; i++) {
          container.querySelector(`.cell[data-row="${row}"][data-step="${step+i}"]`)
                   .classList.add('connected-left','connected-right');
        }
        // end
        container.querySelector(`.cell[data-row="${row}"][data-step="${step+len-1}"]`)
                 .classList.add('connected-left');
      }
      step += len;
    }
  }
}

/**
 * Highlight the given column (step) and scroll it into view.
 */
function highlightStep(step) {
  // 1) remove old highlight
  document.querySelectorAll('.cell.current-step')
          .forEach(c => c.classList.remove('current-step'));

  // 2) add highlight to every cell in this column
  const cells = document.querySelectorAll(`.cell[data-step="${step}"]`);
  cells.forEach(c => c.classList.add('current-step'));

  // 3) absolutely recenter that column in the scrollable grid
  const grid = document.getElementById('grid');
  if (!grid || cells.length === 0) return;

  // pick the first cell in this column
  const cell = cells[0];

  // compute the ideal scrollLeft so that the cell is centered
  const gridWidth   = grid.clientWidth;
  const cellCenter  = cell.offsetLeft + cell.clientWidth / 2;
  const targetScroll = Math.max(0, cellCenter - gridWidth / 2);

  // overwrite any user scroll and smoothly move there
  grid.scrollTo({ left: targetScroll, behavior: 'smooth' });
}

// wire up the event
document.addEventListener('stepChanged', e => {
  highlightStep(e.detail.step);
});

/** Clears all active steps. */
export function clearGrid() {
  gridState.forEach(r => r.fill(false));
  document.querySelectorAll('.cell')
    .forEach(c => {
      c.classList.remove('active','connected-left','connected-right','long-press-active');
      c.textContent = '';
    });
}

export function applyComposition(composition) {
  if (!composition || !Array.isArray(composition.channels)) {
    console.error("Invalid composition data:", composition);
    return;
  }

  const channels = composition.channels;
  const numChannels = channels.length;

  // Resize globals
  window.CHANNELS = numChannels;
  window.STEPS = channels[0]?.patternLength || 16;

  // Reset arrays
  gridState.length = 0;
  noteState.length = 0;
  volumeState.length = 0;
  muted.length = 0;

  for (let i = 0; i < numChannels; i++) {
    const channel = channels[i];
    const row = new Array(STEPS).fill(false);
    const notes = new Array(STEPS).fill(null);

    for (const note of channel.notes) {
      const { step, pitch } = note;
      if (step >= 0 && step < STEPS) {
        row[step] = true;
        notes[step] = pitch;
      }
    }

    gridState.push(row);
    noteState.push(notes);
    volumeState.push(1.0); // Default; or set from note volume averages if needed
    muted.push(false);
  }

  // Optional: re-render grid UI after applying
  if (typeof window.build === 'function') {
    window.build();
  }

  console.log("✅ Composition applied to grid:", composition.title);
}