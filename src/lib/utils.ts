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
  ref: Ref<T>,
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

/**
 * Generates a color from a string input.
 * The same string will always generate the same color.
 *
 * @param name - String to generate the color from
 * @param style - Color style: 'default', 'pastel', or 'bright'
 * @param brightnessAdjustment - Factor to adjust brightness (< 1 for darker, > 1 for lighter)
 * @returns A hex color code
 */
export function getColorFromString(
  name: string,
  style: 'default' | 'pastel' | 'bright' = 'pastel',
  brightnessAdjustment: number = 1.0,
): string {
  // Generate a hash from the string
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  // Convert hash to RGB values
  const r = (hash & 0xff0000) >> 16
  const g = (hash & 0x00ff00) >> 8
  const b = hash & 0x0000ff

  // Apply the requested style
  if (style === 'pastel') {
    // Mix with white for pastel colors (lighter)
    const pastelR = Math.round((r + 255) / 2)
    const pastelG = Math.round((g + 255) / 2)
    const pastelB = Math.round((b + 255) / 2)

    // Apply brightness adjustment
    const adjustedR = Math.min(
      255,
      Math.max(0, Math.round(pastelR * brightnessAdjustment)),
    )
    const adjustedG = Math.min(
      255,
      Math.max(0, Math.round(pastelG * brightnessAdjustment)),
    )
    const adjustedB = Math.min(
      255,
      Math.max(0, Math.round(pastelB * brightnessAdjustment)),
    )

    return `#${((adjustedR << 16) | (adjustedG << 8) | adjustedB).toString(16).padStart(6, '0')}`
  } else if (style === 'bright') {
    // Increase brightness for bright colors
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b
    const minBrightness = 160

    if (brightness < minBrightness) {
      const factor =
        Math.min(2, minBrightness / (brightness + 0.1)) * brightnessAdjustment
      const brightR = Math.min(255, Math.round(r * factor))
      const brightG = Math.min(255, Math.round(g * factor))
      const brightB = Math.min(255, Math.round(b * factor))

      return `#${((brightR << 16) | (brightG << 8) | brightB).toString(16).padStart(6, '0')}`
    }

    // Apply brightness adjustment to default bright
    const adjustedR = Math.min(
      255,
      Math.max(0, Math.round(r * brightnessAdjustment)),
    )
    const adjustedG = Math.min(
      255,
      Math.max(0, Math.round(g * brightnessAdjustment)),
    )
    const adjustedB = Math.min(
      255,
      Math.max(0, Math.round(b * brightnessAdjustment)),
    )

    return `#${((adjustedR << 16) | (adjustedG << 8) | adjustedB).toString(16).padStart(6, '0')}`
  }

  // Default with brightness adjustment
  const adjustedR = Math.min(
    255,
    Math.max(0, Math.round(r * brightnessAdjustment)),
  )
  const adjustedG = Math.min(
    255,
    Math.max(0, Math.round(g * brightnessAdjustment)),
  )
  const adjustedB = Math.min(
    255,
    Math.max(0, Math.round(b * brightnessAdjustment)),
  )

  return `#${((adjustedR << 16) | (adjustedG << 8) | adjustedB).toString(16).padStart(6, '0')}`
}

// This function can be useful for other purposes, so we'll keep it
export function calculateBrightness(color: string): number {
  const rgb = parseInt(color.slice(1), 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = (rgb >> 0) & 0xff
  return 0.299 * r + 0.587 * g + 0.114 * b
}
