import { defineStore } from 'pinia'
import { DEFAULT_TIMETABLE_CONFIG, type TimetableConfig } from '@/lib/timetable'
import { ref } from 'vue'

const STORAGE_KEY = 'timetable-settings'

export const useTimetableSettingsStore = defineStore(
  'timetableSettings',
  () => {
    const config = ref<TimetableConfig>({ ...DEFAULT_TIMETABLE_CONFIG })
    const compactView = ref(false)

    const loadSettings = () => {
      try {
        const storedSettings = localStorage.getItem(STORAGE_KEY)
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings)
          config.value = parsed.config || { ...DEFAULT_TIMETABLE_CONFIG }
          compactView.value = parsed.compactView || false
        }

        if (config.value.CELL_WIDTH < 100) {
          compactView.value = true
        }
      } catch (error) {
        console.error('Failed to load timetable settings:', error)
        resetSettings()
      }
    }

    const saveSettings = () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            config: config.value,
            compactView: compactView.value,
          }),
        )
      } catch (error) {
        console.error('Failed to save timetable settings:', error)
      }
    }

    const resetSettings = () => {
      config.value = { ...DEFAULT_TIMETABLE_CONFIG }
      compactView.value = false
      saveSettings()
    }

    const updateConfig = (newConfig: TimetableConfig) => {
      config.value = newConfig

      if (newConfig.CELL_WIDTH < 100) {
        compactView.value = true
      }
      saveSettings()
    }

    const updateCompactView = (value: boolean) => {
      compactView.value = value
      saveSettings()
    }

    loadSettings()

    return {
      config,
      compactView,
      updateConfig,
      updateCompactView,
      resetSettings,
      loadSettings,
    }
  },
)
