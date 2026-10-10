import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import GameLibrary from './components/GameLibrary.vue'
import InteractiveMap from './components/InteractiveMap.vue'
import WikiPortal from './components/WikiPortal.vue'
import GameContext from './components/GameContext.vue'
import FweDatabase from './components/FweDatabase.vue'
import FweResources from './components/FweResources.vue'
import CategoryBrowser from './components/CategoryBrowser.vue'
import SiteUpdates from './components/SiteUpdates.vue'
import './style.css'
export default {
 extends: DefaultTheme,
 Layout: () => h(DefaultTheme.Layout, null, { 'doc-before': () => h(GameContext) }),
 enhanceApp({ app }) { app.component('GameLibrary', GameLibrary); app.component('InteractiveMap', InteractiveMap); app.component('WikiPortal', WikiPortal); app.component('FweDatabase', FweDatabase); app.component('FweResources', FweResources); app.component('CategoryBrowser', CategoryBrowser); app.component('SiteUpdates', SiteUpdates) }
}
