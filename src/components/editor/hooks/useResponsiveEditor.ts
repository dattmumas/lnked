'use client';

import { useState, useEffect } from 'react';

interface ResponsiveEditorState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
}

export function useResponsiveEditor(): ResponsiveEditorState {
  const [state, setState] = useState<ResponsiveEditorState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 1024,
  });

  useEffect((): void => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      setState({
        isMobile: width < 480,
        isTablet: width >= 480 && width < 768,
        isDesktop: width >= 768,
        screenWidth: width,
      });
    };

    // Initial check
    updateScreenSize();

    // Add event listener
    window.addEventListener('resize', updateScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return state;
}

export function getResponsiveToolbarConfig(screenWidth: number) {
  if (screenWidth < 480) {
    // Mobile: Show only essential tools
    return {
      showFontControls: false,
      showColorPickers: false,
      showAlignment: false,
      showAdvancedFormatting: false,
      maxToolbarItems: 6,
    };
  } else if (screenWidth < 768) {
    // Tablet: Show most tools but hide some advanced ones
    return {
      showFontControls: false,
      showColorPickers: false,
      showAlignment: true,
      showAdvancedFormatting: false,
      maxToolbarItems: 10,
    };
  } else {
    // Desktop: Show all tools
    return {
      showFontControls: true,
      showColorPickers: true,
      showAlignment: true,
      showAdvancedFormatting: true,
      maxToolbarItems: -1, // No limit
    };
  }
} 