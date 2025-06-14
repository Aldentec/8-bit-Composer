// audioExport.js
import { createVoices }  from './voices.js';
import { initSequencer } from './sequencer.js';
const Tone = window.Tone;

/**
 * Plays and records exactly one loop, then downloads a WAV.
 * Returns a Promise that resolves when download is done.
 */
export function exportAudio({
  gridState,
  noteState,
  instrumentNames,
  STEPS,
  bpmInput,
  lastGeneratedTitle
}) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1) Unlock & reset
      await Tone.start();
      Tone.Transport.cancel();
      Tone.Transport.position = 0;
      Tone.Transport.bpm.value = bpmInput;

      // 2) Rebuild voices & sequencer
      const voiceRows = createVoices(instrumentNames);
      initSequencer(voiceRows.map(vr => vr.trigger), bpmInput);

      // 3) Set up recorder
      const recorder = new Tone.Recorder();
      Tone.Destination.connect(recorder);

      // 4) Start recording & playback
      recorder.start();
      Tone.Transport.start();

      // 5) Compute exact loop end time
      const secPerBeat   = 60 / bpmInput;
      const stepDuration = secPerBeat / 4;           // 16th notes
      const loopEndTime  = STEPS * stepDuration;

      // 6) Schedule the stop+download
      Tone.Transport.scheduleOnce(async (time) => {
        // stop transport right on time
        Tone.Transport.stop(time);

        try {
          // stop recorder & get WAV Blob
          const wavBlob = await recorder.stop();

          // download
          const url = URL.createObjectURL(wavBlob);
          const a   = document.createElement('a');
          a.href    = url;
          a.download= `${lastGeneratedTitle || 'composition'}.wav`;
          a.click();

          resolve();
        } catch (err) {
          reject(err);
        }
      }, loopEndTime);

    } catch (err) {
      reject(err);
    }
  });
}
