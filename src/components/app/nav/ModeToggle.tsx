"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-md bg-muted/30 animate-pulse"></div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="relative"
    >
      <Sun
        className={`size-4 absolute transition-all duration-300 ${
          isDark
            ? "scale-100 opacity-100 rotate-0"
            : "scale-0 opacity-0 rotate-90"
        }`}
      />
      <Moon
        className={`size-4 absolute transition-all duration-300 ${
          !isDark
            ? "scale-100 opacity-100 rotate-0"
            : "scale-0 opacity-0 rotate-90"
        }`}
      />
      <span className="sr-only">
        {isDark ? "Switch to light theme" : "Switch to dark theme"}
      </span>
    </Button>
  );
}
