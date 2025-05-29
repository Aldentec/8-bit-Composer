// 1) Create a test oscillator
const testOsc = new Tone.Oscillator('square', 440).toDestination();
// 2) Wire Play button
document.getElementById('play').addEventListener('click', async () => {
  await Tone.start();                // unlock audio
  if (Tone.Transport.state === 'started') {
    Tone.Transport.stop();
  } else {
    testOsc.start();
    setTimeout(() => testOsc.stop(), 1000);
  }
});
