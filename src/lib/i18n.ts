import { createI18n } from 'vue-i18n'
import en from '../locales/en'
import sk from '../locales/sk'

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'sk',
  fallbackLocale: 'en',
  messages: {
    en,
    sk,
  },
})

export default i18n
