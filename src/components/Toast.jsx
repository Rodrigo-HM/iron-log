import { useEffect, useState } from 'react';

export function Toast({ message, show, onHide }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onHide, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  return (
    <div className={`toast ${show ? 'show' : ''}`}>
      {message}
    </div>
  );
}

// Hook para usar toasts fácilmente
export function useToast() {
  const [toast, setToast] = useState({ message: '', show: false });

  const showToast = (message) => {
    setToast({ message, show: true });
  };

  const hideToast = () => setToast(t => ({ ...t, show: false }));

  return { toast, showToast, hideToast };
}
