// audioExport.js
import { createVoices }  from './voices.js';
import { initSequencer } from './sequencer.js';
const Tone = window.Tone;

export function exportAudio({
  gridState,
  noteState,
  instrumentNames,
  STEPS,
  bpmInput,
  lastGeneratedTitle
}) {
  return Tone.start().then(() => {
    // reset transport
    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    Tone.Transport.bpm.value = bpmInput;

    // rebuild voices + sequencer
    const voiceRows = createVoices(instrumentNames);
    initSequencer(voiceRows.map(vr => vr.trigger), bpmInput);

    // set up recorder on master output
    const recorder = new Tone.Recorder();
    Tone.Destination.connect(recorder);

    // compute exact loop end time
    const secPerBeat  = 60 / bpmInput;
    const stepDur     = secPerBeat / 4;           // 16th notes
    const loopEndTime = STEPS * stepDur;

    // schedule stop + download _before_ starting
    Tone.Transport.scheduleOnce(async (time) => {
      // stop transport at that exact time
      Tone.Transport.stop(time);

      // stop recorder and download
      const wavBlob = await recorder.stop();
      const url     = URL.createObjectURL(wavBlob);
      const a       = document.createElement('a');
      a.href        = url;
      a.download    = `${lastGeneratedTitle || 'composition'}.wav`;
      a.click();
    }, loopEndTime);

    // now start recording & playback
    recorder.start();
    Tone.Transport.start();
  });
}
