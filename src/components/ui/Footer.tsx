import Link from 'next/link';
import React from 'react';

const socialLinks = [
  { href: 'https://twitter.com/lnked', label: 'Twitter' },
  { href: 'https://github.com/lnked', label: 'GitHub' },
  // Add more as needed
];

const footerLinks = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
];

export default function Footer(): React.JSX.Element {
  return (
    <footer
      className="border-t border-border py-8 px-4 md:px-6"
      role="contentinfo"
    >
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Lnked. All rights reserved.
            <span className="ml-2 text-accent font-medium">Beta</span>
          </div>

          <nav className="flex flex-wrap gap-6" aria-label="Footer navigation">
            <div className="flex gap-6 text-sm">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex gap-6 text-sm">
              {socialLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
