export const REPO='hrmsLeggenda/nx-archive'
export const templates={
 guide:{label:'攻略',body:'## 适用范围\n\n说明路线、阶段、难度和前置条件。\n\n## 操作步骤\n\n1. 填写已核实的步骤。\n\n## 注意事项\n\n注明随机情况、错过期限或待验证内容。'},
 entry:{label:'资料条目',body:'## 基本资料\n\n填写已核实的事实；未知字段保留“待验证”。\n\n## 获取或解锁条件\n\n说明阶段、路线和条件。'},
 map:{label:'地图说明',body:'## 地图范围\n\n说明游戏阶段、图层和坐标来源。\n\n## 点位记录\n\n| 地点 | 获取方式 | 条件 | 来源 |\n| --- | --- | --- | --- |\n\n## 素材授权\n\n注明底图授权；没有真实坐标时须标明“地点索引”。'},
 note:{label:'条目补充与勘误',body:'## 补充或勘误\n\n描述原记录、核实结果与证据。此页不直接改写导入数值。\n\n## 复核信息\n\n记录路线、阶段、难度和实测方法。'}
}
const scalar=value=>{try{return JSON.parse(value)}catch{return value.trim().replace(/^['"]|['"]$/g,'')}}
export function splitDocument(raw){
 const match=raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
 return {front:match?.[1]||'',body:match?raw.slice(match[0].length).trimStart():raw}
}
export function readFields(raw){
 const {front,body}=splitDocument(raw),values={}
 const lines=front.split(/\r?\n/)
 for(let i=0;i<lines.length;i++){
  const m=lines[i].match(/^([A-Za-z]\w*):\s*(.*)$/)
  if(!m)continue
  let v=scalar(m[2])
  if(!m[2].trim()){
   const list=[]
   while(i+1<lines.length && /^\s+-\s/.test(lines[i+1]))list.push(scalar(lines[++i].replace(/^\s+-\s*/,'')))
   if(list.length)v=list
  }
  values[m[1]]=v
 }
 const text=v=>typeof v==='string'?v:'',list=v=>Array.isArray(v)?v.filter(s=>typeof s==='string'):[]
 return {title:text(values.title)||body.match(/^# (.+)$/m)?.[1]||'',categories:list(values.categories),
  aliases:list(values.aliases),platform:text(values.platform),version:text(values.version)||'未确认',
  spoiler:text(values.spoiler)||'无',verified:text(values.verified),sources:list(values.sources),kind:text(values.kind)||'攻略'}
}
export function writeFields(raw,fields){
 const {front,body}=splitDocument(raw),keys=new Set(Object.keys(fields)),kept=[]
 let skipping=false
 for(const line of front.split(/\r?\n/)){
  const key=line.match(/^([A-Za-z]\w*):/)?.[1]
  if(key){skipping=keys.has(key);if(!skipping)kept.push(line)}
  else if(!skipping && line.trim())kept.push(line)
 }
 const fm=[...kept,...Object.entries(fields).map(([k,v])=>k+': '+JSON.stringify(v))]
 const text=body.replace(/^# .+$/m,'# '+fields.title)
 return '---\n'+fm.join('\n')+'\n---\n\n'+(text.match(/^# /m)?text:'# '+fields.title+'\n\n'+text).trim()+'\n'
}
export function sourcePath(game,path){return 'docs/games/'+game+'/'+path+'.md'}
export function validPath(path){return /^(guides|articles|maps|notes)\/[a-z0-9]+(?:[a-z0-9/-]*[a-z0-9])?$/.test(path) && !path.includes('..') && !path.includes('//')}
export function validateDocument({raw,game,path,wikis,pages,originalPath='',summary=''}){
 const f=readFields(raw),errors=[]
 if(!wikis[game])errors.push('请选择有效的游戏 Wiki。')
 if(!originalPath && !validPath(path))errors.push('新页面路径须以 guides/、articles/、maps/ 或 notes/ 开头，使用小写英文、数字和短横线。')
 if(originalPath && path!==originalPath)errors.push('重命名请使用 GitHub 文件编辑器，站内修改须保留原路径。')
 if(pages.some(p=>p.game===game && p.path===path) && path!==originalPath)errors.push('目标路径已存在，请从该页面进入编辑。')
 if(!f.title.trim())errors.push('请填写页面标题。')
 if(f.title.includes('\n'))errors.push('标题不能换行。')
 const duplicate=pages.find(p=>p.game===game && p.path!==path && [p.title,...(p.aliases||[])].some(n=>n.trim().toLowerCase()===f.title.trim().toLowerCase()))
 if(duplicate)errors.push('标题或别名与已有页面重复：'+duplicate.title+'。')
 if(!f.categories.length || f.categories.some(id=>!wikis[game]?.groups.some(g=>g.id===id)))errors.push('请至少选择一个有效分类。')
 if(!f.platform.trim())errors.push('请填写平台。')
 if(!f.version.trim())errors.push('请填写游戏版本；未知可写“未确认”。')
 if(!['无','轻度','重度'].includes(f.spoiler))errors.push('请选择剧透程度。')
 if(!/^\d{4}-\d{2}-\d{2}$/.test(f.verified)||Number.isNaN(Date.parse(f.verified))||new Date(f.verified).toISOString().slice(0,10)!==f.verified)errors.push('请填写有效的核对日期。')
 if(!f.sources.length || f.sources.some(url=>!/^https?:\/\/[^\s]+$/.test(url)))errors.push('请填写至少一个有效的 http/https 资料来源链接。')
 if(!summary.trim())errors.push('请填写编辑摘要。')
 if(!splitDocument(raw).body.trim())errors.push('正文不能为空。')
 if(raw.length>200000)errors.push('页面超过 200000 字符，请拆分内容。')
 return errors
}
export function draftKey(game,path){return 'nx-archive:editor:v1:'+game+':'+(path||'new')}
export function readDraft(storage,key){
 try{const d=JSON.parse(storage.getItem(key)||'null');return d?.schema===1&&typeof d.raw==='string'&&typeof d.path==='string'&&typeof d.summary==='string'?d:null}catch{return null}
}
export function saveDraft(storage,key,draft){try{storage.setItem(key,JSON.stringify({...draft,schema:1,savedAt:new Date().toISOString()}));return true}catch{return false}}
export function compareRevision(expected,actual){return expected===actual?'clean':'conflict'}
export function githubTarget(game,path,exists){
 const full=sourcePath(game,path)
 return exists?'https://github.com/'+REPO+'/edit/main/'+full:'https://github.com/'+REPO+'/new/main?filename='+encodeURIComponent(full)
}
export function lineDiff(before,after){
 const a=before.split('\n'),b=after.split('\n')
 let start=0,end=0
 while(start<a.length&&start<b.length&&a[start]===b[start])start++
 while(end<a.length-start&&end<b.length-start&&a[a.length-1-end]===b[b.length-1-end])end++
 return [...a.slice(start,a.length-end).map(text=>({type:'removed',text})),...b.slice(start,b.length-end).map(text=>({type:'added',text}))]
}
const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
function inline(raw){
 let s=escape(raw)
 s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*|\.{1,2}\/[^\s)]*)\)/g,(_,label,url)=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+'</a>')
 return s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\x60([^\x60]+)\x60/g,'<code>$1</code>')
}
export function previewMarkdown(raw){
 const {body}=splitDocument(raw),lines=body.split(/\r?\n/),out=[]
 let code=null,list=null,table=false
 const close=()=>{if(list){out.push('</'+list+'>');list=null}if(table){out.push('</tbody></table></div>');table=false}}
 for(let i=0;i<lines.length;i++){
  const line=lines[i]
  if(line.startsWith('~~~')||line.startsWith('\x60\x60\x60')){
   close();if(code!==null){out.push('<pre><code>'+escape(code.join('\n'))+'</code></pre>');code=null}else code=[];continue
  }
  if(code!==null){code.push(line);continue}
  if(!line.trim()){close();continue}
  const head=line.match(/^(#{1,6})\s+(.+)$/)
  if(head){close();out.push('<h'+head[1].length+'>'+inline(head[2])+'</h'+head[1].length+'>');continue}
  if(line.trim().startsWith('|')&&line.trim().endsWith('|')){
   if(/^\s*\|[\s:|\-]+\|\s*$/.test(line))continue
   if(!table){close();table=true;out.push('<div class="scroll"><table><tbody>')}
   out.push('<tr>'+line.trim().slice(1,-1).split('|').map(c=>'<td>'+inline(c.trim())+'</td>').join('')+'</tr>');continue
  }
  const item=line.match(/^\s*(?:([-*])|\d+\.)\s+(.+)$/)
  if(item){const tag=item[1]?'ul':'ol';if(list!==tag){close();list=tag;out.push('<'+tag+'>')}out.push('<li>'+inline(item[2])+'</li>');continue}
  close()
  out.push(line.startsWith('> ')?'<blockquote>'+inline(line.slice(2))+'</blockquote>':'<p>'+inline(line)+'</p>')
 }
 close();if(code!==null)out.push('<pre><code>'+escape(code.join('\n'))+'</code></pre>')
 return out.join('\n')
}
