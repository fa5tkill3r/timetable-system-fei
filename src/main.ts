import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useSchemaStore } from './store/schemas'
import './assets/index.css'
import router from '@/router.ts'
import _ from 'lodash'

const app = createApp(App)
const pinia = createPinia()

app.use(router)
app.use(pinia)

const schemaStore = useSchemaStore()
schemaStore.initialize()

// Add Lodash globally
app.config.globalProperties._ = _
console.log(app.config.globalProperties._)

app.mount('#app')
