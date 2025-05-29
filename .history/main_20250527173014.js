// 1–5: grid setup (you should already have this)
const STEPS = 16;
const gridState = Array(STEPS).fill(false);
const gridEl = document.getElementById('grid');
for (let i = 0; i < STEPS; i++) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.dataset.step = i;
  cell.addEventListener('click', () => {
    gridState[i] = !gridState[i];
    cell.classList.toggle('active', gridState[i]);
  });
  gridEl.append(cell);
}

// ─── Step 6: Create your single square-wave voice ───
const osc = new Tone.Oscillator(440, 'square').toDestination();

// ─── Step 7: Schedule the sequencer ───
let cursor = 0;
Tone.Transport.bpm.value = 120;
Tone.Transport.scheduleRepeat((time) => {
  if (gridState[cursor]) {
    osc.frequency.setValueAtTime(440, time);
    osc.start(time);
    osc.stop(time + 0.1);
  }
  cursor = (cursor + 1) % STEPS;
}, '16n');

// ─── Step 8: Wire up Play/Pause ───
const btn = document.getElementById('play');
btn.addEventListener('click', async () => {
  await Tone.start();            // unlock audio on first gesture
  if (Tone.Transport.state === 'started') {
    Tone.Transport.stop();
    btn.textContent = '▶️ Play';
  } else {
    cursor = 0;                  // reset to step 0
    Tone.Transport.start();
    btn.textContent = '⏸️ Pause';
  }
});
