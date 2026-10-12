<script setup>
import {service} from './collaboration-client.mjs'
import CollaborationSubmit from './CollaborationSubmit.vue'
import {computed,ref,onMounted,onBeforeUnmount,watch} from 'vue'
import {withBase} from 'vitepress'
import data from '../../../games/fire-emblem-fw/data/generated/corrections.json'
import {definitions,encodeValue,initialDraft,buildPatch,correctionState,correctionKey,loadCorrectionDraft,storeCorrectionDraft} from './structured-model.mjs'
const dataset=ref('characters'),recordId=ref(''),query=ref(''),draft=ref(null),pending=ref(null),ready=ref(false)
const tab=ref('fields'),message=ref(''),storageMessage=ref(''),checkState=ref('unchecked'),checking=ref(false),acknowledged=ref(false),stale=ref(false),copied=ref(false)
const collaborationSha=ref(null)
const labels={applied:'已应用','needs-review':'上游变化，待复核','matches-upstream':'上游已一致'}
const records=computed(()=>data.records.filter(r=>r.dataset===dataset.value&&(!query.value||JSON.stringify([r.id,r.label,r.effective.nameZh,r.effective.aliases]).toLowerCase().includes(query.value.toLowerCase()))))
const record=computed(()=>data.records.find(r=>r.dataset===dataset.value&&r.id===recordId.value))
const specs=computed(()=>definitions[dataset.value]?.fields||{})
const result=computed(()=>record.value&&draft.value?buildPatch(record.value,draft.value):{errors:['请选择记录。'],patch:null})
const output=computed(()=>result.value.patch?JSON.stringify(result.value.patch,null,2)+'\n':'')
const report=computed(()=>data.report.filter(r=>r.dataset===dataset.value&&r.recordId===recordId.value))
const target=computed(()=>record.value?.sha?'https://github.com/hrmsLeggenda/nx-archive/edit/main/'+record.value.file:'https://github.com/hrmsLeggenda/nx-archive/new/main?filename='+encodeURIComponent(record.value?.file||''))
const canSubmit=computed(()=>Boolean(output.value)&&!stale.value&&(checkState.value==='clean'||(checkState.value==='unavailable'&&acknowledged.value)))
let timer,controller,epoch=0,sessionKey=''
function storage(){try{return window.localStorage}catch{return null}}
function persist(){
 if(!ready.value||pending.value||!sessionKey)return
 storageMessage.value=storeCorrectionDraft(storage(),sessionKey,draft.value)?'勘误草稿已保存在此浏览器。':'存储不可用，请复制或下载 JSON。'
}
function choose(){
 if(!record.value)return
 epoch++;controller?.abort();clearTimeout(timer);checking.value=false;ready.value=false
 collaborationSha.value=record.value.sha||null
 sessionKey=correctionKey(dataset.value,recordId.value);draft.value=initialDraft(record.value)
 pending.value=loadCorrectionDraft(storage(),sessionKey);checkState.value='unchecked';acknowledged.value=false;stale.value=false;message.value='';copied.value=false
 ready.value=true
}
function selectDataset(){persist();query.value='';recordId.value=data.records.find(r=>r.dataset===dataset.value)?.id||'';choose()}
function selectRecord(){persist();choose()}
function active(field,enabled){draft.value.active=enabled?[...new Set([...draft.value.active,field])]:draft.value.active.filter(f=>f!==field)}
function restore(){
 const saved=pending.value?.draft;if(!saved)return
 stale.value=saved.baselineHash!==record.value.baselineHash
 draft.value={...initialDraft(record.value),...saved};pending.value=null
 message.value=stale.value?'上游基线已更新。请核对字段差异，复核后继续。':'已恢复勘误草稿。';persist()
}
function discard(){pending.value=null;persist()}
function rebase(){draft.value.rebase=true;draft.value.baselineHash=record.value.baselineHash;stale.value=false;message.value='已采用当前基线作为复核原值；请更新核对日期、来源和原因。'}
async function copy(){
 try{await navigator.clipboard.writeText(output.value);copied.value=true;message.value='JSON 已复制。请在 GitHub 替换完整勘误文件并创建 PR。'}catch{message.value='自动复制失败，请下载 JSON 或手动复制。'}
}
function download(){
 const url=URL.createObjectURL(new Blob([output.value],{type:'application/json;charset=utf-8'})),a=document.createElement('a')
 a.href=url;a.download=recordId.value+'.json';a.click();URL.revokeObjectURL(url)
}
async function check(){
 const token=++epoch;controller?.abort();controller=new AbortController();checking.value=true;acknowledged.value=false
 const current=record.value,timeout=setTimeout(()=>controller?.abort(),10000)
 try{
  const response=await fetch('https://api.github.com/repos/hrmsLeggenda/nx-archive/contents/'+current.file+'?ref=main',{headers:{Accept:'application/vnd.github+json'},cache:'no-store',signal:controller.signal})
  if(token!==epoch)return
  if(response.status===404){checkState.value=current.sha?'conflict':'clean'}
  else if(response.ok){const value=await response.json();if(token!==epoch)return;checkState.value=current.sha&&value.sha===current.sha?'clean':'conflict'}
  else checkState.value='unavailable'
  message.value=checkState.value==='clean'?'主线勘误文件与编辑基线一致，可以前往 GitHub 提交。':checkState.value==='conflict'?'主线勘误文件已变化或同路径文件已存在，请查看最新文件合并修改。':'GitHub 检查不可用，请在 GitHub 核对后提交。'
 }catch{if(token===epoch){checkState.value='unavailable';message.value='GitHub 检查不可用，请在 GitHub 核对后提交。'}}
 finally{clearTimeout(timeout);if(token===epoch)checking.value=false}
}
async function importFile(event){
 const file=event.target.files?.[0];if(!file)return
 try{
  if(file.size>200000)throw new Error('文件过大。')
  importRaw(await file.text())
 }catch(error){message.value='导入失败：'+error.message}
 event.target.value=''
}
function importRaw(raw){
  const patch=JSON.parse(raw)
  if(patch.gameId!=='fire-emblem-fw'||patch.dataset!==dataset.value||patch.recordId!==recordId.value||!Array.isArray(patch.changes))throw new Error('文件不属于当前记录。')
  const next=initialDraft(record.value)
  next.active=patch.changes.map(c=>c.field);next.importedChanges=patch.changes
  for(const c of patch.changes)next.values[c.field]=encodeValue(c.value)
  Object.assign(next,{sources:patch.evidence.sources.join('\n'),checked:patch.evidence.checked,gameVersion:patch.evidence.gameVersion,reason:patch.evidence.reason})
  const checked=buildPatch(record.value,next)
  if(checked.errors.length)throw new Error(checked.errors.join(' '))
  draft.value=next;message.value='已导入勘误提议；请核对当前基线与原值。'
}
function restoreRevision(raw){try{importRaw(raw)}catch(e){message.value=e.message}}
function mergeRevision(value){try{importRaw(value.merged);collaborationSha.value=value.sha;message.value='已合并勘误文件；请核对证据和上游字段。'}catch(e){message.value=e.message}}
watch(draft,()=>{
 if(!ready.value)return
 epoch++;controller?.abort();checking.value=false;checkState.value='unchecked';acknowledged.value=false;copied.value=false
 clearTimeout(timer);timer=setTimeout(persist,450)
},{deep:true})
onMounted(()=>{
 const params=new URLSearchParams(window.location.search),kind=params.get('dataset'),id=params.get('record')
 if(definitions[kind])dataset.value=kind
 recordId.value=data.records.find(r=>r.dataset===dataset.value&&r.id===id)?.id||data.records.find(r=>r.dataset===dataset.value)?.id
 choose()
})
onBeforeUnmount(()=>{persist();clearTimeout(timer);epoch++;controller?.abort()})
</script>
<template>
<section class="wiki-editor structured-editor" aria-label="结构化数据编辑">
<p>导入基线与人工勘误分开保存；更新上游后人工修正继续生效，上游变化标记待复核。身份、原名、来源编号和关联键固定。长篇补充继续使用独立补充页。</p>
<p>上游版本：<code>{{data.upstream.commit}}</code>；当前 {{data.report.length}} 项字段记录，{{data.report.filter(r=>r.status==='needs-review').length}} 项待复核。</p>
<div class="archive-controls"><label>数据集<select aria-label="数据集" v-model="dataset" @change="selectDataset"><option v-for="(spec,id) in definitions" :key="id" :value="id">{{spec.label}}</option></select></label><label>查找记录<input aria-label="查找记录" type="search" v-model="query"></label><label>记录<select aria-label="记录" v-model="recordId" @change="selectRecord"><option v-for="r in records" :key="r.id" :value="r.id">{{r.effective.nameZh || r.label}} · {{r.id}}</option></select></label></div>
<template v-if="ready && record && draft">
<p>记录：{{record.label}} · <code>{{record.id}}</code></p>
<p v-if="!records.length">没有匹配记录；清空搜索可继续选择。</p>
<div v-if="pending" class="editor-notice"><p>发现本地勘误草稿，保存于 {{pending.savedAt}}。</p><button @click="restore">恢复勘误草稿</button> <button @click="discard">使用已发布记录</button></div>
<div class="editor-tabs" role="tablist" aria-label="数据编辑视图"><button role="tab" :aria-selected="tab==='fields'" @click="tab='fields'">字段编辑</button><button role="tab" :aria-selected="tab==='json'" @click="tab='json'">JSON 与差异</button><button role="tab" :aria-selected="tab==='history'" @click="tab='history'">来源与勘误</button></div>
<div v-show="tab==='fields'" class="structured-fields">
<article v-for="(spec,field) in specs" :key="field" class="structured-field">
<label class="editor-category"><input type="checkbox" :aria-label="'覆盖 '+spec.label" :checked="draft.active.includes(field)" @change="active(field,$event.target.checked)">覆盖 {{spec.label}}</label>
<p class="editor-hint">上游基线：{{record.baseline[field]===null?'未知（null）':JSON.stringify(record.baseline[field])}} · 当前有效：{{record.effective[field]===null?'未知（null）':JSON.stringify(record.effective[field])}}</p>
<template v-if="draft.active.includes(field)">
<select v-if="spec.type==='enum'" :aria-label="spec.label" v-model="draft.values[field]"><option v-if="spec.nullable" value="">未知（null）</option><option v-for="value in spec.values" :key="value" :value="value">{{value}}</option></select>
<textarea v-else-if="spec.type==='list'" :aria-label="spec.label" v-model="draft.values[field]" rows="3" placeholder="每行一个值"></textarea>
<input v-else :type="spec.type==='integer'?'number':'text'" :aria-label="spec.label" v-model="draft.values[field]" :min="spec.min" :max="spec.max" :placeholder="spec.nullable?'留空表示未知（null）':''">
<p v-if="record.patch?.changes.some(c=>c.field===field)" class="editor-hint">{{labels[correctionState(record.baseline[field],record.patch.changes.find(c=>c.field===field))]}}。取消覆盖会恢复上游值。</p>
</template>
</article></div>
<div v-show="tab==='json'"><p>将发布的完整勘误文件：</p><pre class="structured-json">{{output || '完成校验后生成 JSON。'}}</pre><table class="structured-diff"><thead><tr><th>字段</th><th>基线</th><th>修正值</th></tr></thead><tbody><tr v-for="c in result.patch?.changes || []" :key="c.field"><td>{{c.field}}</td><td>{{JSON.stringify(record.baseline[c.field])}}</td><td>{{JSON.stringify(c.value)}}</td></tr></tbody></table></div>
<div v-show="tab==='history'"><p v-if="!report.length">此记录尚无已发布勘误。</p><article v-for="r in report" :key="r.field"><h3>{{specs[r.field]?.label || r.field}} · {{labels[r.status]}}</h3><p>勘误原值：{{JSON.stringify(r.recordedBase)}}；当前基线：{{JSON.stringify(r.baseline)}}；有效值：{{JSON.stringify(r.value)}}</p><p>{{r.evidence.reason}} · 核对 {{r.evidence.checked}} · 版本 {{r.evidence.gameVersion}}</p><a v-for="(url,i) in r.evidence.sources" :key="url" :href="url" target="_blank" rel="noopener noreferrer">来源 {{i+1}} </a></article><a :href="'https://github.com/hrmsLeggenda/nx-archive/commits/main/'+record.file" target="_blank" rel="noopener noreferrer">GitHub 版本历史</a></div>
<div class="editor-fields">
<label class="editor-full">勘误来源（每行一个链接）<textarea aria-label="勘误来源" v-model="draft.sources" rows="3"></textarea></label>
<label>核对日期<input aria-label="勘误核对日期" type="date" v-model="draft.checked"></label>
<label>游戏版本<input aria-label="勘误游戏版本" v-model="draft.gameVersion"></label>
<label class="editor-full">勘误原因 / 编辑摘要<textarea aria-label="勘误原因" v-model="draft.reason" rows="3"></textarea></label>
</div>
<p role="status">{{storageMessage}}</p>
<div v-if="stale || report.some(r=>r.status==='needs-review')" class="editor-notice"><p>上游字段或草稿基线有变化。人工值保留，请查看差异并核对证据。</p><button @click="rebase">按当前基线复核</button></div>
<details open class="editor-validation"><summary>数据校验（{{result.errors.length}} 项待处理）</summary><ul v-if="result.errors.length"><li v-for="error in result.errors" :key="error">{{error}}</li></ul><p v-else>字段、来源及阶段关系校验通过。取消全部覆盖会生成空 changes，恢复上游数据并保留编辑历史。</p></details>
<div class="editor-tools"><button :disabled="!output" @click="copy">复制勘误 JSON</button><button :disabled="!output" @click="download">下载勘误 JSON</button><label>导入提议<input type="file" accept=".json,application/json" aria-label="导入勘误 JSON" @change="importFile"></label></div>
<button :disabled="result.errors.length>0 || checking || stale" @click="check">{{checking?'正在检查…':'检查勘误文件冲突'}}</button>
<p role="status" class="structured-status">{{message}}</p>
<label v-if="checkState==='unavailable'" class="editor-category"><input type="checkbox" v-model="acknowledged">将在 GitHub 核对勘误文件后提交。</label>
<CollaborationSubmit :path="record.file" :content="output" :summary="draft.reason" :base-sha="collaborationSha" :disabled="result.errors.length>0 || stale" @restore="restoreRevision" @rebase="mergeRevision" />
<div v-if="!service" class="editor-handoff"><p>将完整 JSON 粘贴到 <code>{{record.file}}</code>，在 GitHub 新建分支与 PR。Actions 先校验勘误，再合成数据库、模拟器、资源、时间轴和条目页。</p><a v-if="canSubmit" :href="target" target="_blank" rel="noopener noreferrer">前往 GitHub 提交勘误</a><span v-else>完成数据校验与冲突检查后可提交。</span><p v-if="copied">JSON 已复制；GitHub 不会自动填入内容。</p><p><a :href="'https://github.com/hrmsLeggenda/nx-archive/blob/main/'+record.file" target="_blank" rel="noopener noreferrer">查看主线勘误文件</a> · <a :href="withBase('/games/fire-emblem-fw/database')">数据库与模拟器</a></p></div>
</template></section>
</template>
