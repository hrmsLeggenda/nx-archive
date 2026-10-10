import test from 'node:test'
import assert from 'node:assert/strict'
import MiniSearch from 'minisearch'
import { tokenize } from '../docs/.vitepress/search.mjs'
test('Chinese keywords find substrings in continuous prose', () => {
 const index = new MiniSearch({ fields:['text'], tokenize, searchOptions:{combineWith:'AND',prefix:true,fuzzy:false} })
 index.addAll([{id:1,text:'塞尔达传说王国之泪的神庙收集指南'},{id:2,text:'马力欧赛车指南 Switch 2'}])
 assert.equal(index.search('神庙')[0].id,1)
 assert.equal(index.search('王国之泪')[0].id,1)
 assert.equal(index.search('Switch')[0].id,2)
 assert.equal(index.search('不存在的游戏').length,0)
})
