'use client';

import React from 'react';

import { ProfileContextProvider } from '@/lib/hooks/profile';

import type { ProfileLayoutProps } from '@/lib/hooks/profile/types';

/**
 * Main layout component for profile pages implementing the split-screen design
 * with 65%/35% desktop layout and responsive transformations.
 *
 * Layout Specification:
 * - Desktop (≥1024px): 65% hero + 35% social sidebar
 * - Tablet (768-1023px): Stacked layout with horizontal social feed
 * - Mobile (≤767px): Single column with touch-optimized interactions
 */
export function ProfileLayout({ username, children }: ProfileLayoutProps) {
  return (
    <ProfileContextProvider username={username}>
      <div className="profile-layout min-h-screen bg-background">
        {/* Main content container with responsive grid */}
        <div className="profile-content-grid">{children}</div>
      </div>
    </ProfileContextProvider>
  );
}

/**
 * Profile content container with CSS Grid implementation
 * Handles the complex responsive layout transformations
 */
export function ProfileContentGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="profile-content-grid relative">
      {/* CSS Grid Layout - Desktop First */}
      <div
        className="
        grid 
        grid-cols-[65%_35%] 
        gap-4 
        py-6
        min-h-screen
        
        /* Tablet Responsive (768-1023px) */
        max-lg:grid-cols-1 
        max-lg:gap-4 
        max-lg:py-4
        
        /* Mobile Responsive (≤767px) */
        max-md:py-3 
        max-md:gap-3
      "
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Profile Hero Container - Left side of desktop layout (65%)
 */
export function ProfileHeroContainer({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
      profile-hero-container
      col-start-1 
      
      /* Tablet & Mobile - Full width, first in order */
      max-lg:col-start-1 
      max-lg:order-1
      
      ${className}
    `}
    >
      {children}
    </div>
  );
}

/**
 * Social Sidebar Container - Right side of desktop layout (35%)
 */
export function SocialSidebarContainer({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
      social-sidebar-container
      col-start-2 
      
      /* Tablet & Mobile - Full width, second in order */
      max-lg:col-start-1 
      max-lg:order-2
      
      ${className}
    `}
    >
      {children}
    </div>
  );
}

/**
 * Content Area Container - Full width below hero and sidebar
 */
export function ContentAreaContainer({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
      content-area-container
      col-span-2 
      col-start-1
      
      /* Tablet & Mobile - Full width, third in order */
      max-lg:col-span-1 
      max-lg:col-start-1 
      max-lg:order-3
      
      ${className}
    `}
    >
      {children}
    </div>
  );
}

/**
 * Responsive layout utility hook for layout-aware components
 */
export function useResponsiveLayout() {
  const [isDesktop, setIsDesktop] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect((): void => {
    const checkLayout = () => {
      const width = window.innerWidth;
      setIsDesktop(width >= 1024);
      setIsTablet(width >= 768 && width < 1024);
      setIsMobile(width < 768);
    };

    // Initial check
    checkLayout();

    // Listen for resize events
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  return {
    isDesktop,
    isTablet,
    isMobile,
    layoutType: isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile',
  };
}

/**
 * Layout debugging component (development only)
 * Helps visualize the grid system during development
 */
export function LayoutDebugger() {
  const { layoutType } = useResponsiveLayout();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono">
      Layout: {layoutType}
    </div>
  );
}

// Default export for the main layout
export default ProfileLayout;
