// js/app.js - Complete version with credits integration
const Tone = window.Tone;  
import {
  initGrid, clearGrid, gridState, noteState,
  INSTRUMENT_OPTIONS
} from './grid.js';
import { createVoices }    from './voices.js';
import { initSequencer }   from './sequencer.js';
import { exportAudio }     from './audioExport.js';
import { getControls, initControls } from './controls.js';
import { initPlayback }    from './playback.js';
import { initGenerate }    from './generate.js';
import { saveComposition, loadComposition, clearComposition } from './storage.js';
import { trackActivity } from './analytics.js';
import { signInWithGoogle, signOut, parseTokenFromUrl, isLoggedIn } from './auth/auth.js';
// Import credit system
import { CreditManager, showCreditPurchaseModal, updateCreditDisplay } from './credits.js';
// Add jwt-decode import
import jwtDecode from 'https://cdn.jsdelivr.net/npm/jwt-decode@3.1.2/build/jwt-decode.esm.js';

let controls;
let instrumentNames, muted, trackVolume, voiceRows, triggers, lastTitle = 'composition';
let creditManager;

// This function is used to convert the grid/composition data into JSON to be saved to local storage
function serializeGridToJSON(title = lastTitle, tempo = Number(controls.bpmIn.value)) {
  const composition = {
    title,
    tempo,
    channels: instrumentNames.map((name, rowIndex) => {
      const notes = [];
      gridState[rowIndex].forEach((active, stepIndex) => {
        if (active) {
          notes.push({
            step: stepIndex,
            pitch: noteState[rowIndex][stepIndex] || "C4",
            length: "quarter",
            volume: trackVolume[rowIndex],
          });
        }
      });
      return { name, patternLength: gridState[rowIndex].length, notes };
    }),
  };
  return composition;
}

function persistState() {
  const composition = serializeGridToJSON();
  saveComposition(composition);
}

/**  
 * Redraw grid, wire up observers, re-make voices, re-schedule the Transport  
 */
function build(steps, bpm) {
  // 1) draw the empty grid
  initGrid('grid', instrumentNames, steps);
  
  // 2) make voices & wire volumes
  muted       = instrumentNames.map((_,i) => muted[i]       ?? false);
  trackVolume = instrumentNames.map((_,i) => trackVolume[i] ?? 1.0);
  voiceRows    = createVoices(instrumentNames);
  triggers     = voiceRows.map(r => r.trigger);
  voiceRows.forEach((vr,i) => vr.gainNode.gain.value = muted[i] ? 0 : trackVolume[i]);

  // 3) reset and schedule the Transport
  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.position = 0;
  Tone.Transport.bpm.value = bpm;
  initSequencer(triggers, bpm);

  // 4) reset play/pause UI
  controls.playBtn.disabled  = false;
  controls.pauseBtn.disabled = true;
  controls.stopBtn.disabled  = true;
  
  // 5) Hook up per-row mute buttons
  const rows = document.querySelectorAll('.grid-row');
  rows.forEach((tr, rowIndex) => {
    const muteBtn = tr.querySelector('.mute-btn');
    if (!muteBtn) return;

    muteBtn.classList.toggle('muted', muted[rowIndex]);
    muteBtn.replaceWith(muteBtn.cloneNode(true));
    const freshBtn = tr.querySelector('.mute-btn');

    freshBtn.addEventListener('click', () => {
      muted[rowIndex] = !muted[rowIndex];
      voiceRows[rowIndex].gainNode.gain.value = muted[rowIndex] ? 0 : trackVolume[rowIndex];
      freshBtn.classList.toggle('muted', muted[rowIndex]);
    });
  });
}

