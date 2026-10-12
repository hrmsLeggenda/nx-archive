<script setup>
import CollaborationSubmit from './CollaborationSubmit.vue'
import {computed,ref,watch,onMounted,onBeforeUnmount} from 'vue'
import {useRoute,withBase} from 'vitepress'
import wikis from '../../../data/wikis.json'
import {data as sources} from './editor-pages.data'
import {data as index} from './wiki-pages.data'
import {gameFromUrl} from './wiki-model.mjs'
import {templates,readFields,writeFields,validateDocument,draftKey,readDraft,saveDraft,compareRevision,githubTarget,lineDiff,previewMarkdown,sourcePath,REPO} from './editor-model.mjs'
const route=useRoute(),game=computed(()=>gameFromUrl(route.path)),wiki=computed(()=>wikis[game.value])
const raw=ref(''),path=ref('guides/'),summary=ref(''),template=ref('guide'),tab=ref('write')
const originalPath=ref(''),baseRaw=ref(''),baseSha=ref(null),pendingDraft=ref(null),draftConflict=ref(false)
const ready=ref(false),storageStatus=ref(''),status=ref(''),checkState=ref('unchecked'),checking=ref(false)
const acknowledged=ref(false),entity=ref(null),invalidTarget=ref(false),copied=ref(false)
const fields=computed(()=>readFields(raw.value))
const catalog=computed(()=>index.map(p=>({...p,path:p.url.replace('/games/'+p.game+'/','').replace(/\.html$/,'').replace(/\/$/,'/index')||'index'})))
const errors=computed(()=>validateDocument({raw:raw.value,game:game.value,path:path.value,wikis,pages:catalog.value,originalPath:originalPath.value,summary:summary.value}))
const preview=computed(()=>previewMarkdown(raw.value))
const diff=computed(()=>lineDiff(baseRaw.value,raw.value))
let sessionKey=''
const target=computed(()=>githubTarget(game.value,path.value,Boolean(originalPath.value)))
const canSubmit=computed(()=>ready.value&&!invalidTarget.value&&!errors.value.length&&!draftConflict.value&&
 (checkState.value==='clean'||(checkState.value==='unavailable'&&acknowledged.value)))
