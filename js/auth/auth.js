// js/auth/auth.js
import { COGNITO_DOMAIN, CLIENT_ID, REDIRECT_URI, LOGOUT_URI } from '../authConfig.js';

export function signInWithGoogle() {
  try {
    const loginUrl = `https://${COGNITO_DOMAIN}/login?` +
      `response_type=token&` +
      `client_id=${CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `identity_provider=Google`;

    console.log('Redirecting to:', loginUrl); // Debug log
    window.location.href = loginUrl;
  } catch (error) {
    console.error('Sign in error:', error);
    alert('Failed to initiate sign in. Please try again.');
  }
}

export function signOut() {
  try {
    const logoutUrl = `https://${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(LOGOUT_URI)}`;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
    window.location.href = logoutUrl;
  } catch (error) {
    console.error('Sign out error:', error);
    // Still clear tokens even if redirect fails
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
    window.location.reload();
  }
}

export function isLoggedIn() {
  try {
    const token = localStorage.getItem('accessToken');
    return !!token;
  } catch (error) {
    console.error('Error checking login status:', error);
    return false;
  }
}

export function parseTokenFromUrl() {
  try {
    const hash = window.location.hash.substr(1);
    if (!hash) return false;
    
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');
    const accessToken = params.get('access_token');

    if (accessToken && idToken) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('idToken', idToken);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error parsing token from URL:', error);
    return false;
  }
}