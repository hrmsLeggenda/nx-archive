<script setup>
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import { data } from './wiki-pages.data'
import wikis from '../../../data/wikis.json'
import {filterPages} from './wiki-model.mjs'
const props=defineProps({game:{type:String,required:true},category:{type:String,default:''}})
const query=ref(''),sort=ref('title')
const definition=computed(()=>wikis[props.game]?.groups.find(g=>g.id===props.category))
const pages=computed(()=>filterPages(data,props.game,query.value,props.category).filter(p=>!p.url.includes('/categories/')&&!p.url.includes('/all-pages')).sort((a,b)=>sort.value==='updated'?(b.updated||'').localeCompare(a.updated||''):a.title.localeCompare(b.title,'zh-CN')))
const children=computed(()=>wikis[props.game]?.groups.filter(g=>g.parent===props.category)||[])
</script>
<template><section aria-label="页面目录">
<p v-if="definition">{{definition.description || '本分类自动收录所属页面；同一页面可以出现在多个分类中。'}}</p>
<ul v-if="children.length"><li v-for="g in children" :key="g.id"><a :href="withBase('/games/'+game+'/categories/'+g.id)">{{g.title}}</a></li></ul>
<div class="archive-controls"><label>筛选页面 <input v-model="query" aria-label="筛选页面" type="search" placeholder="标题或正文关键词" /></label><label>排序 <select v-model="sort" aria-label="页面排序"><option value="title">标题</option><option value="updated">最近更新</option></select></label></div>
<p role="status">{{pages.length}} 个页面 · 仅当前游戏 Wiki</p>
<ul class="page-directory"><li v-for="p in pages" :key="p.url"><a :href="withBase(p.url)">{{p.title}}</a><span>{{p.kind}}</span><small v-if="p.updated">{{p.updated.slice(0,10)}}</small></li></ul>
<p v-if="!pages.length">暂未收录匹配页面。</p>
</section></template>
