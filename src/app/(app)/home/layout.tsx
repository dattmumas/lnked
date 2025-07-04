import { headers } from 'next/headers';
import React from 'react';

import DesktopHomeLayout from './_DesktopHomeLayout';
import MobileHomeLayout from './_MobileHomeLayout';

/**
 * Route-local layout for /home that delivers either mobile-optimised or
 * desktop-optimised chrome *on the server* based on the User-Agent.
 * This ensures we stream only the branch the visitor needs, avoiding
 * hydration flicker and unnecessary JS payload.
 */
export default async function HomeResponsiveLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const ua = (await headers()).get('user-agent') ?? '';
  const isMobileUA =
    /android|iphone|ipad|ipod|iemobile|blackberry|mobile/i.test(
      ua.toLowerCase(),
    );

  return isMobileUA ? (
    <MobileHomeLayout>{children}</MobileHomeLayout>
  ) : (
    <DesktopHomeLayout>{children}</DesktopHomeLayout>
  );
}
