let controls;

export function initControls() {
  controls = {
    playBtn:    document.getElementById('play'),
    pauseBtn:   document.getElementById('pause'),
    stopBtn:    document.getElementById('stop'),
    loopBtn:    document.getElementById('loop-btn'),
    clearBtn:   document.getElementById('clear'),
    exportBtn:  document.getElementById('export'),
    resetBtn:   document.getElementById('reset-btn'),
    stepsIn:    document.getElementById('steps-input'),
    bpmIn:      document.getElementById('bpm-input'),
    genBtn:     document.getElementById('generate-btn'),
    genTextarea:document.getElementById('generate-prompt'),
    genStatus:  document.getElementById('generate-status'),
  };
}

export function getControls() {
  return controls;
}
