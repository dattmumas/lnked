'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

export default function ModeToggle(): React.ReactElement {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect((): void => {
    setMounted(true);
  }, []);

  const handleThemeToggle = useCallback((): void => {
    const isDark = resolvedTheme === 'dark';
    setTheme(isDark ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-md bg-muted/30 animate-pulse"></div>;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleThemeToggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="relative h-9 w-9 p-0"
    >
      <Icon
        icon={Sun}
        size="sm"
        className={`absolute transition-all duration-300 ${
          isDark
            ? 'scale-100 opacity-100 rotate-0'
            : 'scale-0 opacity-0 rotate-90'
        }`}
      />
      <Icon
        icon={Moon}
        size="sm"
        className={`absolute transition-all duration-300 ${
          !isDark
            ? 'scale-100 opacity-100 rotate-0'
            : 'scale-0 opacity-0 rotate-90'
        }`}
      />
      <span className="sr-only">
        {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      </span>
    </Button>
  );
}
