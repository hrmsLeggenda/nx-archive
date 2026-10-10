import test from 'node:test'
import assert from 'node:assert/strict'
import {entityForName,relatedEntities} from '../docs/.vitepress/theme/components/entity-model.mjs'
import {pageCategories} from '../docs/.vitepress/theme/components/wiki-model.mjs'
test('entity aliases resolve to one page and relations work in both directions',()=>{
 const graph={entities:[{id:'a',kind:'characters',name:'Cai',aliases:['凯伊']},{id:'b',kind:'quests',name:'q',aliases:[]}],edges:[{from:'a',to:'b'}]}
 assert.equal(entityForName(graph,'characters','凯伊').id,'a')
 assert.equal(entityForName(graph,'characters','Cai').id,'a')
 assert.deepEqual(relatedEntities(graph,'a').map(e=>e.id),['b'])
 assert.deepEqual(relatedEntities(graph,'b').map(e=>e.id),['a'])
})
test('subcategory membership propagates to parent without duplicates or loops',()=>{
 const wikis={g:{groups:[{id:'training',items:[]},{id:'characters',parent:'training',items:[]}]}}
 assert.deepEqual(pageCategories('/games/g/entries/a.html',{categories:['characters']},wikis),['characters','training'])
})
