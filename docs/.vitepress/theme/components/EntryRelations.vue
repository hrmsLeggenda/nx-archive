<script setup>
import {computed} from 'vue'
import {useData,withBase} from 'vitepress'
import graph from '../../../games/fire-emblem-fw/data/generated/entities.json'
const {frontmatter}=useData()
const current=computed(()=>frontmatter.value.entityId)
const relations=computed(()=>{
 const ids=new Set(graph.edges.filter(e=>e.from===current.value||e.to===current.value).map(e=>e.from===current.value?e.to:e.from))
 return graph.entities.filter(e=>ids.has(e.id))
})
</script>
<template><section v-if="relations.length" aria-label="关联条目"><h2>关联条目</h2><ul><li v-for="e in relations" :key="e.id"><a :href="withBase(e.url)">{{e.title}}</a></li></ul></section></template>
