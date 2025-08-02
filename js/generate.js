// js/generate.js - Updated to include credit system and fix CORS
import { CreditManager, checkCreditsBeforeGenerate, updateCreditDisplay } from './credits.js';
import { loadComposition, saveComposition } from './storage.js';

let applyCompositionCallback;
const creditManager = new CreditManager();

export function initGenerate(callback) {
  applyCompositionCallback = callback;
  
  const generateBtn = document.getElementById('generate-btn');
  const statusEl = document.getElementById('generate-status');
  
  // Initialize credit display
  initializeCreditDisplay();
  
  generateBtn.addEventListener('click', async () => {
    const prompt = document.getElementById('generate-prompt').value.trim();
    
    if (!prompt) {
      statusEl.style.color = 'crimson';
      statusEl.textContent = '⚠️ Please enter a prompt first.';
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem('accessToken');
    if (!token) {
      statusEl.style.color = 'crimson';
      statusEl.textContent = '⚠️ Please sign in to use AI generation.';
      return;
    }

    // Check credits before proceeding
    const canProceed = await checkCreditsBeforeGenerate(creditManager);
    if (!canProceed) {
      statusEl.style.color = 'crimson';
      statusEl.textContent = '❌ Generation cancelled - insufficient credits.';
      return;
    }

    // Get current composition for editing check
    const currentComp = loadComposition();
    const isEditing = currentComp?.channels?.some(ch => ch.notes?.length > 0);

    // Proceed with generation
    statusEl.textContent = '⏳ Sending prompt to AI...';
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      // Call AI generation endpoint (without Authorization header to avoid CORS)
      const response = await fetch('https://lrii6vsy7bs6omqaqewk6dvf540cimqo.lambda-url.us-west-2.on.aws/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: isEditing ? 'edit' : 'new',
          prompt: prompt,
          existingComposition: isEditing ? currentComp : undefined
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Check for the expected response format
      if (result && result.channels) {
        // Only deduct credit AFTER successful AI generation
        const remainingCredits = await creditManager.useCredit('generate');
        
        // Apply the generated composition
        applyCompositionCallback(result);
        saveComposition(result);
        
        // Update credit display in navbar
        updateCreditDisplay(remainingCredits);
        
        statusEl.style.color = 'green';
        statusEl.textContent = `✅ Generated! (${remainingCredits} credits remaining)`;
      } else {
        throw new Error('Invalid response format - no composition returned');
      }

    } catch (error) {
      console.error('Generation error:', error);
      statusEl.style.color = 'crimson';
      statusEl.textContent = `❌ Generation failed: ${error.message}`;
      
      // Credit is not deducted if generation fails
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = 'Generate';
    }
  });
}

async function initializeCreditDisplay() {
  try {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const credits = await creditManager.getCredits();
      updateCreditDisplay(credits);
    }
  } catch (error) {
    console.error('Failed to load credits:', error);
  }
}