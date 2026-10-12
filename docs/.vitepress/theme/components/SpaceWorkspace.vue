<script setup>
import {ref,computed,onMounted,onBeforeUnmount,watch} from 'vue'
import {withBase} from 'vitepress'
import {data as catalog} from './spaces.data'
import {data as sources} from './editor-pages.data'
import wikis from '../../../data/wikis.json'
import {readFields,writeFields,splitDocument} from './editor-model.mjs'
import {validateSpace,spaceFile,pageFile,validId} from '../../../../services/collaboration/space-model.mjs'
import {service,call} from './collaboration-client.mjs'
import VisualDocumentEditor from './VisualDocumentEditor.vue'
import DocumentViewer from './DocumentViewer.vue'
const sourceMode=ref(false),collapsed=ref(false)
const spaces=ref(structuredClone(catalog)),spaceId=ref(''),pagePath=ref(''),categoryId=ref(''),search=ref(''),editing=ref(false),managing=ref(false),creatingSpace=ref(false)
const newTitle=ref(''),newDescription=ref(''),title=ref(''),body=ref(''),summary=ref(''),status=ref(''),busy=ref(false),baseSha=ref(null),baseRaw=ref(''),menu=ref([]),conflict=ref(null),pending=ref(null)
const space=computed(()=>spaces.value.find(s=>s.id===spaceId.value))
const pages=ref([...sources.pages.filter(p=>p.game&&['guides','notes'].includes(p.path.split('/')[0]))])
const spacePages=computed(()=>pages.value.filter(p=>p.game===spaceId.value)),selected=computed(()=>spacePages.value.find(p=>p.path===pagePath.value))
const entries=computed(()=>spacePages.value.filter(p=>{const categories=categoriesFor(p);return (!categoryId.value||categories.includes(categoryId.value))&&(!search.value||(p.title+' '+p.raw).includes(search.value))}))
const documentBody=computed(()=>splitDocument(selected.value?.raw||'').body),safe=computed(()=>!/<[A-Za-z]|\{\{|^:::|^```mermaid/m.test(body.value))
const legacy=computed(()=>sources.pages.filter(p=>p.game===spaceId.value&&!['guides','notes'].includes(p.path.split('/')[0])&&!p.path.startsWith('categories/')&&!['index','all-pages','data-editor'].includes(p.path)))
const draftKey=computed(()=>`nx-archive:space-draft:${spaceId.value}:${pagePath.value||'new'}`)
let timer,poll
function navigate(id,path='',category=''){
 persist();
 spaceId.value=id;pagePath.value=path;categoryId.value=category;editing.value=false;managing.value=false;conflict.value=null;status.value=''
 const q=new URLSearchParams();if(id)q.set('space',id);if(path)q.set('page',path);if(category)q.set('category',category)
 history.pushState(null,'',withBase('/workspace.html')+(q.size?'?'+q:''));loadDraft()
}
function loadRoute(){const q=new URLSearchParams(location.search);spaceId.value=q.get('space')||'';pagePath.value=q.get('page')||'';categoryId.value=q.get('category')||'';editing.value=false;managing.value=false;loadDraft();if(pending.value&&!selected.value)restore()}
function loadDraft(){try{pending.value=JSON.parse(localStorage.getItem(draftKey.value)||'null')}catch{pending.value=null}}
function persist(){if(!editing.value)return;try{localStorage.setItem(draftKey.value,JSON.stringify({title:title.value,body:body.value,summary:summary.value,categoryId:categoryId.value,baseSha:baseSha.value,baseRaw:baseRaw.value,pagePath:pagePath.value}));}catch{status.value='浏览器无法保存草稿，请复制正文保留。'}}
function edit(){if(!selected.value)return;sourceMode.value=false;title.value=selected.value.title;body.value=splitDocument(selected.value.raw).body;baseRaw.value=selected.value.raw;baseSha.value=selected.value.sha;summary.value='';categoryId.value=categoriesFor(selected.value)[0]||space.value.categories[0]?.id||'';editing.value=true;loadDraft()}
function newPage(){persist();sourceMode.value=false;if(!categoryId.value){status.value='请先选择分类菜单，再新建页面。';return}pagePath.value='guides/'+crypto.randomUUID();title.value='';body.value='';baseRaw.value='';baseSha.value=null;summary.value='';editing.value=true;pending.value=null;conflict.value=null;const q=new URLSearchParams({space:spaceId.value,page:pagePath.value,category:categoryId.value});history.pushState(null,'',withBase('/workspace.html')+'?'+q)}
function restore(){const d=pending.value;if(!d)return;title.value=d.title;body.value=d.body;summary.value=d.summary;categoryId.value=d.categoryId;baseRaw.value=d.baseRaw;baseSha.value=d.baseSha;pagePath.value=d.pagePath;editing.value=true;pending.value=null;status.value='已恢复草稿；在线保存将检查最新版本。'}
function manage(){menu.value=space.value.categories.map(c=>({...c}));managing.value=true;status.value=''}
function categoriesFor(p){const defined=readFields(p.raw).categories;return defined.length?defined:wikis[p.game]?.groups.filter(g=>g.items.some(i=>i.path===p.path)).map(g=>g.id)||[]}
function categoryPages(id){return spacePages.value.filter(p=>categoriesFor(p).includes(id)).length}
function addCategory(){menu.value.push({id:'category-'+crypto.randomUUID(),title:'新分类'})}
function removeCategory(id){if(categoryPages(id)){status.value='此分类仍有页面，请先将页面移动到其他分类。';return}menu.value=menu.value.filter(c=>c.id!==id)}
async function submit(path,content,sha,label){
 try{localStorage.setItem('nx-archive:space-mutation:'+path,JSON.stringify({content,sha,label}))}catch{}
 if(!service){status.value='在线保存尚未启用：需先配置协作服务。内容已保留为本地草稿，不会更新公开网站。';persist();return null}
 busy.value=true;status.value='正在保存并校验…';conflict.value=null
 try{const result=await call('/submit',{path,content,baseSha:sha,summary:label});status.value='已提交，正在自动发布；公开页面将在部署完成后更新。';watchPublish(result.number);return result}
 catch(e){status.value=e.message;if(e.status===409)conflict.value=e.current;return null}finally{busy.value=false}
}
function watchPublish(number){clearInterval(poll);let count=0;poll=setInterval(async()=>{if(++count>60){clearInterval(poll);status.value='发布仍在进行，可稍后刷新页面查看。';return}try{const r=await call('/reviews/'+number);if(r.state==='merged'){status.value='已自动合并，等待站点部署；请稍后刷新确认。';clearInterval(poll)}else if(r.checks.some(c=>['failure','cancelled','timed_out'].includes(c.conclusion))){status.value='校验未通过，修改尚未发布。请修正后重试。';clearInterval(poll)}}catch{}},5000)}
async function savePage(){
 if(!title.value.trim()||!body.value.trim()||!space.value.categories.some(c=>c.id===categoryId.value)){status.value='请填写页面标题、正文并选择分类。';return}
 const fields=writeFields(baseRaw.value,{...readFields(baseRaw.value),title:title.value,categories:[categoryId.value],kind:'文档'}),prefix=fields.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0]||'',raw=prefix+body.value,path='docs/games/'+spaceId.value+'/'+pagePath.value+'.md'
 const result=await submit(path,raw,baseSha.value,summary.value.trim()||'更新页面：'+title.value)
 if(result){const value={game:spaceId.value,path:pagePath.value,title:title.value,raw,sha:baseSha.value,url:'/workspace.html?space='+spaceId.value+'&page='+pagePath.value};const i=pages.value.findIndex(p=>p.game===spaceId.value&&p.path===pagePath.value);if(i<0)pages.value.push(value);else pages.value[i]=value;try{localStorage.removeItem(draftKey.value)}catch{}editing.value=false}
}
async function saveMenu(){const value={schemaVersion:1,id:space.value.id,title:space.value.title,description:space.value.description,categories:menu.value},errors=validateSpace(value);if(errors.length){status.value=errors.join(' ');return}if(await submit(spaceFile(value.id),JSON.stringify(value,null,2)+'\n',space.value.sha,'更新空间分类菜单：'+value.title)){managing.value=false}}
async function createSpace(){
 const id='space-'+crypto.randomUUID(),record={schemaVersion:1,id,title:newTitle.value.trim(),description:newDescription.value.trim(),categories:[{id:'general',title:'文档'}]},errors=validateSpace(record)
 if(errors.length){status.value=errors.join(' ');return}
 if(await submit(spaceFile(id),JSON.stringify(record,null,2)+'\n',null,'创建空间：'+record.title)){creatingSpace.value=false;status.value='空间正在发布，请部署完成后刷新首页。'}
}
function decode(v){try{return new TextDecoder().decode(Uint8Array.from(atob(v.replace(/\s/g,'')),x=>x.charCodeAt(0)))}catch{return ''}}
function adoptLatest(){if(!conflict.value)return;const raw=decode(conflict.value.content||'');baseRaw.value=raw;baseSha.value=conflict.value.currentSha;conflict.value=null;status.value='已采用最新基线，请将保留的草稿与最新正文合并后再保存。'}
watch([title,body,summary,categoryId],()=>{clearTimeout(timer);timer=setTimeout(persist,500)})
onMounted(()=>{loadRoute();window.addEventListener('popstate',loadRoute)})
onBeforeUnmount(()=>{persist();clearTimeout(timer);clearInterval(poll);window.removeEventListener('popstate',loadRoute)})
</script>
<template>
<section class="space-workspace" :class="{'in-space':space,'sidebar-collapsed':collapsed}">
<header class="space-header"><div class="workspace-brand"><button v-if="space" @click="collapsed=!collapsed" :aria-expanded="!collapsed" aria-label="切换侧边菜单">☰</button><a :href="withBase('/')">NX Archive</a><span v-if="space" class="header-divider">/</span><button v-if="space" class="space-switch" @click="navigate('')">{{space.title}} ▾</button></div><a v-if="service" :href="withBase('/collaboration')">登录 / 发布状态</a><span v-else>在线保存待配置</span></header>
<template v-if="!spaceId">
<div class="space-heading"><div><h1>知识空间</h1><p>选择一个空间，浏览分类与文档。</p></div><button @click="creatingSpace=true;status=''">创建新空间</button></div>
<div class="space-cards"><button v-for="s in spaces" :key="s.id" @click="navigate(s.id)"><h2>{{s.title}}</h2><p>{{s.description}}</p><span>{{s.categories.length}} 个分类 · 进入空间 →</span></button></div>
<section v-if="creatingSpace" class="space-form"><h2>创建空间</h2><label>空间名称<input v-model="newTitle" aria-label="空间名称"></label><label>空间介绍<textarea v-model="newDescription" aria-label="空间介绍"></textarea></label><button :disabled="busy" @click="createSpace">创建并保存</button><button @click="creatingSpace=false">取消</button></section>
</template>
<template v-else-if="space">

<div class="space-layout">
<aside v-show="!collapsed" class="space-sidebar"><div class="sidebar-heading"><strong>空间导航</strong><button @click="manage" aria-label="管理分类菜单">管理分类菜单</button></div><label>搜索空间文档<input aria-label="搜索空间文档" v-model="search" type="search"></label><button @click="navigate(space.id)">全部文档</button><div v-for="c in space.categories" :key="c.id" class="category-tree"><div class="space-menu"><button :class="{active:categoryId===c.id}" @click="navigate(space.id,'',c.id)">{{c.title}} <span>{{categoryPages(c.id)}}</span></button><button :aria-label="'在'+c.title+'下新建页面'" @click="categoryId=c.id;newPage()">＋</button></div><button v-for="p in spacePages.filter(p=>categoriesFor(p).includes(c.id)&&(!search||(p.title+' '+p.raw).includes(search)))" :key="p.path" class="tree-page" :class="{active:pagePath===p.path}" @click="navigate(space.id,p.path,c.id)">{{p.title}}</button></div><hr><p>数据库与已有工具</p><a v-for="p in legacy" :key="p.path" :href="withBase(p.url)">{{p.title}}</a><a :href="withBase('/games/'+space.id+'/')" v-if="!space.id.startsWith('space-')">原游戏 Wiki 与资料条目</a></aside>
<main class="workspace-content">
<section v-if="managing" class="space-form"><h2>分类菜单</h2><div v-for="(c,i) in menu" :key="c.id" class="space-menu"><input v-model="c.title" :aria-label="'分类名称 '+(i+1)"><button :disabled="i===0" @click="[menu[i-1],menu[i]]=[menu[i],menu[i-1]]">上移</button><button @click="removeCategory(c.id)">移除</button></div><button @click="addCategory">添加分类</button><button :disabled="busy" @click="saveMenu">保存分类菜单</button><button @click="managing=false">取消</button></section>
<template v-else-if="editing"><div class="document-context"><span>文档编辑</span><span>草稿自动保存在此浏览器</span></div><div class="space-document-header"><label>页面标题<input aria-label="文档标题" v-model="title"></label><label>所属分类<select aria-label="所属分类" v-model="categoryId"><option v-for="c in space.categories" :value="c.id" :key="c.id">{{c.title}}</option></select></label></div><p v-if="pending">此页面有未保存草稿。<button @click="restore">恢复草稿</button></p><div class="document-mode"><button :class="{active:!sourceMode}" :disabled="!safe" @click="sourceMode=false">文档编辑</button><button :class="{active:sourceMode||!safe}" @click="sourceMode=true">Markdown 源码</button></div><VisualDocumentEditor v-if="safe&&!sourceMode" v-model="body"/><template v-else><p v-if="!safe">此正文包含特殊组件，请在源码视图维护。</p><textarea v-model="body" aria-label="特殊页面正文" rows="20"></textarea></template><div class="document-savebar"><label>修改说明<input v-model="summary" aria-label="修改说明" placeholder="可选"></label><div class="space-actions"><button :disabled="busy" @click="savePage">{{busy?'正在保存…':'保存页面'}}</button><button @click="persist();editing=false">关闭并保留草稿</button></div></div></template>
<template v-else-if="selected"><div class="document-context"><span>{{space.title}} / {{space.categories.find(c=>c.id===categoryId)?.title||'文档'}}</span><span>阅读</span></div><div class="space-heading document-title"><h1>{{selected.title}}</h1><button class="primary-action" @click="edit">编辑页面</button></div><DocumentViewer :key="selected.path" :content="documentBody" :page-url="'/games/'+space.id+'/'+selected.path+'.html'"/><button v-if="pending" @click="restore">恢复未保存草稿</button></template>
<template v-else><div class="space-heading"><h2>{{space.categories.find(c=>c.id===categoryId)?.title||'全部文档'}}</h2><button :disabled="!categoryId" @click="newPage">新建页面</button></div><p v-if="!entries.length">暂无文档。在分类菜单下点击“＋”创建第一篇页面。</p><button v-for="p in entries" :key="p.path" class="space-page-row" @click="navigate(space.id,p.path,categoryId)">{{p.title}} →</button></template>
</main></div>
</template><p v-else>空间尚未发布或不存在。<a :href="withBase('/')">返回首页</a></p>
<p class="space-status" role="status">{{status}}</p><details v-if="conflict" open><summary>最新版本与当前草稿冲突</summary><pre>{{decode(conflict.content||'')}}</pre><button v-if="editing" @click="adoptLatest">采用最新基线，保留草稿继续合并</button><p v-else>请刷新后重新管理分类；当前修改尚未发布。</p></details>
</section></template>
<style scoped>
.space-workspace{width:100%;min-width:0;margin:auto;color:var(--vp-c-text-1)}
.space-header{height:56px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--vp-c-divider);background:var(--vp-c-bg);position:sticky;top:0;z-index:30;font-size:13px}
.workspace-brand{display:flex;align-items:center;gap:16px}.workspace-brand>a{font-weight:750;font-size:17px}.header-divider{color:var(--vp-c-text-3)}.space-switch{border:0;background:none}
.space-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:24px 0}.space-heading h1{font-size:30px;line-height:1.35;font-weight:700}.space-workspace:not(.in-space)>.space-heading,.space-cards,.space-workspace:not(.in-space)>.space-form{margin:32px 48px}.space-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}.space-cards>button{text-align:left;padding:28px;border:1px solid var(--vp-c-divider);border-radius:10px;min-height:180px;background:var(--vp-c-bg)}.space-cards>button:hover{border-color:var(--vp-c-brand-1);box-shadow:0 6px 24px #00000009}.space-cards h2{font-size:21px;font-weight:650}.space-cards p{margin:15px 0;color:var(--vp-c-text-2)}.space-cards span{font-size:13px;color:var(--vp-c-brand-1)}
button{cursor:pointer;border:1px solid var(--vp-c-divider);border-radius:5px;padding:7px 12px;background:var(--vp-c-bg)}button:hover{background:var(--vp-c-bg-soft)}button:disabled{opacity:.5;cursor:default}button:focus-visible,a:focus-visible{outline:2px solid var(--vp-c-brand-1);outline-offset:2px}.primary-action,.space-actions>button:first-child{background:var(--vp-c-brand-1);border-color:var(--vp-c-brand-1);color:white}
.space-layout{display:grid;grid-template-columns:248px minmax(0,1fr);min-height:calc(100vh - 56px)}.sidebar-collapsed .space-layout{grid-template-columns:minmax(0,1fr)}.space-sidebar{background:var(--vp-c-bg-soft);border-right:1px solid var(--vp-c-divider);padding:18px 14px;position:sticky;top:56px;height:calc(100vh - 56px);overflow:auto}.sidebar-heading{display:flex;justify-content:space-between;align-items:center;font-size:13px}.sidebar-heading button{font-size:11px;padding:4px}.space-sidebar>a{display:block;margin:12px 0;font-size:13px}.space-sidebar p{font-size:12px;color:var(--vp-c-text-2);margin-top:20px}.space-sidebar>button{width:100%;text-align:left;margin:8px 0}.space-menu{display:flex;align-items:center;gap:6px;margin:8px 0}.space-menu>button:first-child{flex:1;text-align:left;border:0;font-weight:600;background:transparent}.space-menu>button:last-child{padding:3px 8px}.space-menu span{font-size:11px;color:var(--vp-c-text-3)}.tree-page{display:block;width:100%;border:0;text-align:left;padding:7px 10px 7px 24px;font-size:13px;line-height:1.6;background:transparent}.active{color:var(--vp-c-brand-1);background:var(--vp-c-brand-soft)!important}.workspace-content{padding:24px 40px 48px;min-width:0}.document-context{display:flex;justify-content:space-between;font-size:12px;color:var(--vp-c-text-2)}.document-title{border-bottom:1px solid var(--vp-c-divider);padding-bottom:20px;margin:20px 0 24px}.document-title h1{margin:0}.space-document-header{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:24px}.space-document-header input{font-size:25px;font-weight:650}.document-mode{display:flex;gap:6px;margin:10px 0}.document-savebar{display:flex;align-items:end;gap:24px;position:sticky;bottom:0;background:var(--vp-c-bg);border-top:1px solid var(--vp-c-divider);padding:12px 0;z-index:10}.document-savebar>label{flex:1;margin:0}.space-actions{display:flex;gap:8px;align-items:center;padding-bottom:1px}
input,textarea,select{display:block;border:1px solid var(--vp-c-divider);border-radius:5px;padding:9px;width:100%;background:var(--vp-c-bg);color:var(--vp-c-text-1)}textarea{font-family:var(--vp-font-family-mono);line-height:1.7}label{display:block;margin:12px 0;font-size:13px}.space-page-row{display:block;width:100%;text-align:left;margin:0;padding:18px 8px;border-width:0 0 1px;border-radius:0}.space-form{padding:24px;background:var(--vp-c-bg-soft);border-radius:8px}.space-form button{margin:8px}.space-status:empty{display:none}.space-status{position:fixed;bottom:20px;right:24px;max-width:560px;padding:14px 20px;background:var(--vp-c-bg);border:1px solid var(--vp-c-divider);box-shadow:0 4px 24px #0002;z-index:40;border-radius:8px;font-size:13px}pre{white-space:pre-wrap;overflow-wrap:anywhere}main,aside{min-width:0}.space-menu input{min-width:0}
@media(max-width:700px){.space-header{padding:0 12px}.space-switch{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.space-layout{grid-template-columns:minmax(0,1fr)}.space-sidebar{position:static;height:auto;border:0}.workspace-content{padding:20px 16px}.space-document-header{grid-template-columns:minmax(0,1fr)}.document-savebar,.space-heading{flex-wrap:wrap}.space-cards,.space-workspace:not(.in-space)>.space-heading{margin:24px 16px}.space-status{right:12px;left:12px}}
</style>