function applyComposition(comp) {
  lastTitle = comp.title || lastTitle;
  controls.bpmIn.value   = comp.tempo;
  controls.stepsIn.value = comp.channels[0].patternLength;

  instrumentNames = comp.channels.map(c => c.name);
  muted           = instrumentNames.map(() => false);
  trackVolume     = instrumentNames.map(() => 1.0);

  build(comp.channels[0].patternLength, comp.tempo);

  // fill gridState/noteState & paint cells
  comp.channels.forEach((ch, row) => {
    ch.notes.forEach(n => {
      gridState[row][n.step] = true;
      noteState[row][n.step] = n.pitch;
      const cell = document.querySelector(
        `[data-row="${row}"][data-step="${n.step}"]`
      );
      if (cell) {
        cell.classList.add('active');
        cell.textContent = n.pitch;
      }
    });
  });
}

// Function to track user in DynamoDB
async function trackUser(decodedToken) {
    try {
        console.log('Tracking user in database...', decodedToken);
        
        const userInfo = {
            sub: decodedToken.sub,
            email: decodedToken.email,
            name: decodedToken.name,
            given_name: decodedToken.given_name,
            family_name: decodedToken.family_name,
            picture: decodedToken.picture,
            locale: decodedToken.locale,
            email_verified: decodedToken.email_verified,
            identities: decodedToken.identities,
            aud: decodedToken.aud,
            token_use: decodedToken.token_use,
            auth_time: decodedToken.auth_time,
            iss: decodedToken.iss
        };
        
        // You can add a user tracking endpoint here if needed
        console.log('User info:', userInfo);
        
    } catch (error) {
        console.error('Error tracking user:', error);
        // Don't break the app if tracking fails
    }
}

