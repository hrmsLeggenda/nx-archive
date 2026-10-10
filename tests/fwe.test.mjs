import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {effectiveGrowth,expectation,matchesRecord} from '../docs/.vitepress/theme/components/fwe-growth.mjs'
const read=name=>JSON.parse(readFileSync(new URL('../docs/games/fire-emblem-fw/data/'+name,import.meta.url)))
test('growth preserves missing values, negative bonuses and rates over 100%',()=>{
 assert.equal(effectiveGrowth(45,-5),40)
 assert.equal(effectiveGrowth(null,0),null)
 assert.equal(effectiveGrowth(45,null),null)
 assert.equal(expectation(70,40,10),11)
 assert.equal(expectation(45,5,0),0)
})
test('resource stages and routes never leak across one another',()=>{
 const rows=read('resources.json')
 const p1=rows.filter(r=>matchesRecord(r,'part1','Cai'))
 const p3=rows.filter(r=>matchesRecord(r,'part3','Salvation'))
 assert.ok(p1.length && p3.length)
 assert.equal(rows.filter(r=>matchesRecord(r,'part3','Cai')).length,0)
 assert.ok(p1.some(r=>r.locationId==='dragon-forest'&&r.resource==='ラッキーコイン'))
 assert.ok(p3.some(r=>r.locationId==='dragon-forest'&&r.resource==='天使の衣'))
})
test('records retain unknown coordinates and distinguish fixed rewards from random pools',()=>{
 for(const filename of ['resources.json','timeline.json']){
  const rows=read(filename)
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length)
  for(const r of rows){assert.equal(r.gameId,'fire-emblem-fw');assert.ok(r.source.startsWith('https://'));assert.ok(r.routes.length);assert.equal(r.gameVersion,null)}
 }
 for(const r of read('resources.json')){
  assert.equal(r.coordinates,null)
  if(r.method==='gather'){assert.equal(r.certainty,'random-pool');assert.equal(r.quantity,null);assert.equal(r.refresh,null)}
 }
 assert.ok(read('timeline.json').filter(r=>r.kind==='subquest').every(r=>r.certainty==='conditional'))
})
