<script setup>
import { computed } from 'vue'
import { useRoute, withBase } from 'vitepress'
import wikis from '../../../data/wikis.json'
const route = useRoute()
const game = computed(() => route.path.match(/\/games\/([^/]+)\//)?.[1])
const wiki = computed(() => wikis[game.value])
</script>
<template><nav v-if="wiki" class="game-context" aria-label="游戏 Wiki 导航"><a :href="withBase('/games/')">游戏档案</a><span> / </span><a :href="withBase('/games/' + game + '/')">{{ wiki.title }} Wiki</a><div><template v-for="group in wiki.groups" :key="group.id"><a v-for="item in group.items" :key="item.path" :href="withBase('/games/' + game + '/' + item.path)">{{ item.title }}</a></template></div></nav></template>
<style scoped>.game-context { margin-bottom:24px;border-bottom:1px solid var(--vp-c-divider);padding-bottom:16px;font-size:13px; }.game-context a { color:var(--vp-c-brand-1); }.game-context div { display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:12px; }</style>
