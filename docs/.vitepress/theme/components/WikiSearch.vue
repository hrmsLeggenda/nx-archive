<script setup>
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from './wiki-pages.data'
import { tokenize } from '../../search.mjs'
const props = defineProps({game:{type:String,required:true}})
const query = ref('')
const results = computed(() => { const terms = tokenize(query.value.toLowerCase()); if (!terms.length) return []; return data.filter(p => p.url.startsWith('/games/' + props.game + '/') && terms.every(term => (p.title + p.text).toLowerCase().includes(term))) })
</script>
<template><section class="wiki-search" aria-label="游戏内检索"><label :for="'wiki-search-' + game">搜索本游戏 Wiki</label><input :id="'wiki-search-' + game" v-model="query" type="search" placeholder="输入角色、职业、任务或地点" /><p v-if="query.trim()" aria-live="polite">{{ results.length }} 条结果 · 仅本游戏</p><ul v-if="results.length"><li v-for="page in results" :key="page.url"><a :href="withBase(page.url)">{{ page.title }}</a><small> · {{ page.category }}</small></li></ul><p v-else-if="query.trim()">未找到条目。可尝试“挖角”“战争篇”或“矿山”。</p></section></template>
<style scoped>.wiki-search { padding:22px;border:1px solid var(--vp-c-divider);border-radius:14px; }.wiki-search label { font-weight:600;display:block;margin-bottom:10px; }.wiki-search input { border:1px solid var(--vp-c-divider);border-radius:8px;padding:12px;width:100%;background:var(--vp-c-bg); }.wiki-search small { color:var(--vp-c-text-2); }</style>
