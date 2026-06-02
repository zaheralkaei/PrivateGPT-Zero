import { useEffect } from 'react';

export function useTheme() {
  const getStoredTheme = (): 'light' | 'dark' | 'system' => {
    const stored = localStorage.getItem('privategpt-zero-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'dark';
  };

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (theme === 'dark' || (theme === 'system' && systemDark)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('privategpt-zero-theme', theme);
  };

  useEffect(() => {
    applyTheme(getStoredTheme());

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const current = getStoredTheme();
      if (current === 'system') applyTheme('system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return { applyTheme, getStoredTheme };
}