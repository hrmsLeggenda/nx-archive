<script setup>
import { ref, computed } from 'vue'
import { withBase } from 'vitepress'
import wikis from '../../../data/wikis.json'
import WikiSearch from './WikiSearch.vue'
const props = defineProps({ game: { type:String,required:true } })
const wiki = computed(() => wikis[props.game])
const category = ref('all')
const groups = computed(() => wiki.value.groups.filter(g => category.value === 'all' || g.id === category.value))
</script>
<template>
<div class="wiki-portal">
<header class="wiki-hero"><span>NX ARCHIVE / GAME WIKI</span><h1>{{ wiki.title }}</h1><p>{{ wiki.subtitle }}</p><small>攻略、分类与互动地图，都在这个游戏的 Wiki 中。</small></header>
<WikiSearch :game="game" />
<div class="wiki-tabs" aria-label="资料分类"><button :aria-pressed="category === 'all'" @click="category='all'">全部栏目</button><button v-for="group in wiki.groups" :key="group.id" :aria-pressed="category === group.id" @click="category=group.id">{{ group.title }}</button></div>
<section v-for="group in groups" :key="group.id"><h2>{{ group.title }}</h2><div class="wiki-links"><a v-for="(item, index) in group.items" :key="item.path" :href="withBase('/games/' + game + '/' + item.path)"><span>0{{ index+1 }}</span><strong>{{ item.title }}</strong><b>↗</b></a></div></section>
<aside class="wiki-note"><strong>当前覆盖范围</strong><p>首批资料包含入门、篇章结构、部分挖角与职业条件，以及地点索引。原始资料已标明来源与核对状态；地理地图待补充。</p></aside>
</div>
</template>
<style scoped>
.wiki-hero { padding:44px 32px; margin:24px 0; border-radius:20px; color:#f5efdf; background:linear-gradient(130deg,#203a37,#304c48); border-bottom:4px solid #c8a66b; }.wiki-hero span { font-size:12px;letter-spacing:.2em;color:#d8bf93; }.wiki-hero h1 { font-size:clamp(26px,4vw,44px);line-height:1.3;margin:18px 0; }.wiki-hero p { font-size:18px; }.wiki-tabs { display:flex;flex-wrap:wrap;gap:8px;margin:28px 0; }.wiki-tabs button { padding:8px 14px;border:1px solid var(--vp-c-divider);border-radius:20px;cursor:pointer; }.wiki-tabs button[aria-pressed=true] { background:var(--vp-c-brand-1);color:var(--vp-c-bg); }.wiki-links { display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px; }.wiki-links a { display:flex;align-items:center;gap:16px;padding:22px;border:1px solid var(--vp-c-divider);border-radius:12px;background:var(--vp-c-bg-soft);text-decoration:none; }.wiki-links a span { color:#b38f53;font-size:20px; }.wiki-links a b { margin-left:auto; }.wiki-note { margin:32px 0;padding:20px 24px;border-left:3px solid #c8a66b;background:var(--vp-c-bg-soft); }
</style>
