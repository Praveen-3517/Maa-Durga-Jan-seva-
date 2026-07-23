import { useState, useCallback } from 'react';

export function useAdminAuth() {
  const [adminToken, setAdminToken] = useState(
    () => sessionStorage.getItem('adminToken') || ''
  );

  const login = useCallback(async (password) => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (res.ok && data?.success && data?.token) {
      sessionStorage.setItem('adminToken', data.token);
      setAdminToken(data.token);
      return { success: true };
    }
    throw new Error(data?.message || 'Incorrect password');
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('adminToken');
    setAdminToken('');
  }, []);

  return { adminToken, login, logout, isLoggedIn: !!adminToken };
}
