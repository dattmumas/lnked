'use client';

import React, { useEffect } from 'react';

export function ContrastEnhancer(): React.ReactElement | undefined {
  useEffect((): (() => void) => {
    // Create and inject high-priority styles
    const styleId = 'contrast-enhancer-styles';
    let styleElement = document.getElementById(
      styleId,
    ) as HTMLStyleElement | null;

    if (styleElement === null || styleElement === undefined) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = `
      /* Ultra high-priority contrast overrides */
      .text-muted-foreground,
      [class*="text-muted-foreground"] {
        color: hsl(var(--foreground) / 0.7) !important;
      }
      
      .dark .text-muted-foreground,
      .dark [class*="text-muted-foreground"] {
        color: hsl(var(--foreground) / 0.65) !important;
      }
      
      /* Text with opacity classes */
      [class*="text-"][class*="/50"],
      [class*="text-"][class*="\\/50"] {
        color: hsl(var(--foreground) / 0.65) !important;
      }
      
      [class*="text-"][class*="/60"],
      [class*="text-"][class*="\\/60"] {
        color: hsl(var(--foreground) / 0.7) !important;
      }
      
      [class*="text-"][class*="/70"],
      [class*="text-"][class*="\\/70"] {
        color: hsl(var(--foreground) / 0.75) !important;
      }
      
      .dark [class*="text-"][class*="/50"],
      .dark [class*="text-"][class*="\\/50"] {
        color: hsl(var(--foreground) / 0.6) !important;
      }
      
      .dark [class*="text-"][class*="/60"],
      .dark [class*="text-"][class*="\\/60"] {
        color: hsl(var(--foreground) / 0.65) !important;
      }
      
      .dark [class*="text-"][class*="/70"],
      .dark [class*="text-"][class*="\\/70"] {
        color: hsl(var(--foreground) / 0.7) !important;
      }
      
      /* Sidebar specific */
      [data-sidebar] .text-muted-foreground,
      .sidebar .text-muted-foreground {
        color: hsl(var(--sidebar-foreground) / 0.75) !important;
      }
      
      .dark [data-sidebar] .text-muted-foreground,
      .dark .sidebar .text-muted-foreground {
        color: hsl(var(--sidebar-foreground) / 0.7) !important;
      }
      
      /* Toasts and notifications */
      [role="alert"] .text-muted-foreground,
      .toast .text-muted-foreground {
        color: hsl(var(--foreground) / 0.8) !important;
      }
      
      .dark [role="alert"] .text-muted-foreground,
      .dark .toast .text-muted-foreground {
        color: hsl(var(--foreground) / 0.75) !important;
      }
    `;

    // Also apply inline styles to elements that might be dynamically created
    const observer = new MutationObserver((): void => {
      const mutedElements = document.querySelectorAll('.text-muted-foreground');
      mutedElements.forEach((el): void => {
        const isDark = document.documentElement.classList.contains('dark');
        const opacity = isDark ? '0.65' : '0.7';
        (el as HTMLElement).style.setProperty(
          'color',
          `hsl(var(--foreground) / ${opacity})`,
          'important',
        );
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return (): void => {
      observer.disconnect();
    };
  }, []);

  return undefined;
}
