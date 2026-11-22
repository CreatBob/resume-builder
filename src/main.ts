import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import AppShare from './AppShare.vue'
import { resolveAppRoute } from './router/appRouteResolver'
import './assets/main.css'
// author: Bob

const route = resolveAppRoute()
document.body.classList.toggle('share-route-active', route.mode === 'share')
const app =
  route.mode === 'share'
    ? createApp(AppShare, {
        shareSource: route.shareSource ?? 'backend',
        shareToken: route.shareToken ?? '',
        offlinePayload: route.offlinePayload ?? '',
      })
    : createApp(App)

app.use(createPinia())

app.mount('#app')
