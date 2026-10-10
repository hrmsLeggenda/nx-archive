<script setup>
import {computed,ref} from 'vue'
import {withBase} from 'vitepress'
import {data} from './wiki-pages.data'
import {filterPages} from './wiki-model.mjs'
const props=defineProps({game:{type:String,required:true}})
const query=ref('')
const results=computed(()=>query.value.trim()?filterPages(data,props.game,query.value).filter(p=>!p.url.includes('/categories/')).slice(0,30):[])
const kinds=computed(()=>[...new Set(results.value.map(p=>p.kind))])
</script>
<template><section class="wiki-search" aria-label="游戏内检索"><label :for="'wiki-search-'+game">搜索本游戏 Wiki</label><input :id="'wiki-search-'+game" aria-label="搜索本游戏 Wiki" v-model="query" type="search" placeholder="角色、职业、任务、地点或攻略" /><p v-if="query.trim()" role="status">显示 {{results.length}} 条结果 · 仅本游戏</p><section v-for="kind in kinds" :key="kind"><h3>{{kind}}</h3><ul><li v-for="p in results.filter(v=>v.kind===kind)" :key="p.url"><a :href="withBase(p.url)">{{p.title}}</a></li></ul></section><p v-if="query.trim()&&!results.length">未找到条目，可尝试其他名称或关键词。</p></section></template>
<style scoped>.wiki-search{padding:22px;border:1px solid var(--vp-c-divider);border-radius:14px}.wiki-search label{font-weight:600;display:block;margin-bottom:10px}.wiki-search input{border:1px solid var(--vp-c-divider);border-radius:8px;padding:12px;width:100%;background:var(--vp-c-bg)}</style>
