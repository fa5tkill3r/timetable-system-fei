import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useSchemaStore } from './store/schemas'
import './assets/index.css'
import router from '@/router.ts'
import _ from 'lodash'
import i18n from './lib/i18n'
import { PiniaSharedState } from './lib/sharedState'

const app = createApp(App)
const pinia = createPinia()

pinia.use(PiniaSharedState())

app.use(router)
app.use(pinia)
app.use(i18n)

useSchemaStore()

// Add Lodash globally
app.config.globalProperties._ = _
console.log(app.config.globalProperties._)

app.mount('#app')
