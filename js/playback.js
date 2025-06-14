// js/playback.js
import { getControls } from './controls.js';
let controls;
const Tone = window.Tone;  

export function initPlayback(onStepsChange) {
    controls = getControls();
  const {
    playBtn, pauseBtn, stopBtn, loopBtn,
    clearBtn, exportBtn,
    stepsIn, bpmIn
  } = controls;

  let loopEnabled = false;
  let stopId = null;

  playBtn.addEventListener('click', async () => {
    await Tone.start();
    Tone.Transport.stop();
    if (stopId !== null) {
      Tone.Transport.clear(stopId);
      stopId = null;
    }
    Tone.Transport.position = 0;
    const bpm   = Number(bpmIn.value);
    const steps = Number(stepsIn.value);
    Tone.Transport.bpm.value = bpm;

    const stepDur = (60 / bpm) / 4;
    if (loopEnabled) {
      Tone.Transport.loop      = true;
      Tone.Transport.loopStart = 0;
      Tone.Transport.loopEnd   = steps * stepDur;
    } else {
      Tone.Transport.loop = false;
      const loopEnd  = steps * stepDur;
      const stopAt   = Math.max(loopEnd - 0.001, 0);
      stopId = Tone.Transport.scheduleOnce(t => Tone.Transport.stop(t), stopAt);
    }

    Tone.Transport.start();
    playBtn.disabled  = false;
    pauseBtn.disabled = false;
    stopBtn.disabled  = false;
  });

  pauseBtn.addEventListener('click', () => {
    Tone.Transport.pause();
    pauseBtn.disabled = true;
    playBtn.disabled  = false;
    stopBtn.disabled  = false;
  });

  stopBtn.addEventListener('click', () => {
    Tone.Transport.stop();
    Tone.Transport.loop = false;
    Tone.Transport.position = 0;
    stopBtn.disabled  = true;
    playBtn.disabled  = false;
    pauseBtn.disabled = true;
  });

  // Loop toggle
  loopBtn.addEventListener('click', () => {
    loopEnabled = !loopEnabled;
    loopBtn.classList.toggle('active', loopEnabled);
  });

  // Clear grid
  clearBtn.addEventListener('click', () => {
    document.dispatchEvent(new Event('clearGrid'));
    persistState();
    Tone.Transport.stop();
    stopBtn.disabled = true;
    playBtn.disabled = false;
    pauseBtn.disabled = true;
  });

  // Export
  exportBtn.addEventListener('click', () => {
    document.dispatchEvent(new Event('exportAudio'));
  });

  // Steps / BPM changes
  stepsIn.addEventListener('change', () => onStepsChange(Number(stepsIn.value)));
  bpmIn.addEventListener('change', () => Tone.Transport.bpm.value = Number(bpmIn.value));
}

