import test from 'node:test'
import assert from 'node:assert/strict'
import {readFields,writeFields,validateDocument,validPath,draftKey,readDraft,saveDraft,compareRevision,githubTarget,lineDiff,previewMarkdown} from '../docs/.vitepress/theme/components/editor-model.mjs'
const wikis={game:{groups:[{id:'reference'}]}}
const fields={title:'测试维护',categories:['reference'],platform:'Switch 2',version:'未确认',spoiler:'无',verified:'2026-10-10',sources:['https://example.org/source'],aliases:['维护测试']}
const raw=writeFields('## 内容\n\n已验证的说明。',fields)
const validate=(changes={})=>validateDocument({raw,game:'game',path:'guides/test',wikis,pages:[],summary:'补充说明',...changes})
test('editor synchronizes metadata without deleting custom fields',()=>{
 const doc=writeFields('---\ncustom: preserve\ncategories:\n  - reference\n---\n# 旧标题\n\n正文',{title:'新标题',sources:fields.sources})
 assert.match(doc,/custom: preserve/);assert.match(doc,/# 新标题/)
 assert.deepEqual(readFields(doc).categories,['reference'])
 assert.deepEqual(readFields(raw).aliases,['维护测试'])
 assert.equal(readFields('---\ntitle: 123\nsources: [1]\n---\n# 标题').title,'标题')
})
test('editor validates scope, existing names, metadata and summaries',()=>{
 assert.deepEqual(validate(),[])
 for(const path of ['../outside','guides/../../data','entries/characters/cai','guides//test','guides/a.md','guides/a?x'])assert.equal(validPath(path),false)
 assert.ok(validate({pages:[{game:'game',path:'guides/test',title:'已有页'}]}).length)
 assert.ok(validate({pages:[{game:'game',path:'guides/other',title:'测试维护'}]}).length)
 assert.ok(validate({summary:''}).length)
 assert.ok(validate({raw:writeFields(raw,{...fields,verified:'2026-02-31',sources:['javascript:alert(1)']})}).length)
 assert.ok(validate({originalPath:'guides/original'}).length)
 assert.deepEqual(validate({originalPath:'guides/test',pages:[{game:'game',path:'guides/test',title:'测试维护'}]}),[])
})
test('drafts retain baseline and isolate games/targets even when storage fails',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}
 const key=draftKey('game','guides/test'),draft={raw,path:'guides/test',summary:'说明',baseSha:'old'}
 assert.ok(saveDraft(storage,key,draft));assert.equal(readDraft(storage,key).baseSha,'old')
 assert.equal(readDraft(storage,draftKey('other','guides/test')),null)
 assert.equal(readDraft(storage,draftKey('game','new')),null)
 assert.equal(saveDraft(null,key,draft),false);assert.equal(readDraft(null,key),null)
 storage.setItem(key,'{bad');assert.equal(readDraft(storage,key),null)
})
test('handoff points to GitHub and detects baseline changes',()=>{
 assert.equal(compareRevision('old','new'),'conflict')
 assert.equal(compareRevision(null,null),'clean')
 assert.match(githubTarget('game','guides/test',false),/new\/main\?filename=docs%2Fgames%2Fgame%2Fguides%2Ftest.md$/)
 assert.match(githubTarget('game','guides/test',true),/edit\/main\/docs\/games\/game\/guides\/test.md$/)
 assert.deepEqual(lineDiff('a\nb\nc','a\nB\nc'),[{type:'removed',text:'b'},{type:'added',text:'B'}])
})
test('preview escapes HTML and rejects executable links',()=>{
 const html=previewMarkdown('# 标题\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n~~~\n<img onerror=alert(1)>\n~~~')
 assert.match(html,/<h1>标题<\/h1>/);assert.match(html,/<table>/);assert.match(html,/&lt;script&gt;/)
 assert.doesNotMatch(html,/<script|<img|href="javascript:/)
})
