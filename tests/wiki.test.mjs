import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
const root = new URL('../docs/',import.meta.url)
const wikis=JSON.parse(readFileSync(new URL('data/wikis.json',root)))
test('all game Wiki categories resolve within their own game', () => {
 for(const [id,wiki] of Object.entries(wikis)) {
  assert.ok(existsSync(new URL('games/'+id+'/index.md',root)))
  for(const group of wiki.groups) for(const item of group.items) {
   assert.ok(!item.path.startsWith('/') && !item.path.includes('..'))
   assert.ok(existsSync(new URL('games/'+id+'/'+(item.path || 'index')+'.md',root)),id+'/'+item.path)
  }
 }
})
test('map identity belongs to game and links stay within that Wiki',()=>{
 const map=JSON.parse(readFileSync(new URL('games/fire-emblem-fw/data/world-index.json',root)))
 assert.equal(map.gameId,'fire-emblem-fw');assert.equal(map.mode,'index')
 for(const m of map.markers) assert.ok(m.link.startsWith('/games/'+map.gameId+'/'))
 assert.ok(map.notice.includes('不表示实际坐标'))
})
