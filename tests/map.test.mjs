import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { filterMarkers, parseProgress, clampZoom } from '../docs/.vitepress/theme/components/map-state.mjs'
const map = JSON.parse(readFileSync(new URL('../docs/games/zelda-totk/data/demo-map.json', import.meta.url)))
test('category, query and completion filters compose', () => {
 assert.deepEqual(filterMarkers(map.markers, '宝箱', '宝箱', true, ['chest']).map(m=>m.id), ['chest-2'])
 assert.equal(filterMarkers(map.markers, '', '不存在', false, []).length, 0)
})
test('saved progress rejects corrupt, unknown and duplicate entries', () => {
 assert.deepEqual(parseProgress('bad', ['camp']), [])
 assert.deepEqual(parseProgress('{}', ['camp']), [])
 assert.deepEqual(parseProgress('["camp","camp","unknown",null]', ['camp']), ['camp'])
})
test('zoom remains within supported bounds', () => { assert.equal(clampZoom(9),3); assert.equal(clampZoom(-2),1) })
test('map IDs and coordinates are valid', () => {
 assert.equal(new Set(map.markers.map(m=>m.id)).size,map.markers.length)
 for (const m of map.markers) { assert.ok(m.x>=0 && m.x<=100 && m.y>=0 && m.y<=100); assert.ok(m.name && m.type && m.description) }
})
test('every catalog game has a content page and unique ID', () => {
 const games=JSON.parse(readFileSync(new URL('../docs/data/games.json',import.meta.url)))
 assert.equal(new Set(games.map(g=>g.id)).size,games.length)
 for(const game of games) assert.ok(existsSync(new URL('../docs/games/'+game.id+'/index.md',import.meta.url)))
})
