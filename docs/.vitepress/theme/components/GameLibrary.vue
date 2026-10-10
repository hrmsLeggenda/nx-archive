<script setup>
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import games from '../../../data/games.json'
const query = ref(''), platform = ref('全部')
const filtered = computed(() => games.filter(g => (platform.value === '全部' || g.platform === platform.value) && (g.title + g.category).toLowerCase().includes(query.value.trim().toLowerCase())))
</script>
<template>
<section aria-label="游戏目录">
<div class="archive-controls"><label>游戏检索 <input v-model="query" type="search" placeholder="输入游戏名称或类型" /></label><label>平台 <select v-model="platform"><option>全部</option><option>Switch</option><option>Switch 2</option></select></label></div>
<p aria-live="polite">共 {{ filtered.length }} 个游戏板块</p>
<div class="game-grid"><article class="game-card" v-for="game in filtered" :key="game.id"><span class="eyebrow">{{ game.platform }} / {{ game.category }}</span><h3>{{ game.title }}</h3><p>{{ game.description }}</p><small>{{ game.status }}</small><br /><a :href="withBase('/games/' + game.id + '/')">进入攻略板块 →</a></article></div>
<p v-if="!filtered.length">没有匹配的游戏，试试其他关键词。</p>
</section>
</template>
