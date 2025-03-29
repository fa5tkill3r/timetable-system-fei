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

export function computeColorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  let color = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff
    color += ('00' + value.toString(16)).slice(-2)
  }
  return color
}

export function calculateBrightness(color: string): number {
  const rgb = parseInt(color.slice(1), 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = (rgb >> 0) & 0xff
  return 0.299 * r + 0.587 * g + 0.114 * b
}
