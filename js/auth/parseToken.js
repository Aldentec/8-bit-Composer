export function parseTokenFromUrl() {
  const hash = window.location.hash.substr(1);
  const params = new URLSearchParams(hash);
  const idToken = params.get('id_token');
  const accessToken = params.get('access_token');

  if (accessToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('idToken', idToken);
    return true;
  }

  return false;
}