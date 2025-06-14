// Save composition to LocalStorage
export function saveComposition(composition) {
  localStorage.setItem('compositionState', JSON.stringify(composition));
}

// Load composition from LocalStorage
export function loadComposition() {
  const compositionData = localStorage.getItem('compositionState');
  return compositionData ? JSON.parse(compositionData) : null;
}

// Clear composition from LocalStorage
export function clearComposition() {
  localStorage.removeItem('compositionState');
}
