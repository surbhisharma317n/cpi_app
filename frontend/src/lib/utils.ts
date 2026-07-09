// src/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind class names conditionally and safely.
 */
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}
