<script setup>
import {ref,onMounted,onBeforeUnmount,watch,nextTick} from 'vue'
import {withBase} from 'vitepress'
import '@toast-ui/editor/dist/toastui-editor-viewer.css'
const props=defineProps({content:{type:String,default:''},pageUrl:{type:String,default:'/'}})
const host=ref(null),outline=ref([]),error=ref('')
let viewer,stopped=false
async function updateOutline(){
 await nextTick()
 outline.value=Array.from(host.value?.querySelectorAll('h1,h2,h3')||[]).map((node,i)=>{
  node.id='wiki-section-'+i
  return {id:node.id,text:node.textContent,level:Number(node.tagName[1])}
 })
 // Keep imported links in the repository's Pages base path.
 host.value?.querySelectorAll('a[href]').forEach(a=>{
  const href=a.getAttribute('href')
  if(href.startsWith('#'))return
  if(href.startsWith('/')&&!href.startsWith('//')){a.setAttribute('href',href.startsWith('/nx-archive/')?href:withBase(href));return}
  if(!/^[a-z][a-z0-9+.-]*:|^\/\//i.test(href)){
   const target=new URL(href,'https://wiki.invalid'+props.pageUrl)
   a.setAttribute('href',withBase(target.pathname.replace(/\.md$/,'.html'))+target.search+target.hash)
  }
 })
 host.value?.querySelectorAll('img').forEach(img=>{img.loading='lazy'})
}
onMounted(async()=>{try{
 const {default:Viewer}=await import('@toast-ui/editor/dist/toastui-editor-viewer')
 if(stopped)return
 viewer=new Viewer({el:host.value,initialValue:props.content,usageStatistics:false,events:{load:updateOutline}})
 await updateOutline()
}catch{error.value='文档显示组件加载失败。请刷新重试；原始正文保留在下方。'}})
watch(()=>props.content,async value=>{if(viewer){viewer.setMarkdown(value);await updateOutline()}})
onBeforeUnmount(()=>{stopped=true;viewer?.destroy()})
function jump(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})}
</script>
<template><div class="document-reading"><article ref="host" class="document-body" aria-label="Wiki 文档正文"></article><aside v-if="outline.length" class="document-outline" aria-label="本页目录"><strong>本页目录</strong><button v-for="h in outline" :key="h.id" :class="{nested:h.level>1}" @click="jump(h.id)">{{h.text}}</button></aside></div><div v-if="error" role="alert"><p>{{error}}</p><pre>{{content}}</pre></div></template>
<style scoped>
.document-reading{display:grid;grid-template-columns:minmax(0,1fr) 168px;gap:32px;align-items:start}.document-body{min-width:0;overflow-wrap:anywhere}.document-outline{position:sticky;top:80px;border-left:1px solid var(--vp-c-divider);padding-left:16px;font-size:12px;max-height:calc(100vh - 100px);overflow:auto}.document-outline strong{display:block;margin-bottom:12px}.document-outline button{display:block;text-align:left;color:var(--vp-c-text-2);padding:6px 0;line-height:1.6;width:100%}.document-outline button:hover{color:var(--vp-c-brand-1)}.document-outline .nested{padding-left:10px}.document-body :deep(.toastui-editor-contents){font-size:16px;line-height:1.85;color:var(--vp-c-text-1);font-family:var(--vp-font-family-base)}.document-body :deep(.toastui-editor-contents p){color:inherit;line-height:1.85}.document-body :deep(.toastui-editor-contents h1),.document-body :deep(.toastui-editor-contents h2),.document-body :deep(.toastui-editor-contents h3){color:inherit;scroll-margin-top:80px}.document-body :deep(img){max-width:100%;height:auto}.document-body :deep(table){display:block;max-width:100%;overflow:auto}.document-body :deep(pre){overflow:auto}.document-body :deep(a){color:var(--vp-c-brand-1)}pre{white-space:pre-wrap}@media(max-width:1100px){.document-reading{grid-template-columns:minmax(0,1fr)}.document-outline{display:none}}
</style>
