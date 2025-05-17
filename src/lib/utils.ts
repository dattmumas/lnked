import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string or Date object to 'Month Day, Year' (e.g., January 1, 2024).
 */
export function formatDate(date: string | Date | null): string {
  if (!date) return "Date not available";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Date not available";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
