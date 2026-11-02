import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combines class names; later classes override earlier conflicting ones */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}