import DefaultTheme from 'vitepress/theme'
import GameLibrary from './components/GameLibrary.vue'
import InteractiveMap from './components/InteractiveMap.vue'
import './style.css'
export default { extends: DefaultTheme, enhanceApp({ app }) { app.component('GameLibrary', GameLibrary); app.component('InteractiveMap', InteractiveMap) } }
