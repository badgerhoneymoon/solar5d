// Tailwind/clsx class name merge helper
// Usage: cn('foo', condition && 'bar')
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
