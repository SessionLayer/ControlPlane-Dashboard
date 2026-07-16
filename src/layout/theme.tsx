import { useCallback, useEffect, useState } from 'react';

import { Button } from '../ui/Button';

export type Theme = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'sl.theme';

// Theme preference (not a secret) is the one thing kept in localStorage so the
// operator's choice survives reloads. Tokens and keys are NEVER stored here.
function readTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage unavailable — fall through to system */
  }
  return 'system';
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((t) =>
      t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system',
    );
  }, []);

  return [theme, cycle];
}

const ICON: Record<Theme, string> = {
  system: '◑',
  light: '☀',
  dark: '☾',
};

export function ThemeToggle() {
  const [theme, cycle] = useTheme();
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={cycle}
      aria-label={`Theme: ${theme}. Activate to change.`}
      title={`Theme: ${theme}`}
    >
      <span aria-hidden="true">{ICON[theme]}</span>
    </Button>
  );
}
