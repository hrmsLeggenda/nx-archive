<script setup>
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'
import db from '../../../games/fire-emblem-fw/data/generated/database.json'
import { effectiveGrowth, expectation } from './fwe-growth.mjs'
import graph from '../../../games/fire-emblem-fw/data/generated/entities.json'
import {entityForName} from './entity-model.mjs'
const tab=ref('characters'), query=ref(''), tier=ref(''), sort=ref('name')
const unit=ref(db.characters[0].name), job=ref(db.classes[0].name), levels=ref(10)
const labels={HP:'生命',Str:'力量',Mag:'魔力',Spd:'速度',Dex:'技巧',Def:'防御',Res:'魔防',Lck:'幸运',Cha:'魅力'}
const selectedUnit=computed(()=>db.characters.find(r=>r.name===unit.value))
const selectedJob=computed(()=>db.classes.find(r=>r.name===job.value))
const records=computed(()=>{
 const result=db[tab.value].filter(r=>(!tier.value || tab.value!=='classes' || r.tier===tier.value) && JSON.stringify(r).toLowerCase().includes(query.value.trim().toLowerCase()))
 return [...result].sort((a,b)=>sort.value==='name' ? a.name.localeCompare(b.name) : (b.growths?.[sort.value] ?? -999)-(a.growths?.[sort.value] ?? -999))
})
const tiers=[...new Set(db.classes.map(r=>r.tier).filter(Boolean))]
</script>
<template>
<section aria-label="万缕千丝数据库">
<p>已导入 {{db.characters.length}} 人物、{{db.classes.length}} 职业；补丁版本未确认。英文名称沿用来源，中文译名持续核对。</p>
<div class="archive-controls"><label>资料类型 <select v-model="tab"><option value="characters">人物</option><option value="classes">职业</option><option value="spells">法术习得</option><option value="bloodmarks">血印与持有者</option><option value="arts">主角战技条件</option><option value="skillPreferences">技能擅长</option></select></label><label>搜索 <input type="search" v-model="query" placeholder="名称、阵营、技能" /></label><label v-if="tab==='classes'">职业层级 <select v-model="tier"><option value="">全部</option><option v-for="t in tiers" :key="t">{{t}}</option></select></label><label v-if="tab==='characters'||tab==='classes'">排序 <select v-model="sort"><option value="name">名称</option><option v-for="s in db.stats" :key="s" :value="s">{{labels[s]}}成长降序</option></select></label></div>
<p role="status">匹配 {{records.length}} 项</p>
<div class="scroll" tabindex="0" aria-label="可横向滚动数据表"><table v-if="tab==='characters'||tab==='classes'"><thead><tr><th>名称</th><th>{{tab==='characters'?'阵营':'层级'}}</th><th v-for="s in db.stats" :key="s">{{labels[s]}}%</th></tr></thead><tbody><tr v-for="r in records" :key="r.name"><td><a :href="withBase(entityForName(graph,tab,r.name)?.url || '/games/fire-emblem-fw/database')">{{r.nameZh || r.name}}</a></td><td>{{r.faction || r.tier || '未记录'}}</td><td v-for="s in db.stats" :key="s">{{r.growths[s] ?? '—'}}</td></tr></tbody></table>
<ul v-else><li v-for="(r,i) in records" :key="i">{{r.name}} · {{r.spell || r.mark || r.art || r.skill}} · {{r.skill_level || r.learned || r.kind || r.holders}}</li></ul></div>
<details v-if="tab==='classes'"><summary>职业转职条件与特性名称</summary><article v-for="r in records" :key="r.name"><h3>{{r.nameZh || r.name}}</h3><p>许可证：{{r.license || '未记录'}}；参考等级：{{r.ideal_lv || '未记录'}}；名望：{{r.renown_lv || '未记录'}}</p><p>主要技能：{{r.primary_skill || '未记录'}}；次要技能：{{r.secondary_skill || '未记录'}}；移动：{{r.movement || '未记录'}}；武器：{{r.weapons || '未记录'}}</p><p>职业能力：{{r.class_ability || '未记录'}}；精通能力：{{r.master_ability || '未记录'}}。效果请查看<a :href="r.source">来源</a>。</p></article></details>
<h2>成长期望模拟器</h2>
<p>同一职业连续升级的数学期望，不预测随机数、属性上限、转职保底、个人能力或继承。升级次数从当前等级之后开始计算。</p>
<div class="archive-controls"><label>人物 <select aria-label="人物" v-model="unit"><option v-for="r in db.characters" :key="r.name" :value="r.name">{{r.nameZh || r.name}}</option></select></label><label>职业 <select aria-label="职业" v-model="job"><option v-for="r in db.classes" :key="r.name">{{r.nameZh || r.name}}</option></select></label><label>升级次数 <input aria-label="升级次数" type="number" min="0" max="99" v-model.number="levels" /></label></div>
<div class="scroll"><table><thead><tr><th>属性</th><th>人物%</th><th>职业%</th><th>合计%</th><th>期望增长</th><th>职业加值</th></tr></thead><tbody><tr v-for="s in db.stats" :key="s"><td>{{labels[s]}}</td><td>{{selectedUnit.growths[s] ?? '—'}}</td><td>{{selectedJob.growths[s] ?? '—'}}</td><td>{{effectiveGrowth(selectedUnit.growths[s],selectedJob.growths[s]) ?? '—'}}</td><td>{{expectation(selectedUnit.growths[s],selectedJob.growths[s],Number.isFinite(levels)?Math.min(99,levels):0)?.toFixed(2) ?? '—'}}</td><td>{{selectedJob.statBonus[s] ?? '—'}}</td></tr></tbody></table></div>
<p>有效数据包含 {{db.corrections.applied}} 项人工字段记录；{{db.corrections.needsReview}} 项上游变化待复核。<a :href="withBase('/games/fire-emblem-fw/data-editor')">结构化编辑与勘误记录</a></p>
<h2>核对记录</h2><p>Serenes Forest 核对范围：{{db.crosscheck.scope.join('、')}}。发现 {{db.crosscheck.discrepancies.length}} 项差异，上游基线与参考差异保留，人工修正在有效数据中另行合成。</p><ul><li v-for="(r,i) in db.crosscheck.discrepancies" :key="i">{{r.name}} {{r.stat}}：上游 {{r.upstream}}，参考 {{r.reference}}</li></ul>
<p><a :href="db.crosscheck.source">核对来源</a> · <a :href="withBase('/games/fire-emblem-fw/data/generated/characters')">人物静态总表</a> · <a :href="withBase('/games/fire-emblem-fw/data/generated/classes')">职业静态总表</a></p>
</section>
</template>
<style scoped>.scroll{overflow-x:auto;max-width:100%} input,select{border:1px solid var(--vp-c-divider);border-radius:6px;padding:6px;background:var(--vp-c-bg);color:var(--vp-c-text-1)} td,th{white-space:nowrap} article{border-bottom:1px solid var(--vp-c-divider)}</style>
