<script setup>
import {computed} from 'vue'
import {withBase} from 'vitepress'
import wikis from '../../../data/wikis.json'
import {data} from './wiki-pages.data'
import {categoryCounts} from './wiki-model.mjs'
import WikiSearch from './WikiSearch.vue'
import SiteUpdates from './SiteUpdates.vue'
const props=defineProps({game:{type:String,required:true}})
const wiki=computed(()=>wikis[props.game])
const counts=computed(()=>categoryCounts(data,props.game))
const pageCount=computed(()=>data.filter(p=>p.game===props.game&&!p.url.includes('/categories/')).length)
</script>
<template><div class="wiki-portal"><header class="wiki-hero"><span>NX ARCHIVE / GAME WIKI</span><h1>{{wiki.title}}</h1><p>{{wiki.subtitle}}</p><small>{{pageCount}} 个页面 · {{wiki.groups.length}} 个分类 · 玩家维护</small></header>
<WikiSearch :game="game" />
<section><h2>探索这个 Wiki</h2><div class="wiki-links"><article v-for="group in wiki.groups.filter(g=>!g.parent)" :key="group.id"><a class="category-title" :href="withBase('/games/'+game+'/categories/'+group.id)">{{group.title}} <small>{{counts[group.id]||0}} 页</small></a><ul><li v-for="item in group.items.slice(0,4)" :key="item.path"><a :href="withBase('/games/'+game+'/'+item.path)">{{item.title}}</a></li></ul></article></div></section>
<p><a :href="withBase('/games/'+game+'/all-pages')">浏览全部页面 →</a> · <a :href="withBase('/contribute')">参与维护 →</a></p>
<SiteUpdates :game="game" />
<aside class="wiki-note"><strong>资料覆盖</strong><p>{{wiki.coverage || '本游戏资料正在筹备，当前内容以页面注明的维护状态为准。'}}</p></aside>
</div></template>
<style scoped>.wiki-hero{padding:36px 28px;margin:24px 0;border-radius:20px;color:#f5efdf;background:linear-gradient(130deg,#203a37,#304c48);border-bottom:4px solid #c8a66b}.wiki-hero span{font-size:12px;letter-spacing:.16em;color:#d8bf93}.wiki-hero h1{font-size:clamp(26px,4vw,42px);line-height:1.3;margin:18px 0}.wiki-links{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}.wiki-links article{border:1px solid var(--vp-c-divider);border-radius:14px;padding:22px;background:var(--vp-c-bg-soft)}.category-title{font-size:18px;font-weight:650}.category-title small{font-size:12px;color:var(--vp-c-text-2)}.wiki-note{margin:32px 0;padding:20px 24px;border-left:3px solid #c8a66b;background:var(--vp-c-bg-soft)}</style>
