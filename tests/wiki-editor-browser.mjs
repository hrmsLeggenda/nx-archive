import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4176'],{stdio:'inherit'})
const browser=await chromium.launch()
const base='http://127.0.0.1:4176/nx-archive/'
const graph=JSON.parse(readFileSync('docs/games/fire-emblem-fw/data/generated/entities.json'))
let page
try{
 const context=await browser.newContext(),errors=[]
 page=await context.newPage()
 page.on('pageerror',e=>errors.push(e.message))
 for(let i=0;i<40;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
 let apiMode='missing'
 const source='docs/games/fire-emblem-fw/guides/contributing.md'
 const {createHash}=await import('node:crypto')
 const bytes=readFileSync(source),sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')
 await context.route('https://api.github.com/repos/hrmsLeggenda/nx-archive/contents/**',route=>{
  if(apiMode==='offline')return route.abort()
  return route.fulfill(apiMode==='missing'?{status:404,body:'{}',contentType:'application/json'}:{status:200,body:JSON.stringify({sha:apiMode==='clean'?sha:'changed'}),contentType:'application/json'})
 })
 await page.goto(base+'games/fire-emblem-fw/edit.html')
 assert.ok((await page.locator('#check-dark-mode').textContent()).length<1000,'appearance bootstrap must stay bounded across page builds')
 await page.getByLabel('页面路径',{exact:true}).fill('guides/editor-smoke')
 await page.getByLabel('页面标题',{exact:true}).fill('编辑器验收草稿')
 await page.getByLabel('资料来源',{exact:true}).fill('https://github.com/hrmsLeggenda/nx-archive')
 await page.getByLabel('编辑摘要',{exact:true}).fill('新增维护说明')
 await page.getByRole('tab',{name:'预览',exact:true}).click()
 await page.locator('.editor-preview h1').filter({hasText:'编辑器验收草稿'}).waitFor()
 assert.equal(await page.locator('.editor-validation li').count(),0)
 await page.getByRole('button',{name:'检查主线冲突',exact:true}).click()
 await page.getByRole('link',{name:'前往 GitHub 提交',exact:true}).waitFor()
 assert.match(await page.getByRole('link',{name:'前往 GitHub 提交',exact:true}).getAttribute('href'),/new\/main.*editor-smoke/)
 await page.waitForFunction(()=>Boolean(localStorage.getItem('nx-archive:editor:v1:fire-emblem-fw:new')))
 await page.reload()
 await page.getByRole('button',{name:'恢复草稿',exact:true}).click()
 assert.equal(await page.getByLabel('页面标题',{exact:true}).inputValue(),'编辑器验收草稿')
 // Duplicate paths stay blocked; unavailable checks offer explicit GitHub verification.
 await page.getByLabel('页面路径',{exact:true}).fill('guides/contributing')
 await page.locator('.editor-validation').getByText(/目标路径已存在/).waitFor()
 await page.getByLabel('页面路径',{exact:true}).fill('guides/editor-smoke')
 apiMode='offline'
 await page.getByRole('button',{name:'检查主线冲突',exact:true}).click()
 await page.getByText('将在 GitHub 核对最新文件和同路径页面后提交。',{exact:true}).waitFor()
 assert.equal(await page.getByRole('link',{name:'前往 GitHub 提交',exact:true}).count(),0)
 await page.getByRole('checkbox',{name:'将在 GitHub 核对最新文件和同路径页面后提交。',exact:true}).check()
 await page.getByRole('link',{name:'前往 GitHub 提交',exact:true}).waitFor()
 await page.goto(base+'games/zelda-totk/edit.html')
 assert.equal(await page.getByRole('button',{name:'恢复草稿',exact:true}).count(),0)
 // Published additions and edits appear in the automatic index.
 await page.goto(base+'games/fire-emblem-fw/all-pages.html')
 await page.getByLabel('筛选页面',{exact:true}).fill('万缕千丝页面创建')
 await page.locator('.page-directory a').filter({hasText:'万缕千丝 Wiki 页面维护'}).waitFor()
 await page.getByLabel('筛选页面',{exact:true}).fill('独立 notes')
 await page.locator('.page-directory a').filter({hasText:'资料来源与核对记录'}).waitFor()
 // Load a published page, edit, compare, and check both changed and unchanged SHA.
 await page.evaluate(raw=>localStorage.setItem('nx-archive:editor:v1:fire-emblem-fw:guides/contributing',JSON.stringify({schema:1,raw,path:'guides/contributing',summary:'旧版草稿',baseSha:'outdated',template:'guide',savedAt:'2026-10-09'})),bytes.toString('utf8'))
 await page.goto(base+'games/fire-emblem-fw/guides/contributing.html')
 await page.getByRole('link',{name:'编辑页面',exact:true}).click()
 await page.getByRole('button',{name:'恢复草稿',exact:true}).click()
 await page.getByText('本地草稿基于旧版本。请先查看差异，并与 GitHub 最新文件合并。',{exact:true}).waitFor()
 await page.getByRole('button',{name:'已核对并合并草稿',exact:true}).click()
 await page.getByLabel('页面标题',{exact:true}).waitFor()
 assert.equal(await page.getByLabel('页面标题',{exact:true}).inputValue(),'万缕千丝 Wiki 页面维护')
 assert.ok(await page.getByLabel('页面路径',{exact:true}).getAttribute('readonly')!==null)
 const body=page.getByLabel('Markdown 正文',{exact:true})
 await body.fill((await body.inputValue())+'\n## 浏览器验收\n\n维护步骤已核对。\n')
 await page.getByLabel('编辑摘要',{exact:true}).fill('补充步骤')
 await page.getByRole('tab',{name:'差异',exact:true}).click()
 await page.locator('.editor-diff').getByText(/维护步骤已核对/).waitFor()
 apiMode='conflict'
 await page.getByRole('button',{name:'检查主线冲突',exact:true}).click()
 await page.locator('.editor-check-status').getByText(/主线文件已变化/).waitFor()
 assert.equal(await page.getByRole('link',{name:'前往 GitHub 提交',exact:true}).count(),0)
 apiMode='clean'
 await page.getByRole('button',{name:'检查主线冲突',exact:true}).click()
 await page.getByRole('link',{name:'前往 GitHub 提交',exact:true}).waitFor()
 assert.match(await page.getByRole('link',{name:'前往 GitHub 提交',exact:true}).getAttribute('href'),/edit\/main\/docs\/games\/fire-emblem-fw\/guides\/contributing.md$/)
 // Import is a recovery operation; raw HTML remains text.
 await page.getByLabel('导入 Markdown',{exact:true}).setInputFiles({name:'old.md',mimeType:'text/plain',buffer:Buffer.from((await body.inputValue())+'\n<script>window.editorInjected=1</script>\n')})
 await page.getByRole('tab',{name:'预览',exact:true}).click()
 assert.equal(await page.locator('.editor-preview script').count(),0)
 assert.equal(await page.evaluate(()=>window.editorInjected),undefined)
 // A generated entity has a protected standalone note and survives rebuilds.
 const place=graph.entities.find(e=>e.id==='place-dragon-forest')
 await page.goto(base+place.url.slice(1)+'.html')
 await page.getByRole('link',{name:'查看人工补充与勘误',exact:true}).waitFor()
 await page.getByRole('link',{name:'补充或勘误',exact:true}).click()
 await page.getByLabel('页面路径',{exact:true}).waitFor()
 assert.equal(await page.getByLabel('页面路径',{exact:true}).inputValue(),'notes/place-dragon-forest')
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:'wiki-editor-mobile.png',fullPage:true})
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))
 // Denied browser storage is recoverable and must not throw.
 const denied=await browser.newContext()
 await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('storage denied')}}))
 const blocked=await denied.newPage();blocked.on('pageerror',e=>errors.push(e.message))
 await blocked.goto(base+'games/fire-emblem-fw/edit.html')
 await blocked.getByLabel('页面标题',{exact:true}).fill('存储失败验收')
 await blocked.getByText('草稿保存失败，请复制或下载 Markdown。',{exact:true}).waitFor()
 await denied.close()
 assert.deepEqual(errors,[])
 console.log('Wiki editor browser checks passed: creation, editing, drafts, import, conflicts, handoff, notes, storage and mobile')
}catch(error){
 if(page){console.error('Editor failure URL:',page.url());await page.screenshot({path:'wiki-editor-mobile.png',fullPage:true}).catch(()=>{})}
 throw error
}finally{await browser.close();server.kill()}
