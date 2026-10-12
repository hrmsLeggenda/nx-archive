import {validateSpace} from './space-model.mjs'
const repo='hrmsLeggenda/nx-archive',api='https://api.github.com/repos/'+repo
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})
export function allowedPath(path){if(typeof path==='string'&&/^docs\/games\/[a-z0-9][a-z0-9-]{0,63}\/space\.json$/.test(path))return true;return typeof path==='string'&&/^docs\/games\/[a-z0-9-]+\/(guides|notes|maps)\/[a-z0-9][a-z0-9/-]*\.md$/.test(path)&&!path.includes('..')||typeof path==='string'&&/^docs\/games\/fire-emblem-fw\/data\/overrides\/[a-z]+\/[a-z0-9-]+\.json$/.test(path)}
export function validateSubmission(b){if(!allowedPath(b.path)||typeof b.content!=='string'||b.content.length>200000||!b.content.trim()||typeof b.summary!=='string'||!b.summary.trim()||b.summary.length>200||!(b.baseSha===null||/^[a-f0-9]{40}$/.test(b.baseSha)))throw Object.assign(new Error('路径、正文、摘要或版本无效。'),{status:400})}
const key=()=>crypto.randomUUID()+crypto.randomUUID()
async function gh(token,path,method='GET',body){const r=await fetch(path.startsWith('https:')?path:api+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','User-Agent':'NX-Archive','X-GitHub-Api-Version':'2022-11-28'},body:body===undefined?undefined:JSON.stringify(body)});if(r.status===404)return null;if(!r.ok)throw Object.assign(new Error('GitHub 请求失败，请稍后重试。'),{status:r.status===401||r.status===403?403:502});return r.status===204?{}:r.json()}
function encoded(s){return btoa(Array.from(new TextEncoder().encode(s),b=>String.fromCharCode(b)).join(''))}
async function session(request,env){const id=request.headers.get('Authorization')?.match(/^Bearer ([\w-]+)$/)?.[1],s=id&&await env.COLLAB.get('session:'+id,'json');if(!s||s.expires<Date.now())throw Object.assign(new Error('请重新登录。'),{status:401});return {...s,id}}
async function route(request,env){
 const u=new URL(request.url),p=u.pathname
 if(p==='/health')return json({ready:Boolean(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET&&env.COLLAB&&env.SITE_ORIGIN&&env.CALLBACK_URL)})
 if(!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET||!env.COLLAB) return json({error:'协作服务尚未配置。'},503)
 if(p==='/auth/login'){
  const state=key();await env.COLLAB.put('state:'+state,'1',{expirationTtl:600})
  const target=new URL('https://github.com/login/oauth/authorize');target.search=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:env.CALLBACK_URL,state}).toString();return Response.redirect(target,302)
 }
 if(p==='/auth/callback'){
  const state=u.searchParams.get('state'),code=u.searchParams.get('code');if(!state||!code||!await env.COLLAB.get('state:'+state))return json({error:'授权状态已失效。'},400)
  await env.COLLAB.delete('state:'+state)
  const r=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:env.CALLBACK_URL})}),v=await r.json()
  if(!v.access_token)return json({error:'GitHub 授权失败。'},401)
  const user=await gh(v.access_token,'https://api.github.com/user'),permission=await gh(v.access_token,'/collaborators/'+encodeURIComponent(user.login)+'/permission')
  if(!['admin','maintain','write'].includes(permission?.permission))return json({error:'当前账户没有此仓库的写入权限。'},403)
  const id=key();await env.COLLAB.put('session:'+id,JSON.stringify({token:v.access_token,login:user.login,expires:Date.now()+3600000}),{expirationTtl:3600})
  return new Response(null,{status:302,headers:{Location:env.SITE_ORIGIN+'/nx-archive/collaboration.html#session='+id,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}})
 }
 const s=await session(request,env)
 if(p==='/session'&&request.method==='GET')return json({login:s.login,expires:s.expires})
 if(p==='/logout'&&request.method==='POST'){await env.COLLAB.delete('session:'+s.id);return json({ok:true})}
 if(p==='/submit'&&request.method==='POST'){
  const raw=await request.text();if(raw.length>250000)return json({error:'请求过大。'},413);const b=JSON.parse(raw);validateSubmission(b);if(b.path.endsWith('/space.json')){let value;try{value=JSON.parse(b.content)}catch{return json({error:'空间数据格式无效。'},400)}if(validateSpace(value).length||b.path!=='docs/games/'+value.id+'/space.json')return json({error:'空间配置无效。'},400)}
  const permission=await gh(s.token,'/collaborators/'+encodeURIComponent(s.login)+'/permission');if(!['admin','maintain','write'].includes(permission?.permission))return json({error:'仓库写入权限已撤销。'},403)
  const head=await gh(s.token,'/git/ref/heads/main'),sha=head.object.sha,current=await gh(s.token,'/contents/'+b.path+'?ref='+sha)
  if((current?.sha??null)!==b.baseSha)return json({error:'主线已更新，请合并最新内容后重试。',currentSha:current?.sha??null,content:current?.content??null},409)
  const branch='work/wiki-web/'+crypto.randomUUID();await gh(s.token,'/git/refs','POST',{ref:'refs/heads/'+branch,sha})
  try{
   await gh(s.token,'/contents/'+b.path,'PUT',{message:b.summary,content:encoded(b.content),branch,...(current?{sha:current.sha}:{})})
   const pr=await gh(s.token,'/pulls','POST',{title:b.summary,head:branch,base:'main',body:'站内编辑提交：`'+b.path+'`\n\n基线：'+(b.baseSha||'新页面')+'\n\n请检查来源、内容差异和 Actions。'})
   return json({number:pr.number,url:pr.html_url,branch},201)
  }catch(e){e.message+=' 提交分支：'+branch;throw e}
 }
 if(p==='/draft'&&['GET','POST'].includes(request.method)){
  const raw=request.method==='POST'?await request.text():null;if(raw&&raw.length>250000)return json({error:'请求过大。'},413)
  const b=raw?JSON.parse(raw):null,path=b?.path||u.searchParams.get('path')
  if(!allowedPath(path)||!env.DRAFTS)return json({error:'草稿服务未配置或路径无效。'},400)
  if(b&&(typeof b.content!=='string'||b.content.length>200000||!Number.isInteger(b.revision)||b.revision<0))return json({error:'草稿无效。'},400)
  const object=env.DRAFTS.get(env.DRAFTS.idFromName(s.login+':'+path))
  return object.fetch(new Request('https://draft/',{method:request.method,body:b?JSON.stringify(b):undefined}))
 }
 if(p==='/history' &&request.method==='GET'){
  const path=u.searchParams.get('path');if(!allowedPath(path))return json({error:'路径不被允许。'},400)
  const commits=await gh(s.token,'/commits?path='+encodeURIComponent(path)+'&sha=main&per_page=20');return json(commits.map(c=>({sha:c.sha,message:c.commit.message,date:c.commit.author.date})))
 }
 if(p==='/revision'&&request.method==='GET'){
  const path=u.searchParams.get('path'),sha=u.searchParams.get('sha');if(!allowedPath(path)||!sha||! /^[a-f0-9]{40}$/.test(sha))return json({error:'版本无效。'},400)
  const file=await gh(s.token,'/contents/'+path+'?ref='+sha);if(!file)return json({error:'此版本没有该文件。'},404);return json({content:file.content,sha:file.sha})
 }
 if(p==='/reviews' &&request.method==='GET'){
  const pulls=await gh(s.token,'/pulls?state=all&per_page=30');return json(pulls.filter(x=>x.head.ref.startsWith('work/wiki-web/')&&x.user.login===s.login).map(x=>({number:x.number,title:x.title,url:x.html_url,state:x.merged_at?'merged':x.state,sha:x.head.sha})))
 }
 if(/^\/reviews\/\d+$/.test(p)&&request.method==='GET'){
  const n=p.split('/').pop(),pr=await gh(s.token,'/pulls/'+n);if(!pr||!pr.head.ref.startsWith('work/wiki-web/'))return json({error:'未找到站内提交。'},404)
  const reviews=await gh(s.token,'/pulls/'+n+'/reviews'),checks=await gh(s.token,'/commits/'+pr.head.sha+'/check-runs');return json({state:pr.merged?'merged':pr.state,url:pr.html_url,mergeable:pr.mergeable,reviews:reviews.map(x=>({user:x.user.login,state:x.state,body:x.body})),checks:checks.check_runs.map(x=>({name:x.name,status:x.status,conclusion:x.conclusion,url:x.html_url}))})
 }
 return json({error:'未找到接口。'},404)
}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin'),siteOrigin=env.SITE_ORIGIN?new URL(env.SITE_ORIGIN).origin:'',trusted=origin===siteOrigin
 if(origin&&!trusted)return json({error:'来源不被允许。'},403)
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':siteOrigin,'Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'}})
 let result;try{if(Number(request.headers.get('Content-Length'))>250000)return json({error:'请求过大。'},413);result=await route(request,env)}catch(e){result=json({error:e.status?e.message:'服务暂时不可用。'},e.status||500)}
 const out=new Response(result.body,result);if(trusted)out.headers.set('Access-Control-Allow-Origin',siteOrigin);out.headers.set('Vary','Origin');out.headers.set('Referrer-Policy','no-referrer');return out
}}

export class DraftStore {
 constructor(ctx){this.ctx=ctx}
 async fetch(request){
  if(request.method==='GET')return json(await this.ctx.storage.get('draft')||{revision:0,content:''})
  const body=await request.json()
  return this.ctx.storage.transaction(async tx=>{
   const previous=await tx.get('draft')||{revision:0,content:''}
   if(previous.revision!==body.revision)return json({error:'云端草稿已更新，请恢复最新草稿再合并。',draft:previous},409)
   const next={content:body.content,revision:previous.revision+1,savedAt:new Date().toISOString()};await tx.put('draft',next);return json(next)
  })
 }
}
