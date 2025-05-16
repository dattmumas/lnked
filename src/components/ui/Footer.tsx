import React from "react";

const socialLinks = [
  { href: "https://twitter.com/lnked", label: "Twitter" },
  { href: "https://github.com/lnked", label: "GitHub" },
  // Add more as needed
];

export default function Footer() {
  return (
    <footer className="bg-[#1F1F1F] border-t-2 border-[#E50914] py-4 px-4 text-xs text-[#B0B0B0] flex flex-col md:flex-row items-center justify-between mt-8">
      <div className="mb-2 md:mb-0">
        © {new Date().getFullYear()} Lnked. All rights reserved. Not affiliated
        with LinkedIn. <span className="text-[#FFCA28]">Beta</span>
      </div>
      <div className="flex space-x-4">
        {socialLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#FFCA28] transition-colors"
          >
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  );
}
