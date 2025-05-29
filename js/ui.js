export function bindPlayButton(buttonId) {
  const btn = document.getElementById(buttonId);
  btn.addEventListener('click', async () => {
    await Tone.start();  // user gesture → unlock
    if (Tone.Transport.state === 'started') {
      Tone.Transport.stop();
      btn.textContent = '▶️ Play';
    } else {
      Tone.Transport.start();
      btn.textContent = '⏸️ Pause';
    }
  });
}
