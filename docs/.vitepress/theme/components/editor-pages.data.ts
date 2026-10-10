import { createContentLoader } from 'vitepress'
import { execFileSync } from 'node:child_process'
import wikis from '../../../data/wikis.json'
import { gameFromUrl } from './wiki-model.mjs'
export default createContentLoader('games/**/*.md', {
 includeSrc:true,
 transform(pages){
  const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
  return {revision,pages:pages.filter(p=>!p.frontmatter.generated&&!p.url.includes('/data/generated/')&&!p.url.endsWith('/edit.html')).map(p=>{
   const game=gameFromUrl(p.url),path=p.url.replace('/games/'+game+'/','').replace(/\.html$/,'').replace(/\/$/,'/index')||'index'
   const file='docs/games/'+game+'/'+path+'.md'
   let sha=null
   try{sha=execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim()}catch{}
   return {game,path,url:p.url,title:p.frontmatter.title||p.src?.match(/^# (.+)$/m)?.[1]||wikis[game]?.title,aliases:p.frontmatter.aliases||[],raw:p.src||'',sha}
  })}
 }
})
