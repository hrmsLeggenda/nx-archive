export function gameFromUrl(url) { return url.match(/\/games\/([^/]+)\//)?.[1] || null }
export function normalizeUrl(url) { return url.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/\/$/, '') || '/' }
export function pageCategories(url, frontmatter, wikis) {
 const game=gameFromUrl(url), wiki=wikis[game]
 if(!wiki) return []
 if(Array.isArray(frontmatter.categories)) {
 const ids=new Set(frontmatter.categories)
 for(const id of frontmatter.categories) {
  let parent=wiki.groups.find(g=>g.id===id)?.parent
  const seen=new Set([id])
  while(parent&&!seen.has(parent)){seen.add(parent);ids.add(parent);parent=wiki.groups.find(g=>g.id===parent)?.parent}
 }
 return [...ids]
 }
 if(url.includes('/categories/') || url.endsWith('/all-pages.html')) return []
 const path=normalizeUrl(url).slice(('/games/'+game+'/').length)
 const group=wiki.groups.find(g=>g.items.some(i=>i.path===path))
 return group ? [group.id] : path.startsWith('data/generated/') ? ['training'] : []
}
export function filterPages(pages, game, query='', category='') {
 const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
 return pages.filter(p=>p.game===game && (!category || p.categories.includes(category)) && terms.every(t=>(p.title+' '+p.text+' '+(p.aliases||[]).join(' ')).toLocaleLowerCase().includes(t)))
}
export function categoryCounts(pages, game) {
 const counts={}
 for(const p of pages.filter(p=>p.game===game)) for(const id of p.categories) counts[id]=(counts[id]||0)+1
 return counts
}
