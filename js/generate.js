// js/generate.js
import { getControls } from './controls.js';
import { loadComposition, saveComposition } from './storage.js';

export function initGenerate(applyComposition) {
  const { genBtn, genTextarea, genStatus } = getControls();

  genBtn.addEventListener('click', async () => {
    const promptText = genTextarea.value.trim();
    if (!promptText) {
      genStatus.style.color = 'crimson';
      genStatus.textContent = '⚠️ Please enter a prompt.';
      return;
    }

    const currentComp = loadComposition();
    const isEditing = currentComp?.channels?.some(ch => ch.notes?.length > 0);

    genStatus.textContent = '⏳ Sending prompt to AI...';
    genBtn.disabled = true;
    genBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      const response = await fetch('https://lrii6vsy7bs6omqaqewk6dvf540cimqo.lambda-url.us-west-2.on.aws/', {   
    //   const response = await fetch('https://5f2zw4a2xb.execute-api.us-west-2.amazonaws.com/test/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mode: isEditing ? 'edit' : 'new',
            prompt: promptText,
            existingComposition: isEditing ? currentComp : undefined
        }),
      });

      const result = await response.json();

      if (result && result.channels) {
        applyComposition(result);
        saveComposition(result);
        genStatus.style.color = 'green';
        genStatus.textContent = '✅ Composition applied!';
      } else {
        genStatus.style.color = 'crimson';
        genStatus.textContent = '❌ Invalid response from server.';
      }
    } catch (err) {
      genStatus.style.color = 'crimson';
      genStatus.textContent = '❌ Error contacting backend.';
      console.error(err);
    } finally {
      genBtn.disabled = false;
      genBtn.innerHTML = 'Generate';
    }
  });
}
