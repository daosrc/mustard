import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import '@mustard/design-tokens/theme.css'
import './sidepanel.css'
import 'virtual:uno.css'

createApp(App).use(createPinia()).mount('#app')
