import schema from '../../../data/structured-schema.json' with {type:'json'}
export const definitions=schema.datasets
export function encodeValue(value){return value===null||value===undefined?'':Array.isArray(value)?value.join('\n'):String(value)}
export function decodeValue(text,spec){
 if(text===''&&spec.nullable)return null
 if(spec.type==='integer'){
  if(!/^-?\d+$/.test(text))throw new Error(spec.label+'须为整数或未知值。')
  return Number(text)
 }
 if(spec.type==='list')return text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
 return text
}
export function validateValue(value,spec){
 if(value===null)return Boolean(spec.nullable)
 const text=v=>typeof v==='string'&&Boolean(v.trim())&&v.length<=2000&&!/[<>]|\{\{|\}\}/.test(v)
 if(spec.type==='integer')return Number.isInteger(value)&&value>=spec.min&&value<=spec.max
 if(spec.type==='enum')return spec.values.includes(value)
 if(spec.type==='list')return Array.isArray(value)&&value.length<=50&&value.every(text)&&new Set(value).size===value.length&&(!spec.values||(value.length>0&&value.every(v=>spec.values.includes(v))))
 if(spec.type==='monthday'){
  const m=typeof value==='string'&&value.match(/^(\d{1,2})\/(\d{1,2})$/)
  if(!m)return false
  const date=new Date(Date.UTC(2000,Number(m[1])-1,Number(m[2])))
  return date.getUTCMonth()===Number(m[1])-1&&date.getUTCDate()===Number(m[2])
 }
 return text(value)
}
export function initialDraft(record){
 return {active:record.patch?.changes.map(c=>c.field)||[],values:Object.fromEntries(Object.entries(record.effective).map(([k,v])=>[k,encodeValue(v)])),
  sources:record.patch?.evidence.sources.join('\n')||'',checked:record.patch?.evidence.checked||new Date().toLocaleDateString('sv-SE'),
  gameVersion:record.patch?.evidence.gameVersion||'未确认',reason:record.patch?.evidence.reason||'',baselineHash:record.baselineHash,rebase:false}
}
export function buildPatch(record,draft){
 const errors=[],changes=[],specs=definitions[record.dataset]?.fields
 if(!specs)return {errors:['无效的数据集。'],patch:null}
 if(!Array.isArray(draft.active)||new Set(draft.active).size!==draft.active.length)return {errors:['重复或无效的字段。'],patch:null}
 for(const field of draft.active){
  const spec=Object.hasOwn(specs,field)?specs[field]:null
  if(!spec){errors.push('不允许修改字段：'+field);continue}
  let value
  try{value=decodeValue(draft.values[field]??'',spec)}catch(e){errors.push(e.message);continue}
  if(!validateValue(value,spec)){errors.push(spec.label+'格式或范围不正确。');continue}
  const old=(draft.importedChanges || record.patch?.changes)?.find(c=>c.field===field)
  const same=old&&JSON.stringify(old.value)===JSON.stringify(value)
  changes.push({field,baseValue:same&&!draft.rebase?old.baseValue:record.baseline[field],value})
 }
 const sources=draft.sources.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
 if(!sources.length||sources.length>10||sources.some(s=>!/^https?:\/\/[^\s<>{}]+$/.test(s)))errors.push('请填写有效的公开来源链接。')
 const date=typeof draft.checked==='string'&&draft.checked.match(/^\d{4}-\d{2}-\d{2}$/)&&new Date(draft.checked)
 if(!date||Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==draft.checked)errors.push('核对日期无效。')
 if(!validateValue(draft.reason,{type:'text'}))errors.push('请填写勘误原因或编辑摘要。')
 if(!validateValue(draft.gameVersion,{type:'text'}))errors.push('请填写游戏版本；未知可写“未确认”。')
 const candidate={...record.baseline,...Object.fromEntries(changes.map(c=>[c.field,c.value]))}
 if(['resources','timeline'].includes(record.dataset)){
  const permitted=candidate.phase==='part3'?['Salvation']:['Cai','Dietrich','Theodora','Leda']
  if(!candidate.routes?.length||candidate.routes.some(r=>!permitted.includes(r)))errors.push('阶段与适用路线不一致。')
 }
 if(record.dataset==='resources'){
  if(candidate.method==='gather'&&(candidate.certainty!=='random-pool'||candidate.quantity!==null))errors.push('随机采集池不能保证固定数量。')
  if(candidate.method==='chest'&&candidate.certainty!=='fixed')errors.push('宝箱记录须标注固定奖励。')
 }
 return {errors,patch:errors.length?null:{schemaVersion:1,gameId:'fire-emblem-fw',dataset:record.dataset,recordId:record.id,changes,
  evidence:{sources,checked:draft.checked,gameVersion:draft.gameVersion,reason:draft.reason}}}
}
export function correctionState(base,change){return JSON.stringify(base)===JSON.stringify(change.value)?'matches-upstream':JSON.stringify(base)===JSON.stringify(change.baseValue)?'applied':'needs-review'}
export function correctionKey(dataset,id){return 'nx-archive:structured:v1:fire-emblem-fw:'+dataset+':'+id}
export function loadCorrectionDraft(storage,key){
 try{
  const d=JSON.parse(storage.getItem(key)||'null')
  return d?.schema===1&&d.draft&&Array.isArray(d.draft.active)&&typeof d.draft.values==='object'&&typeof d.draft.sources==='string'&&typeof d.draft.reason==='string'?d:null
 }catch{return null}
}
export function storeCorrectionDraft(storage,key,draft){
 try{storage.setItem(key,JSON.stringify({schema:1,draft,savedAt:new Date().toISOString()}));return true}catch{return false}
}
