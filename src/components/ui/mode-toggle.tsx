'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';

import { Button } from './button';

export function ModeToggle(): React.JSX.Element | undefined {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = theme === 'dark';

  const toggleTheme = useCallback((): void => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  if (!mounted) return undefined;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={toggleTheme}
      className="focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {isDark ? (
        <Sun className="size-5 text-yellow-400" aria-hidden="true" />
      ) : (
        <Moon className="size-5 text-blue-600" aria-hidden="true" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
