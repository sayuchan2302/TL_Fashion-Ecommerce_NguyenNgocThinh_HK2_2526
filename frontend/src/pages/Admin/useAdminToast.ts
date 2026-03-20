import { useCallback, useEffect, useRef, useState } from 'react';

export const useAdminToast = (defaultDuration = 2200) => {
  const [toast, setToast] = useState('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const pushToast = useCallback((message: string, duration = defaultDuration) => {
    setToast(message);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setToast('');
      timerRef.current = null;
    }, duration);
  }, [defaultDuration]);

  return {
    toast,
    pushToast,
  };
};
