import {allowedPath} from '../services/collaboration/worker.mjs'
export function eligible(pr,run,files){return run.conclusion==='success'&&run.path==='.github/workflows/ci.yml'&&run.head_repository?.full_name===pr.base.repo.full_name&&pr.state==='open'&&!pr.draft&&pr.base.ref==='main'&&pr.head.repo?.full_name===pr.base.repo.full_name&&/^work\/wiki-web\/[a-f0-9-]{36}$/.test(pr.head.ref)&&run.head_branch===pr.head.ref&&run.head_sha===pr.head.sha&&files.length>0&&files.every(f=>allowedPath(f.filename)&&['added','modified'].includes(f.status))}
export async function publish({github,context,core}){
 const {owner,repo}=context.repo,run=context.payload.workflow_run
 if(run.conclusion!=='success')return
 const pulls=await github.paginate(github.rest.pulls.list,{owner,repo,state:'open',head:owner+':'+run.head_branch})
 for(const candidate of pulls){
  const {data:pr}=await github.rest.pulls.get({owner,repo,pull_number:candidate.number}),files=await github.paginate(github.rest.pulls.listFiles,{owner,repo,pull_number:pr.number})
  if(!eligible(pr,run,files))continue
  const {data:permission}=await github.rest.repos.getCollaboratorPermissionLevel({owner,repo,username:pr.user.login});if(!['admin','maintain','write'].includes(permission.permission))continue
  const checks=await github.paginate(github.rest.checks.listForRef,{owner,repo,ref:pr.head.sha});if(checks.some(c=>c.status!=='completed'||!['success','neutral','skipped'].includes(c.conclusion)))continue
  if(pr.mergeable===false||pr.mergeable===null){core.warning('无法自动合并，保留提交等待版本冲突处理。');continue}
  const {data:merged}=await github.rest.pulls.merge({owner,repo,pull_number:pr.number,sha:pr.head.sha,merge_method:'squash'})
  if(merged.merged){await github.rest.actions.createWorkflowDispatch({owner,repo,workflow_id:'deploy.yml',ref:'main'});core.info('已自动合并并触发 Pages 发布：'+pr.number)}
 }
}
