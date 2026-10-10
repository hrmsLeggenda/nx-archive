import { createContentLoader } from 'vitepress'
import { execFileSync } from 'node:child_process'
import wikis from '../../../data/wikis.json'
import { gameFromUrl, pageCategories } from './wiki-model.mjs'
export default createContentLoader('games/**/*.md', {
 includeSrc: true,
 transform(pages) { return pages.map(page => {
  const game=gameFromUrl(page.url)
  const relativePath='docs'+page.url.replace(/\.html$/,'.md').replace(/\/$/,'/index.md')
  let updated=null
  try { updated=execFileSync('git',['log','-1','--format=%cI','--',relativePath],{encoding:'utf8'}).trim() || null } catch {}
  return {url:page.url, game, title:page.frontmatter.title || page.src?.match(/^# (.+)$/m)?.[1] || wikis[game]?.title || 'Wiki 首页',
   categories:pageCategories(page.url,page.frontmatter,wikis), category:page.frontmatter.category || '概览',
   kind:page.frontmatter.kind || (page.url.includes('/guides/')?'攻略':page.url.includes('/maps/')?'地图':/database|resources/.test(page.url)?'工具':'页面'),
   aliases:page.frontmatter.aliases || [], entityId:page.frontmatter.entityId || null, updated, generated:Boolean(page.frontmatter.generated || page.url.includes('/data/generated/')),
   text:(page.src || '').replace(/<script[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,'')}
 }) }
})
