// useAuth.js
import { useEffect, useState } from 'react';
import { parseTokenFromUrl } from './parseToken';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loggedIn = parseTokenFromUrl() || !!localStorage.getItem('accessToken');
    setIsAuthenticated(loggedIn);
  }, []);

  const logout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return {
    isAuthenticated,
    idToken: localStorage.getItem('idToken'),
    accessToken: localStorage.getItem('accessToken'),
    logout,
  };
}
