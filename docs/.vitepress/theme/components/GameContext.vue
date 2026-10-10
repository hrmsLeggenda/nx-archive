<script setup>
import {computed,ref,onMounted,onUnmounted} from 'vue'
import {useRoute,useData,withBase} from 'vitepress'
import wikis from '../../../data/wikis.json'
import {data} from './wiki-pages.data'
import {gameFromUrl,normalizeUrl} from './wiki-model.mjs'
const route=useRoute(), {page}=useData()
const desktop=ref(false)
let media
const resize=()=>{desktop.value=media.matches}
onMounted(()=>{media=window.matchMedia('(min-width:960px)');resize();media.addEventListener('change',resize)})
onUnmounted(()=>media?.removeEventListener('change',resize))
const game=computed(()=>gameFromUrl(route.path))
const wiki=computed(()=>wikis[game.value])
const current=computed(()=>data.find(p=>normalizeUrl(p.url)===normalizeUrl(route.path.replace(/^\/nx-archive/,''))))
const sourcePath=computed(()=>page.value.relativePath)
</script>
<template><header v-if="wiki" class="wiki-context">
<nav class="breadcrumbs" aria-label="面包屑"><a :href="withBase('/')">NX Archive</a><span>›</span><a :href="withBase('/games/')">游戏 Wiki</a><span>›</span><a :href="withBase('/games/'+game+'/')">{{wiki.title}}</a></nav>
<details class="wiki-navigation" :open="desktop"><summary>{{wiki.title}} · Wiki 导航</summary><nav aria-label="游戏 Wiki 导航"><a :href="withBase('/games/'+game+'/')">Wiki 首页</a><a v-for="group in wiki.groups.filter(g=>!g.parent)" :key="group.id" :href="withBase('/games/'+game+'/categories/'+group.id)">{{group.title}}</a><a :href="withBase('/games/'+game+'/all-pages')">全部页面</a><a :href="withBase('/games/'+game+'/edit')">创建页面</a></nav></details>
<div v-if="sourcePath && !current?.generated" class="page-actions" aria-label="页面操作"><span aria-current="page">阅读</span><a v-if="sourcePath!=='games/'+game+'/edit.md'" :href="withBase('/games/'+game+'/edit?page='+encodeURIComponent(sourcePath.replace('games/'+game+'/','').replace(/\.md$/,'')))">编辑页面</a><a :href="'https://github.com/hrmsLeggenda/nx-archive/edit/main/docs/'+sourcePath" target="_blank" rel="noopener noreferrer">在 GitHub 编辑</a><a :href="'https://github.com/hrmsLeggenda/nx-archive/commits/main/docs/'+sourcePath" target="_blank" rel="noopener noreferrer">版本历史</a></div>
<div v-else-if="current?.generated" class="page-actions"><span>自动生成条目</span><a v-if="current.entityId" :href="withBase('/games/'+game+'/edit?entity='+encodeURIComponent(current.entityId))">补充或勘误</a><a :href="withBase('/games/'+game+'/sources')">来源与维护说明</a></div>
<nav v-if="current?.categories.length" class="category-tags" aria-label="页面分类"><a v-for="id in current.categories" :key="id" :href="withBase('/games/'+game+'/categories/'+id)">{{wiki.groups.find(g=>g.id===id)?.title || id}}</a></nav>
<details v-if="current?.metadata?.platform" class="page-metadata"><summary>资料范围与来源 · {{current.metadata.platform}} · 版本 {{current.metadata.version || '未确认'}} · 剧透 {{current.metadata.spoiler || '未标注'}}</summary><p>核对日期：{{current.metadata.verified || '未记录'}}</p><ul><li v-for="(url,i) in current.metadata.sources" :key="url"><a :href="/^https?:\/\//.test(url)?url:undefined" target="_blank" rel="noopener noreferrer">资料来源 {{i+1}}</a></li></ul></details>
</header></template>
