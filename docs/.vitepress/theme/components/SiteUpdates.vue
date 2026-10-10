<script setup>
import {computed} from 'vue'
import {withBase} from 'vitepress'
import {data} from './wiki-pages.data'
import wikis from '../../../data/wikis.json'
const props=defineProps({game:{type:String,default:''}})
const pages=computed(()=>data.filter(p=>p.updated&&(!props.game||p.game===props.game)&&!p.url.includes('/categories/')&&!p.url.includes('/all-pages')).sort((a,b)=>b.updated.localeCompare(a.updated)||a.title.localeCompare(b.title)).slice(0,6))
</script>
<template><section class="site-updates"><h2>近期更新</h2><ul class="page-directory"><li v-for="p in pages" :key="p.url"><a :href="withBase(p.url)">{{p.title}}</a><span>{{wikis[p.game]?.title}}</span><small>{{p.updated.slice(0,10)}}</small></li></ul><p v-if="!pages.length">暂未取得更新记录。</p></section></template>
