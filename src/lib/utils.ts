import type { Updater } from '@tanstack/vue-table'
import { Ref } from 'vue'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper function that handles updating state in Vue components
 * using the TanStack Table updater pattern.
 * 
 * @param updaterOrValue - Either a new value or an updater function
 * @param ref - The Vue ref to update
 */
export function valueUpdater<T>(
  updaterOrValue: Updater<T> | T,
  ref: Ref<T>
): void {
  if (typeof updaterOrValue === 'function') {
    // If updaterOrValue is a function, call it with the current value
    const updater = updaterOrValue as (old: T) => T
    ref.value = updater(ref.value)
  } else {
    // Otherwise, directly set the value
    ref.value = updaterOrValue
  }
}