let timer,controller,epoch=0
function storage(){try{return window.localStorage}catch{return null}}
function patch(name,value){raw.value=writeFields(raw.value,{[name]:value,title:name==='title'?value:fields.value.title})}
function listValue(name,value){patch(name,value.split(/\r?\n|[,，]/).map(s=>s.trim()).filter(Boolean))}
function category(id,checked){patch('categories',checked?[...new Set([...fields.value.categories,id])]:fields.value.categories.filter(c=>c!==id))}
function blank(type){
 const today=new Date().toLocaleDateString('sv-SE')
 return writeFields(templates[type].body,{title:entity.value?entity.value.title+' · 补充与勘误':'',kind:templates[type].label,
  categories:entity.value?.categories||[wiki.value.groups.find(g=>g.id==='reference')?.id||wiki.value.groups[0].id],
  aliases:[],platform:game.value==='fire-emblem-fw'?'Switch 2':'待确认',version:'未确认',spoiler:'无',verified:today,sources:[]})
}
function persist(){
 if(!ready.value||invalidTarget.value||pendingDraft.value)return
 const ok=saveDraft(storage(),sessionKey,{raw:raw.value,path:path.value,summary:summary.value,baseSha:baseSha.value,baseRaw:baseRaw.value,template:template.value})
 storageStatus.value=ok?'草稿已保存在此浏览器':'草稿保存失败，请复制或下载 Markdown。'
}
function init(){
 ready.value=false;epoch++;controller?.abort();clearTimeout(timer)
 const query=new URLSearchParams(window.location.search),requested=query.get('page'),eid=query.get('entity')
 const source=requested?sources.pages.find(p=>p.game===game.value&&p.path===requested):null
 entity.value=eid?index.find(p=>p.game===game.value&&p.generated&&p.entityId===eid):null
 invalidTarget.value=Boolean((requested&&!source)||(eid&&!entity.value))
 const note=entity.value?sources.pages.find(p=>p.game===game.value&&p.path==='notes/'+eid):null
 const current=source||note
 originalPath.value=current?.path||'';baseRaw.value=current?.raw||'';baseSha.value=current?.sha||null
 template.value=entity.value?'note':'guide';path.value=current?.path||(entity.value?'notes/'+eid:'guides/')
 raw.value=current?.raw||blank(template.value);summary.value='';tab.value='write'
 sessionKey=draftKey(game.value,originalPath.value||entity.value?.entityId||'');pendingDraft.value=readDraft(storage(),sessionKey);draftConflict.value=false;checkState.value='unchecked';status.value='';copied.value=false
 ready.value=true
}
function restoreDraft(){
 const d=pendingDraft.value;if(!d)return
 raw.value=d.raw;path.value=originalPath.value||d.path;summary.value=d.summary;template.value=templates[d.template]?d.template:template.value
 draftConflict.value=compareRevision(d.baseSha??null,baseSha.value)==='conflict'
 pendingDraft.value=null
 status.value=draftConflict.value?'草稿基于旧版本，请在差异页核对最新正文后确认。':'已恢复本地草稿。'
 persist()
}
function dismissDraft(){pendingDraft.value=null;persist()}
function useTemplate(){if(originalPath.value)return;raw.value=blank(template.value);status.value='已应用模板。'}
function download(){
 const blob=new Blob([raw.value],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a')
 a.href=url;a.download=(path.value.split('/').pop()||'draft')+'.md';a.click();URL.revokeObjectURL(url)
}
async function copy(){
 try{await navigator.clipboard.writeText(raw.value);copied.value=true;status.value='Markdown 已复制，请在 GitHub 替换完整文件内容。'}
 catch{status.value='无法自动复制，请下载文件，或在 Markdown 框中全选复制。'}
}
async function check(){
 const token=++epoch;controller?.abort();controller=new AbortController();checking.value=true;acknowledged.value=false
 const timeout=setTimeout(()=>controller?.abort(),10000)
 try{
  const url='https://api.github.com/repos/'+REPO+'/contents/'+sourcePath(game.value,path.value).split('/').map(encodeURIComponent).join('/')+'?ref=main'
  const response=await fetch(url,{headers:{Accept:'application/vnd.github+json'},signal:controller.signal,cache:'no-store'})
  if(token!==epoch)return
  if(response.status===404){
   checkState.value=originalPath.value?'conflict':'clean';status.value=originalPath.value?'主线文件已删除或重命名，请核对历史。':'主线尚无同路径文件，可以创建。'
  }else if(response.ok){
   const value=await response.json()
   if(token!==epoch)return
   checkState.value=originalPath.value?compareRevision(baseSha.value,value.sha):'conflict'
   status.value=checkState.value==='clean'?'主线文件与当前编辑基线一致。':'主线文件已变化或目标路径已存在，请核对后再提交。'
  }else{checkState.value='unavailable';status.value='GitHub 检查暂不可用，请在 GitHub 中核对最新版本。'}
 }catch{if(token===epoch){checkState.value='unavailable';status.value='GitHub 检查暂不可用，请在 GitHub 中核对最新版本。'}}
 finally{clearTimeout(timeout);if(token===epoch)checking.value=false}
}
async function importFile(event){
 const file=event.target.files?.[0];if(!file)return
 if(file.size>600000){status.value='文件过大，请拆分。';event.target.value='';return}
 raw.value=await file.text();status.value='已导入 Markdown；请预览、核对差异和来源。';event.target.value=''
}
watch([raw,path,summary],()=>{
 if(!ready.value)return
 epoch++;controller?.abort();checking.value=false;checkState.value='unchecked';acknowledged.value=false;copied.value=false
 clearTimeout(timer);timer=setTimeout(persist,450)
})
watch(game,()=>{if(ready.value){persist();init()}})
onMounted(init)
onBeforeUnmount(()=>{persist();clearTimeout(timer);epoch++;controller?.abort()})
</script>
<template>
<section class="wiki-editor" v-if="wiki">
<p>在 {{wiki.title}} Wiki 中{{originalPath?'修改页面':'创建页面'}}。草稿保存在此浏览器；发布需在 GitHub 提交分支与 PR。</p>
<p v-if="entity" class="editor-notice">正在维护「{{entity.title}}」的独立补充页。导入数值的修改需同时更新结构化来源记录。</p>
<p v-if="invalidTarget" role="alert">找不到所请求的可编辑页面。请返回原页面，从编辑入口重新进入。</p>
<template v-else-if="ready">
<div v-if="pendingDraft" class="editor-notice"><p>找到此页面的本地草稿，保存于 {{pendingDraft.savedAt}}。</p><button @click="restoreDraft">恢复草稿</button> <button @click="dismissDraft">使用当前版本</button></div>
<div class="editor-fields">
<label>页面路径（不含 .md）<input aria-label="页面路径" v-model="path" :readonly="Boolean(originalPath||entity)" spellcheck="false"></label>
<label v-if="!originalPath">页面模板<select v-model="template" aria-label="页面模板"><option v-for="(value,id) in templates" :value="id" :key="id">{{value.label}}</option></select></label>
<button v-if="!originalPath" @click="useTemplate">应用模板（替换正文）</button>
<label>页面标题<input aria-label="页面标题" :value="fields.title" @input="patch('title',$event.target.value)"></label>
<label>别名（每行一个）<textarea aria-label="页面别名" rows="2" :value="fields.aliases.join('\n')" @change="listValue('aliases',$event.target.value)"></textarea></label>
<fieldset><legend>页面分类</legend><label v-for="g in wiki.groups" :key="g.id" class="editor-category"><input type="checkbox" :checked="fields.categories.includes(g.id)" @change="category(g.id,$event.target.checked)">{{g.title}}</label></fieldset>
<label>平台<input aria-label="平台" :value="fields.platform" @input="patch('platform',$event.target.value)"></label>
<label>游戏版本<input aria-label="游戏版本" :value="fields.version" @input="patch('version',$event.target.value)"></label>
<label>剧透程度<select aria-label="剧透程度" :value="fields.spoiler" @change="patch('spoiler',$event.target.value)"><option>无</option><option>轻度</option><option>重度</option></select></label>
<label>核对日期<input aria-label="核对日期" type="date" :value="fields.verified" @input="patch('verified',$event.target.value)"></label>
<label class="editor-full">资料来源（每行一个链接）<textarea aria-label="资料来源" rows="3" :value="fields.sources.join('\n')" @change="patch('sources',$event.target.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean))"></textarea></label>
</div>
<div class="editor-tabs" role="tablist" aria-label="编辑视图"><button v-for="t in [{id:'write',name:'Markdown'},{id:'preview',name:'预览'},{id:'diff',name:'差异'}]" :key="t.id" role="tab" :aria-selected="tab===t.id" :aria-controls="'panel-'+t.id" @click="tab=t.id">{{t.name}}</button></div>
<div v-show="tab==='write'" id="panel-write" role="tabpanel"><label for="markdown-content">完整 Markdown（含页面字段）</label><textarea id="markdown-content" class="editor-markdown" aria-label="Markdown 正文" v-model="raw" spellcheck="false"></textarea></div>
<div v-show="tab==='preview'" id="panel-preview" role="tabpanel"><p class="editor-hint">安全预览支持标题、列表、表格、代码和链接；HTML 与 Vue 组件显示为文本。正式布局由 Actions 预览校验。</p><article class="editor-preview" v-html="preview"></article></div>
<div v-show="tab==='diff'" id="panel-diff" role="tabpanel"><p>与本次打开页面时的已发布版本比较。长文按相同前后文显示中间变更块。</p><p v-if="!diff.length">正文没有变化。</p><pre class="editor-diff"><span v-for="(line,i) in diff" :key="i" :class="line.type">{{line.type==='added'?'+':'−'}} {{line.text}}
</span></pre></div>
<p role="status">{{storageStatus}}</p>
<div class="editor-tools"><button @click="copy">复制 Markdown</button><button @click="download">下载 Markdown</button><label>导入 Markdown / 恢复旧版本<input type="file" accept=".md,.txt,text/markdown,text/plain" aria-label="导入 Markdown" @change="importFile"></label></div>
<label class="editor-summary">编辑摘要<input aria-label="编辑摘要" v-model="summary" placeholder="说明新增内容或修改原因"></label>
<details class="editor-validation" open><summary>发布校验（{{errors.length}} 项待处理）</summary><ul v-if="errors.length"><li v-for="error in errors" :key="error">{{error}}</li></ul><p v-else>页面字段与路径校验通过。</p></details>
<div v-if="draftConflict" class="editor-notice"><p>本地草稿基于旧版本。请先查看差异，并与 GitHub 最新文件合并。</p><button @click="draftConflict=false;persist()">已核对并合并草稿</button></div>
<button :disabled="checking||errors.length>0||draftConflict" @click="check">{{checking?'正在检查…':'检查主线冲突'}}</button>
<p role="status" class="editor-check-status">{{status}}</p>
<label v-if="checkState==='unavailable'" class="editor-category"><input type="checkbox" v-model="acknowledged">将在 GitHub 核对最新文件和同路径页面后提交。</label>
<CollaborationSubmit :path="sourcePath(game,path)" :content="raw" :summary="summary" :base-sha="baseSha" :disabled="!ready || invalidTarget || errors.length>0 || draftConflict" @restore="raw=$event" @rebase="baseSha=$event.sha;baseRaw=$event.raw;raw=$event.merged;originalPath=baseSha?path:'';draftConflict=false" />
<div class="editor-handoff">
<p>1. 复制或下载完整 Markdown。2. 前往 GitHub，粘贴文件内容并填写编辑摘要。3. 选择新建分支、提交 PR，等待 Actions 检查与主线发布。</p>
<a v-if="canSubmit" :href="target" target="_blank" rel="noopener noreferrer">前往 GitHub 提交</a><span v-else aria-disabled="true">完成校验与冲突检查后可前往 GitHub 提交</span>
<p v-if="copied">内容已复制；GitHub 页面不会自动填入正文。</p>
<a v-if="originalPath" :href="'https://github.com/'+REPO+'/commits/main/'+sourcePath(game,originalPath)" target="_blank" rel="noopener noreferrer">版本历史与恢复</a>
<span v-if="originalPath"> · </span><a v-if="originalPath" :href="target" target="_blank" rel="noopener noreferrer">在 GitHub 重命名</a>
<p class="editor-hint" v-if="originalPath">恢复：在历史中打开旧版本并复制原文，通过导入或粘贴重新提交。重命名：修改文件名并同步站内链接；历史与重命名操作在 GitHub 完成。</p>
<a :href="withBase('/games/'+game+'/all-pages')">返回全部页面</a>
</div>
</template></section>
</template>
