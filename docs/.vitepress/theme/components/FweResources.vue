<script setup>
import { computed, ref, onMounted } from 'vue'
import resources from '../../../games/fire-emblem-fw/data/generated/resources.json'
import timeline from '../../../games/fire-emblem-fw/data/generated/timeline.json'
import {withBase} from 'vitepress'
import graph from '../../../games/fire-emblem-fw/data/generated/entities.json'
import {entityForName} from './entity-model.mjs'
import { matchesRecord } from './fwe-growth.mjs'
const props=defineProps({mode:{type:String,default:'resources'}})
const phase=ref('part1'), route=ref(''), query=ref(''), method=ref(''), chapter=ref('')
const locationFilter=ref('')
onMounted(()=>{const location=new URLSearchParams(window.location.search).get('location');if(resources.some(r=>r.locationId===location))locationFilter.value=location})
const filteredLocation=computed(()=>resources.find(r=>r.locationId===locationFilter.value)?.location)
const routeLabels={Cai:'凯伊',Dietrich:'迪托利希',Theodora:'塞奥朵拉',Leda:'蕾达',Salvation:'救世篇'}
const phaseLabels={part1:'第一部',part3:'第三部·救世篇'}
const rows=computed(()=>(props.mode==='timeline'?timeline:resources).filter(r=>matchesRecord(r,phase.value,route.value,query.value) && (!locationFilter.value || r.locationId===locationFilter.value) && (!method.value || r.method===method.value) && (!chapter.value || r.chapter===Number(chapter.value))))
const map=computed(()=>{
 const groups=[...new Set(rows.value.map(r=>r.locationId))]
 return {id:'resource-index-v2-'+phase.value+'-'+(route.value||'all'),gameId:'fire-emblem-fw',progressIds:[...new Set(resources.map(r=>r.locationId))],mode:'index',title:'资源地点索引',
 notice:'卡片位置仅为阅读布局，不表示实际坐标、距离或通行关系。宝箱与材料分开记录；未录入资源不代表游戏中不存在。',
 markers:groups.map((id,i)=>{const group=rows.value.filter(r=>r.locationId===id);const r=group[0];return {id,name:r.location,type:'地牢',x:20+(i%2)*45,y:25+Math.floor(i/2)*35,description:phaseLabels[r.phase]+' · '+group.map(x=>(x.method==='chest'?'宝箱：':'采集池：')+x.resource).join('；'),link:entityForName(graph,'places',r.locationOriginal)?.url || '/games/fire-emblem-fw/resources'}})}
})
function phaseChanged(){route.value=''}
</script>
<template>
<section :aria-label="mode==='timeline'?'章节资源时间轴':'阶段资源检索'">
<div class="archive-controls"><label>阶段 <select aria-label="阶段" v-model="phase" @change="phaseChanged"><option value="part1">第一部</option><option value="part3">第三部·救世篇</option></select></label><label>路线 <select aria-label="路线" v-model="route"><option value="">全部</option><template v-for="(label,id) in routeLabels" :key="id"><option v-if="phase==='part1'?id!=='Salvation':id==='Salvation'" :value="id">{{label}}</option></template></select></label><label>搜索 <input type="search" v-model="query" placeholder="地点、物品、条件" /></label><label v-if="mode==='timeline'">章节 <input type="number" min="1" max="20" v-model="chapter" /></label><label v-else>获取方式 <select v-model="method"><option value="">全部</option><option value="chest">固定宝箱</option><option value="gather">随机采集池</option></select></label></div>
<p v-if="filteredLocation">当前地点：{{filteredLocation}} <button @click="locationFilter=''">查看全部地点</button></p>
<p role="status">已录入匹配 {{rows.length}} 条；资料覆盖有限，空结果表示暂未录入。</p>
<template v-if="mode==='timeline'"><article v-for="r in [...rows].sort((a,b)=>a.chapter-b.chapter)" :key="r.id"><h3>第{{r.chapter}}章 · <a :href="withBase(entityForName(graph,'quests',r.id)?.url || '/games/fire-emblem-fw/timeline')">{{r.title}}</a></h3><p>{{r.routes.map(v=>routeLabels[v]).join(' / ')}} · {{r.certainty==='fixed'?'固定事件':'有条件，非必定出现'}}</p><p>{{r.condition}}</p><p>奖励／解锁：{{r.rewards.join('、') || '功能解锁，无物品奖励记录'}}；截止：{{r.deadline || '未记录'}}</p><p v-if="r.deadlineNote">{{r.deadlineNote}}</p><a :href="r.source" target="_blank" rel="noopener noreferrer">查看来源</a> · <a :href="withBase('/games/fire-emblem-fw/data-editor?dataset=timeline&record='+r.id)">编辑结构化记录</a></article></template>
<template v-else><InteractiveMap v-if="mode==='map'" :key="map.id" :data="map" /><div class="scroll"><table><thead><tr><th>地点</th><th>物品原名</th><th>方式</th><th>数量</th><th>刷新</th><th>来源</th><th>维护</th></tr></thead><tbody><tr v-for="r in rows" :key="r.id"><td><a :href="withBase(entityForName(graph,'places',r.locationOriginal)?.url || '/games/fire-emblem-fw/resources')">{{r.location}}</a><br/>{{r.locationOriginal}}</td><td><a :href="withBase(entityForName(graph,'items',r.resource)?.url || '/games/fire-emblem-fw/resources')">{{r.resource}}</a></td><td>{{r.method==='chest'?'固定宝箱':'随机采集池'}}</td><td>{{r.quantity ?? '未确认'}}</td><td>{{r.refresh==='once-per-protagonist'?'每主角一次':r.refresh==='repeatable'?'可重复获取':'未确认'}}</td><td><a :href="r.source">来源</a></td><td><a :href="withBase('/games/fire-emblem-fw/data-editor?dataset=resources&record='+r.id)">勘误</a></td></tr></tbody></table></div></template>
<p v-if="!rows.length">当前阶段、路线或关键词没有已录入记录。</p>
</section>
</template>
<style scoped>.scroll{overflow-x:auto} input,select{border:1px solid var(--vp-c-divider);border-radius:6px;padding:6px;background:var(--vp-c-bg);color:var(--vp-c-text-1)}article{border-bottom:1px solid var(--vp-c-divider);padding:12px 0}</style>
