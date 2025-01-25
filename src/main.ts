import { createApp } from 'vue'
import App from './App.vue'
import './assets/index.css'
import router from '@/router.ts'
import { createPinia } from 'pinia'
import _ from 'lodash'

const app = createApp(App)

const pinia = createPinia()

app.use(router)
app.use(pinia)

// Add Lodash globally
app.config.globalProperties._ = _
console.log(app.config.globalProperties._)

app.mount('#app')