// Auth setup function with credits integration
function setupAuth() {
    const COGNITO_DOMAIN = 'us-west-2diyeymilb.auth.us-west-2.amazoncognito.com';
    const CLIENT_ID = '6jsljesdvg7748s50lg5ucdi43';
    const REDIRECT_URI = 'https://www.8bitcomposer.com/';

    // Parse token from URL if present - MOVED OUTSIDE waitForElements
    function parseAndSaveTokens() {
        const hash = window.location.hash.substring(1);
        console.log('🔍 Current hash:', hash);
        
        if (!hash) return false;
        
        const params = new URLSearchParams(hash);
        const idToken = params.get('id_token');
        const accessToken = params.get('access_token');
        const error = params.get('error');

        console.log('🔍 Tokens from URL:', {
            idToken: !!idToken,
            accessToken: !!accessToken,
            error: error
        });

        if (error) {
            console.error('Auth error from URL:', error);
            return false;
        }

        if (idToken && accessToken) {
            localStorage.setItem('idToken', idToken);
            localStorage.setItem('accessToken', accessToken);
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('✅ Both tokens saved from URL - idToken:', !!idToken, 'accessToken:', !!accessToken);
            return true;
        } else if (idToken) {
            // Sometimes only idToken is provided, use it as both tokens
            console.log('⚠️ Only idToken received, using as accessToken too');
            localStorage.setItem('idToken', idToken);
            localStorage.setItem('accessToken', idToken);
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('✅ idToken saved and copied to accessToken');
            return true;
        }
        return false;
    }

    // CALL parseAndSaveTokens immediately, before waiting for elements
    parseAndSaveTokens();

    // Function to wait for elements to be available
    function waitForElements(callback, retries = 10) {
        const signinLink = document.getElementById('signin-link');
        const signoutLink = document.getElementById('signout-link');
        const userInfoEl = document.getElementById('user-info');
        const creditContainer = document.getElementById('credit-container');
        const buyCreditsBtn = document.getElementById('buy-credits-btn');

        console.log('🔍 Checking for elements...', {
            signinLink: !!signinLink,
            signoutLink: !!signoutLink,
            userInfoEl: !!userInfoEl,
            creditContainer: !!creditContainer,
            buyCreditsBtn: !!buyCreditsBtn,
            retries
        });

        if (signinLink && signoutLink && userInfoEl && creditContainer && buyCreditsBtn) {
            console.log('✅ All elements found, setting up auth...');
            callback({
                signinLink,
                signoutLink,
                userInfoEl,
                creditContainer,
                buyCreditsBtn
            });
        } else if (retries > 0) {
            console.log('⏳ Elements not ready, retrying...');
            setTimeout(() => waitForElements(callback, retries - 1), 100);
        } else {
            console.error('❌ Could not find all required elements after retries');
            // Fallback - setup with available elements
            callback({
                signinLink: signinLink || null,
                signoutLink: signoutLink || null,
                userInfoEl: userInfoEl || null,
                creditContainer: creditContainer || null,
                buyCreditsBtn: buyCreditsBtn || null
            });
        }
    }

    // Wait for elements then setup auth
    waitForElements((elements) => {
        const { signinLink, signoutLink, userInfoEl, creditContainer, buyCreditsBtn } = elements;

        console.log('Setting up auth...', { signinLink, signoutLink, userInfoEl, creditContainer });

        // Initialize credit manager
        creditManager = new CreditManager();

        // Update UI based on auth state
        async function updateAuthUI() {
            const storedToken = localStorage.getItem('idToken');
            let accessToken = localStorage.getItem('accessToken');
            
            // IMPORTANT: Fix for existing users - if we have idToken but no accessToken, copy it
            if (storedToken && !accessToken) {
                console.log('🔧 Found idToken but no accessToken, copying idToken to accessToken');
                localStorage.setItem('accessToken', storedToken);
                accessToken = storedToken;
            }``
            
            const isSignedIn = !!storedToken;

            console.log('🔍 Auth state check:', {
                hasIdToken: !!storedToken,
                hasAccessToken: !!accessToken,
                isSignedIn
            });
            
            if (storedToken) {
                try {
                    const decoded = jwtDecode(storedToken);
                    const name = decoded.given_name || decoded.name || decoded.email || 'User';
                    
                    // Update UI elements
                    if (userInfoEl) userInfoEl.textContent = `🎵 Welcome, ${name}`;
                    if (signinLink) signinLink.classList.add('hidden');
                    if (signoutLink) signoutLink.classList.remove('hidden');
                    if (creditContainer) {
                        console.log('✅ Showing credit container');
                        creditContainer.classList.remove('hidden');
                    }
                    
                    console.log('User signed in:', name);
                    
                    // Track user in database
                    trackUser(decoded);
                    
                    // Load and display credits
                    await loadUserCredits();
                    
                } catch (err) {
                    console.error('Failed to decode token:', err);
                    localStorage.removeItem('idToken');
                    localStorage.removeItem('accessToken');
                    showSignIn();
                }
            } else {
                showSignIn();
            }
            
            // Update AI generate section visibility
            updateGenerateSection(isSignedIn);
        }

        function showSignIn() {
            if (signinLink) signinLink.classList.remove('hidden');
            if (signoutLink) signoutLink.classList.add('hidden');
            if (creditContainer) creditContainer.classList.add('hidden');
            if (userInfoEl) userInfoEl.textContent = '';
        }

        // Load user's credit balance
        async function loadUserCredits() {
            try {
                console.log('🔍 Loading user credits...');
                const credits = await creditManager.getCredits();
                console.log('✅ Credits loaded:', credits);
                updateCreditDisplay(credits);
            } catch (error) {
                console.error('❌ Failed to load credits:', error);
                const creditDisplay = document.getElementById('credit-display');
                if (creditDisplay) creditDisplay.textContent = 'Credits: Error';
            }
        }

        // Function to show/hide AI generate section based on auth
        function updateGenerateSection(isSignedIn) {
            const generateControls = document.getElementById('generate-controls');
            const generateSection = document.getElementById('generate-section');
            
            if (isSignedIn) {
                // Show the entire AI section for signed-in users
                if (generateSection) generateSection.classList.remove('hidden');
                if (generateControls) generateControls.classList.remove('hidden');
            } else {
                // Hide the entire AI section and show sign-in message in its place
                if (generateControls) generateControls.classList.add('hidden');
                
                // Create or update the sign-in prompt
                if (generateSection) {
                    generateSection.innerHTML = `
                        <div class="w-4/5 max-w-[1200px] mx-auto mb-4 bg-control border-4 border-accent p-4 rounded text-center">
                            <div class="font-pixel text-[0.75rem] text-fg">
                                🔒 <a href="#" id="signin-prompt" class="text-accent underline hover:text-fg">Sign in to use AI generation</a>
                            </div>
                        </div>
                    `;
                    
                    // Add click handler to the sign-in prompt
                    const signinPrompt = document.getElementById('signin-prompt');
                    if (signinPrompt) {
                        signinPrompt.addEventListener('click', (e) => {
                            e.preventDefault();
                            if (signinLink) signinLink.click();
                        });
                    }
                }
            }
        }

        // Buy credits button handler
        if (buyCreditsBtn) {
            buyCreditsBtn.addEventListener('click', () => {
                showCreditPurchaseModal();
            });
        }

        // Sign in handler - ONLY when button is clicked
        if (signinLink) {
            console.log('Attaching sign in handler');
            signinLink.addEventListener('click', (e) => {
                console.log('Sign in clicked!');
                e.preventDefault();
                e.stopPropagation();
                
                const loginUrl = `https://${COGNITO_DOMAIN}/login?response_type=token&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&identity_provider=Google`;
                console.log('Redirecting to:', loginUrl);
                
                // Add a small delay to ensure the log is visible
                setTimeout(() => {
                    window.location.href = loginUrl;
                }, 100);
            });
        } else {
            console.error('Sign in link not found!');
        }

        // Sign out handler
        if (signoutLink) {
            signoutLink.addEventListener('click', (e) => {
                console.log('Sign out clicked');
                e.preventDefault();
                localStorage.clear();
                const logoutUrl = `https://${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(REDIRECT_URI)}`;
                window.location.href = logoutUrl;
            });
        }

        // Update UI based on current auth state
        updateAuthUI();
        checkAdminStatus(); 

        // Return functions for external use
        return {
            refreshAuthUI: updateAuthUI,
            loadUserCredits
        };
    }); // End of waitForElements callback
}

