// Constants
const STEPS    = 16;
const CHANNELS = 4;

// 1) Build a 2D grid state array
const gridState = Array.from(
  { length: CHANNELS },
  () => Array(STEPS).fill(false)
);

// 2) Render the grid UI
const gridEl = document.getElementById('grid');
gridEl.innerHTML = '';  // ensure it’s empty

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

// 3) Create your four chip voices
const osc1 = new Tone.Oscillator(440, 'square').toDestination();
const osc2 = new Tone.Oscillator(330, 'square').toDestination();
const osc3 = new Tone.Oscillator(220, 'triangle').toDestination();
const noiseSynth = new Tone.NoiseSynth({
  noise:    { type: 'white' },
  envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
}).toDestination();

// 4) Wrap each in a trigger function
const voices = [
  time => { osc1.start(time);       osc1.stop(time + 0.1); },
  time => { osc2.start(time);       osc2.stop(time + 0.1); },
  time => { osc3.start(time);       osc3.stop(time + 0.1); },
  time => { noiseSynth.triggerAttackRelease('16n', time); }
];

// 5) Sequencer scheduling
let cursor = 0;
Tone.Transport.bpm.value = 120;

Tone.Transport.scheduleRepeat((time) => {
  const step = cursor % STEPS;
  voices.forEach((triggerFn, row) => {
    if (gridState[row][step]) {
      triggerFn(time);
    }
  });
  cursor++;
}, '16n');

// 6) Play/Pause button
const btn = document.getElementById('play');
btn.addEventListener('click', async () => {
  await Tone.start();  // unlock audio

  if (Tone.Transport.state === 'started') {
    Tone.Transport.stop();
    btn.textContent = '▶️ Play';
  } else {
    cursor = 0;
    Tone.Transport.start();
    btn.textContent = '⏸️ Pause';
  }
});
