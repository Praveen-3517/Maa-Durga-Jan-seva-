import { useState, useCallback } from 'react';

// Helper: Check if a JWT token is expired (client-side, no server call needed)
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // payload.exp is in seconds, Date.now() is in milliseconds
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // If we can't parse it, treat it as expired
  }
}

export function useAdminAuth() {
  const [adminToken, setAdminToken] = useState(() => {
    const stored = localStorage.getItem('adminToken') || '';
    // If stored token is already expired, clear it silently on app load
    if (stored && isTokenExpired(stored)) {
      localStorage.removeItem('adminToken');
      return '';
    }
    return stored;
  });

  const login = useCallback(async (password) => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (res.ok && data?.success && data?.token) {
      localStorage.setItem('adminToken', data.token);
      setAdminToken(data.token);
      return { success: true };
    }
    throw new Error(data?.message || 'Incorrect password');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    setAdminToken('');
  }, []);

  return { adminToken, login, logout, isLoggedIn: !!adminToken };
}
