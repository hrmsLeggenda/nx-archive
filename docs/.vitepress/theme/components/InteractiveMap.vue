<script setup>
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
const props = defineProps({ data: { type: Object, required: true } })
const data = props.data
import { filterMarkers, parseProgress, clampZoom } from './map-state.mjs'
const category = ref(''), query = ref(''), hideCompleted = ref(false), completed = ref([]), selected = ref(null)
const zoom = ref(1), offset = ref({ x: 0, y: 0 }), storageMessage = ref(''), viewport = ref(null)
const key = 'nx-archive:map:' + data.gameId + ':' + data.id
const categories = [...new Set(data.markers.map(m => m.type))]
const visible = computed(() => filterMarkers(data.markers, category.value, query.value, hideCompleted.value, completed.value))
onMounted(() => { try { completed.value = parseProgress(localStorage.getItem(key), data.markers.map(m => m.id)) } catch { storageMessage.value = '浏览器存储不可用，进度仅保留到关闭页面。' } })
function save() { try { localStorage.setItem(key, JSON.stringify(completed.value)) } catch { storageMessage.value = '保存失败，进度仅在当前页面有效。' } }
function toggle(id) { completed.value = completed.value.includes(id) ? completed.value.filter(v => v !== id) : [...completed.value, id]; save() }
function resetProgress() { if (window.confirm('清空本地图的所有完成记录？')) { completed.value = []; save() } }
function resetView() { zoom.value = 1; offset.value = { x: 0, y: 0 } }
function setZoom(value) { zoom.value = clampZoom(value); if (zoom.value === 1) offset.value = { x: 0, y: 0 } }
let drag = null
function start(event) { if (event.button !== 0 || event.target.closest('[data-marker]')) return; drag = { id:event.pointerId, x:event.clientX, y:event.clientY, origin: { ...offset.value } }; event.currentTarget.setPointerCapture(event.pointerId) }
function move(event) { if (!drag || drag.id !== event.pointerId) return; offset.value = { x: drag.origin.x + event.clientX - drag.x, y: drag.origin.y + event.clientY - drag.y } }
function stop() { drag = null }
function pan(event) { const directions = { ArrowLeft:[30,0], ArrowRight:[-30,0], ArrowUp:[0,30], ArrowDown:[0,-30] }; if (directions[event.key]) { event.preventDefault(); const [x,y] = directions[event.key]; offset.value = {x:offset.value.x+x,y:offset.value.y+y} } }
</script>
<template>
<section class="map-app" aria-label="互动地图">
<p v-if="data.notice" class="map-notice">{{ data.notice }}</p>
<div class="archive-controls"><label>点位 <input v-model="query" type="search" placeholder="搜索点位" /></label><label>分类 <select v-model="category"><option value="">全部类型</option><option v-for="type in categories" :key="type">{{ type }}</option></select></label><label><input v-model="hideCompleted" type="checkbox" />隐藏已完成</label></div>
<div class="map-toolbar"><strong>{{ data.title }}</strong><span aria-live="polite">已完成 {{ completed.length }} / {{ data.markers.length }}</span><button @click="setZoom(zoom + .25)" aria-label="放大地图">＋</button><button @click="setZoom(zoom - .25)" aria-label="缩小地图">−</button><button @click="resetView">重置视图</button></div>
<div class="map-viewport" ref="viewport" tabindex="0" aria-label="可拖动地图，使用方向键平移；点位也可在下方列表选择" @keydown="pan" @pointerdown="start" @pointermove="move" @pointerup="stop" @pointercancel="stop" @lostpointercapture="stop" @wheel.prevent="setZoom(zoom + ($event.deltaY < 0 ? .15 : -.15))">
<svg viewBox="0 0 100 100" role="img" aria-label="地图或地点索引示意图"><g :transform="`translate(${offset.x / (viewport?.clientWidth || 600) * 100} ${offset.y / (viewport?.clientHeight || 500) * 100}) translate(50 50) scale(${zoom}) translate(-50 -50)`">
<rect x="-500" y="-500" width="1000" height="1000" fill="#c9e6ea"/><path v-if="data.mode !== 'index'" d="M12 45L21 21 43 13 58 22 79 18 91 43 85 73 61 89 37 85 15 67Z" fill="#d8e3ba" stroke="#9bb491" stroke-width=".6"/><path v-if="data.mode !== 'index'" d="M41 17Q70 36 46 50T60 86" fill="none" stroke="#80c5d4" stroke-width="3"/><path v-if="data.mode !== 'index'" d="M23 58L33 39 41 57M55 31L65 17 73 34M68 68L78 54 86 70" fill="#a5b993" stroke="#94a982" stroke-width=".5"/><path v-if="data.mode !== 'index'" d="M28 62Q44 72 75 70M28 62Q37 38 60 30" fill="none" stroke="#eebc73" stroke-width="1" stroke-dasharray="2 1"/>
<g v-for="marker in visible" :key="marker.id" data-marker @click="selected = marker"><circle :cx="marker.x" :cy="marker.y" r="2" :fill="completed.includes(marker.id) ? '#6b7280' : '#087f75'" stroke="white" stroke-width=".6"/><text :x="marker.x + 3" :y="marker.y + 1" font-size="2.3" fill="#183a38">{{ marker.name }}</text></g>
</g></svg></div>
<div class="map-bottom"><div><h3>点位列表（{{ visible.length }}）</h3><ul class="marker-list"><li v-for="marker in visible" :key="marker.id"><button @click="selected = marker" :aria-pressed="selected?.id === marker.id">{{ completed.includes(marker.id) ? '✓ ' : '○ ' }}{{ marker.name }} · {{ marker.type }}</button></li></ul><p v-if="!visible.length">没有匹配的点位。</p></div><aside aria-live="polite"><template v-if="selected"><h3>{{ selected.name }}</h3><p>{{ selected.type }} · 坐标 {{ selected.x }}, {{ selected.y }}</p><p>{{ selected.description }}</p><p v-if="selected.link"><a :href="withBase(selected.link)">阅读关联攻略 →</a></p><button class="primary" @click="toggle(selected.id)">{{ completed.includes(selected.id) ? '取消完成' : '标记完成' }}</button></template><p v-else>选择地图点位或列表项目，查看详情与记录进度。</p></aside></div>
<p role="status">{{ storageMessage }}</p><button @click="resetProgress">清空本地图进度</button>
</section>
</template>
<style scoped>
.map-app button { border:1px solid var(--vp-c-divider); padding:8px 12px; border-radius:8px; background:var(--vp-c-bg-soft); cursor:pointer; color:var(--vp-c-text-1); }
.map-app button:hover,.map-app button:focus-visible { outline:2px solid var(--vp-c-brand-1); }
.map-toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; padding:12px; background:var(--vp-c-bg-soft); border-radius:12px 12px 0 0; }
.map-toolbar strong { margin-right:auto; }
.map-viewport { height:460px; overflow:hidden; cursor:grab; touch-action:none; background:#c9e6ea; }
.map-viewport svg { display:block; width:100%; height:100%; }
.map-viewport [data-marker] { cursor:pointer; }
.map-bottom { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:20px 0; }
.marker-list { list-style:none; padding:0; }.marker-list button { width:100%; text-align:left; }
.map-app .primary { background:#087f75; color:white; }
@media(max-width:640px) { .map-bottom { grid-template-columns:1fr; }.map-viewport { height:340px; } }
</style>