async function checkAdminStatus() {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    
    try {
        // Replace with your actual analytics API URL
        const response = await fetch('YOUR_ANALYTICS_API_URL/analytics?timeRange=24h', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            // User is admin, show admin link
            const adminLink = document.getElementById('admin-link');
            if (adminLink) {
                adminLink.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.log('Not an admin user');
    }
}

// Make getCurrentComposition available globally for generate.js
window.getCurrentComposition = function() {
    return serializeGridToJSON();
};

document.addEventListener('DOMContentLoaded', () => {
    initControls();
    controls = getControls();

    // Load navbar first, then set up auth
    fetch("/navbar.html")
        .then(res => res.text())
        .then(html => {
            document.getElementById("navbar").innerHTML = html;

            // Set up hamburger menu
            const toggle = document.getElementById("nav-toggle");
            const menu = document.getElementById("nav-menu");
            toggle?.addEventListener("click", () => {
                menu?.classList.toggle("hidden");
            });

            // IMPORTANT: Add a small delay to ensure DOM elements are ready
            setTimeout(() => {
                // Now set up auth after navbar elements are fully available
                const authControls = setupAuth();
                
                // Store auth controls globally so we can refresh UI after sign-in
                window.authControls = authControls;
            }, 50); // Small delay to ensure DOM is ready
        })
        .catch(err => console.error("Failed to load navbar:", err));

    // Handle shared compositions
    const match = window.location.pathname.match(/\/share\/([a-f0-9\-]{36})/);

    if (match) {
        const id = match[1];
        const url = `https://8bitcomposer-shared.s3-us-west-2.amazonaws.com/${id}.json`;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Composition not found.');
                return res.json();
            })
            .then(data => {
                applyComposition(data);
            })
            .catch(err => {
                console.error(err);
                alert('Failed to load shared composition.');
            });
    }

    // 1) initial state
    instrumentNames = INSTRUMENT_OPTIONS.slice(0,4);
    muted           = instrumentNames.map(() => false);
    trackVolume     = instrumentNames.map(() => 1.0);

    // 2) hook up playback & UI
    initPlayback(newSteps => build(newSteps, Number(controls.bpmIn.value)));
    initGenerate(applyComposition);

    const storedComposition = loadComposition();

    if (storedComposition) {
        applyComposition(storedComposition);
    } else {
        instrumentNames = INSTRUMENT_OPTIONS.slice(0,4);
        muted = instrumentNames.map(() => false);
        trackVolume = instrumentNames.map(() => 1.0);
        build(Number(controls.stepsIn.value), Number(controls.bpmIn.value));
    }

    // 3) clear/export events
    document.addEventListener('clearGrid', () => clearGrid());
    document.addEventListener('exportAudio', () =>
        exportAudio({
            gridState, noteState,
            instrumentNames,
            STEPS: Number(controls.stepsIn.value),
            bpmInput: Number(controls.bpmIn.value),
            lastTitle
        })
    );

    document.addEventListener('cellToggled', () => {
        persistState();
    });

    document.addEventListener('volumeChanged', ({ detail: { row, volume } }) => {
        // update our per-row state
        trackVolume[row] = volume;
        // if that row isn't muted, push the new volume into its GainNode
        if (!muted[row] && voiceRows[row]) {
            voiceRows[row].gainNode.gain.value = volume;
        }
        persistState();
    });
        
    // Add a new empty row:
    document.addEventListener('addRowClicked', () => {
        // default to the first instrument
        instrumentNames.push(INSTRUMENT_OPTIONS[0]);
        muted.push(false);
        trackVolume.push(1.0);
        build(
            Number(controls.stepsIn.value),
            Number(controls.bpmIn.value)
        );
        persistState();
    });

    // Remove a row at the given index:
    document.addEventListener('removeRowClicked', ({ detail: { row } }) => {
        // drop that instrument, its mute flag, and its volume
        instrumentNames.splice(row, 1);
        muted.splice(row, 1);
        trackVolume.splice(row, 1);
        // rebuild with same steps & bpm
        build(
            Number(controls.stepsIn.value),
            Number(controls.bpmIn.value)
        );
        persistState();
    });

    // Share button status
    document.getElementById('share-btn').addEventListener('click', async () => {
        const statusEl = document.getElementById('share-status');
        statusEl.textContent = '⏳ Uploading composition...';

        try {
            const composition = serializeGridToJSON();

            const response = await fetch('https://egght2t2zl.execute-api.us-west-2.amazonaws.com/test/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ composition }),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Failed to share');

            const shareUrl = data.shareUrl;

            statusEl.innerHTML = `✅ Shareable link: <a href="${shareUrl}" class="underline text-accent" target="_blank">${shareUrl}</a>`;
            await navigator.clipboard.writeText(shareUrl);
        } catch (err) {
            console.error(err);
            statusEl.textContent = '❌ Failed to share composition.';
        }
    });
    
    // **wire up reset button** 👇
    controls.resetBtn.addEventListener('click', () => {
        // reset instruments + volumes
        instrumentNames = INSTRUMENT_OPTIONS.slice(0, 4);
        muted           = instrumentNames.map(() => false);
        trackVolume     = instrumentNames.map(() => 1.0);

        // reset UI controls
        controls.stepsIn.value = 16;
        controls.bpmIn.value   = 80;
        Tone.Transport.bpm.value = 80;

        // clear all grid state & rebuild
        clearGrid();
        clearComposition()
        build(16, 80);

        // clear any "generated" status
        controls.genStatus.textContent = '';
        controls.genTextarea.value = '';
        
        return;
    });

    // Handle successful payment return
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('purchase') === 'success') {
        // Refresh credits after successful purchase
        setTimeout(async () => {
            if (window.authControls && window.authControls.loadUserCredits) {
                await window.authControls.loadUserCredits();
            }
            // Show success message
            const statusEl = document.getElementById('generate-status');
            if (statusEl) {
                statusEl.textContent = '✅ Credits purchased successfully!';
                setTimeout(() => {
                    statusEl.textContent = '';
                }, 3000);
            }
        }, 1000);
    }

    // 4) first draw
    build(Number(controls.stepsIn.value), Number(controls.bpmIn.value));
});