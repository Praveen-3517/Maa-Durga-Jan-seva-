import { useState, useEffect } from 'react';

export default function Toast({ message, type, visible }) {
  return (
    <div className={`toast ${type} ${visible ? 'show' : ''}`}>
      <i className={`toast-icon ${type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}`}></i>
      <span>{message}</span>
    </div>
  );
}

// Hook for managing toast state
export function useToast() {
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 4000);
  };

  return { toast, showToast };
}
