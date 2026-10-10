import test from 'node:test'
import assert from 'node:assert/strict'
import {gameFromUrl,pageCategories,filterPages,categoryCounts,normalizeUrl} from '../docs/.vitepress/theme/components/wiki-model.mjs'
const wikis={alpha:{groups:[{id:'guides',items:[{path:'guides/start'}]}]},beta:{groups:[]}}
test('Wiki categories support multiple memberships and strict game scope',()=>{
 const pages=[{game:'alpha',title:'角色',text:'speed',categories:['characters','guides']},{game:'beta',title:'角色',text:'speed',categories:['characters']}]
 assert.equal(filterPages(pages,'alpha','speed','guides').length,1)
 assert.equal(categoryCounts(pages,'alpha').characters,1)
 assert.deepEqual(pageCategories('/games/alpha/guides/start.html',{},wikis),['guides'])
 assert.deepEqual(pageCategories('/games/alpha/a.html',{categories:['characters','guides','characters']},wikis),['characters','guides'])
 assert.equal(gameFromUrl('/games/alpha/maps/world.html'),'alpha')
 assert.equal(normalizeUrl('/games/alpha/index.html'),normalizeUrl('/games/alpha/'))
})
