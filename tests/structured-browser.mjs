import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const catalog=JSON.parse(readFileSync('docs/games/fire-emblem-fw/data/generated/corrections.json'))
const cai=catalog.records.find(r=>r.dataset==='characters'&&r.label==='Cai')
const server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4177'],{stdio:'inherit'})
const browser=await chromium.launch()
const base='http://127.0.0.1:4177/nx-archive/games/fire-emblem-fw/'
let page
try{
 const context=await browser.newContext(),errors=[]
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
 let mode='clean'
 await context.route('https://api.github.com/repos/hrmsLeggenda/nx-archive/contents/**',route=>mode==='offline'?route.abort():route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({sha:mode==='clean'?cai.sha:'changed'})}))
 for(let i=0;i<40;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
 await page.goto(base+'entries/characters/'+cai.id+'.html')
 await page.getByRole('heading',{name:/^人工勘误记录/}).waitFor()
 await page.getByRole('link',{name:'编辑结构化数据',exact:true}).click()
 await page.getByLabel('记录',{exact:true}).waitFor()
 assert.equal(await page.getByLabel('记录',{exact:true}).inputValue(),cai.id)
 assert.equal(await page.getByLabel('中文名称',{exact:true}).inputValue(),'凯伊')
 await page.getByRole('tab',{name:'来源与勘误',exact:true}).click()
 await page.getByRole('heading',{name:'中文名称 · 已应用',exact:true}).waitFor()
 await page.getByRole('tab',{name:'字段编辑',exact:true}).click()
 await page.getByRole('checkbox',{name:'覆盖 生命成长率%',exact:true}).check()
 await page.getByLabel('生命成长率%',{exact:true}).fill('55')
 await page.getByLabel('勘误原因',{exact:true}).fill('浏览器测试提议，不能作为游戏事实发布')
 await page.getByRole('tab',{name:'JSON 与差异',exact:true}).click()
 const patch=JSON.parse(await page.locator('.structured-json').textContent())
 assert.equal(patch.recordId,cai.id)
 assert.equal(patch.changes.find(c=>c.field==='growths.HP').value,55)
 assert.equal(patch.changes.find(c=>c.field==='growths.HP').baseValue,cai.baseline['growths.HP'])
 assert.equal(await page.locator('.editor-validation li').count(),0)
 await page.getByRole('button',{name:'检查勘误文件冲突',exact:true}).click()
 await page.getByRole('link',{name:'前往 GitHub 提交勘误',exact:true}).waitFor()
 assert.match(await page.getByRole('link',{name:'前往 GitHub 提交勘误',exact:true}).getAttribute('href'),new RegExp('edit/main/'+cai.file))
 mode='conflict'
 await page.getByRole('button',{name:'检查勘误文件冲突',exact:true}).click()
 await page.locator('.structured-status').getByText(/主线勘误文件已变化/).waitFor()
 assert.equal(await page.getByRole('link',{name:'前往 GitHub 提交勘误',exact:true}).count(),0)
 mode='offline'
 await page.getByRole('button',{name:'检查勘误文件冲突',exact:true}).click()
 await page.getByRole('checkbox',{name:'将在 GitHub 核对勘误文件后提交。',exact:true}).waitFor()
 await page.waitForFunction(id=>Boolean(localStorage.getItem('nx-archive:structured:v1:fire-emblem-fw:characters:'+id)),cai.id)
 await page.reload()
 await page.getByRole('button',{name:'恢复勘误草稿',exact:true}).click()
 assert.equal(await page.getByLabel('生命成长率%',{exact:true}).inputValue(),'55')
 await page.getByLabel('生命成长率%',{exact:true}).fill('301')
 await page.locator('.editor-validation').getByText(/生命成长率%格式或范围不正确/).waitFor()
 await page.getByLabel('生命成长率%',{exact:true}).fill('')
 await page.getByRole('tab',{name:'JSON 与差异',exact:true}).click()
 assert.equal(JSON.parse(await page.locator('.structured-json').textContent()).changes.find(c=>c.field==='growths.HP').value,null)
 await page.getByRole('tab',{name:'字段编辑',exact:true}).click()
 await page.getByLabel('生命成长率%',{exact:true}).fill('0')
 await page.getByRole('tab',{name:'JSON 与差异',exact:true}).click()
 assert.equal(JSON.parse(await page.locator('.structured-json').textContent()).changes.find(c=>c.field==='growths.HP').value,0)
 await page.getByRole('tab',{name:'字段编辑',exact:true}).click()
 await page.getByRole('checkbox',{name:'覆盖 生命成长率%',exact:true}).uncheck()
 assert.equal(await page.getByLabel('生命成长率%',{exact:true}).count(),0)
 // Removing all overrides reverts to upstream; source and reason remain recorded.
 await page.getByRole('checkbox',{name:'覆盖 中文名称',exact:true}).uncheck()
 await page.getByRole('tab',{name:'JSON 与差异',exact:true}).click()
 assert.deepEqual(JSON.parse(await page.locator('.structured-json').textContent()).changes,[])
 await page.waitForFunction(id=>JSON.parse(localStorage.getItem('nx-archive:structured:v1:fire-emblem-fw:characters:'+id))?.draft.active.length===0,cai.id)
 // A stale baseline draft requires explicit re-review.
 await page.evaluate(id=>{
  const key='nx-archive:structured:v1:fire-emblem-fw:characters:'+id
  const saved=JSON.parse(localStorage.getItem(key));saved.draft.baselineHash='old-fixture';localStorage.setItem(key,JSON.stringify(saved))
 },cai.id)
 await page.reload();await page.getByRole('button',{name:'恢复勘误草稿',exact:true}).click()
 await page.getByRole('button',{name:'按当前基线复核',exact:true}).waitFor()
 await page.getByRole('button',{name:'按当前基线复核',exact:true}).click()
 // Resource stage and route consistency is enforced in the editor.
 await page.getByLabel('数据集',{exact:true}).selectOption('resources')
 await page.getByRole('checkbox',{name:'覆盖 阶段',exact:true}).check()
 await page.getByLabel('阶段',{exact:true}).selectOption('part3')
 await page.getByLabel('勘误来源',{exact:true}).fill('https://example.org/test-fixture')
 await page.getByLabel('勘误原因',{exact:true}).fill('仅供测试')
 await page.locator('.editor-validation').getByText(/阶段与适用路线不一致/).waitFor()
 await page.getByLabel('数据集',{exact:true}).selectOption('timeline')
 assert.equal(await page.getByRole('button',{name:'恢复勘误草稿',exact:true}).count(),0)
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:'structured-mobile.png',fullPage:true})
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))
 // A translated class label must keep its immutable simulator value.
 await page.goto(base+'database.html')
 const job=page.getByLabel('职业',{exact:true}),original=await job.inputValue()
 await job.evaluate(select=>{select.selectedOptions[0].textContent='职业中文显示测试夹具'})
 await job.selectOption({label:'职业中文显示测试夹具'})
 assert.equal(await job.inputValue(),original)
 assert.equal(await page.locator('table').last().locator('tbody tr').count(),9)
 const denied=await browser.newContext()
 await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('storage denied')}}))
 const blocked=await denied.newPage();blocked.on('pageerror',e=>errors.push(e.message))
 await blocked.goto(base+'data-editor.html?dataset=characters&record='+cai.id)
 await blocked.getByLabel('勘误原因',{exact:true}).fill('浏览器存储失败验收')
 await blocked.getByText('存储不可用，请复制或下载 JSON。',{exact:true}).waitFor()
 await denied.close()
 assert.deepEqual(errors,[])
 console.log('Structured browser checks passed: fields, provenance, draft recovery, null/zero, conflicts, revert, stale baseline, scope and mobile')
}catch(error){if(page){console.error('Structured failure:',page.url());await page.screenshot({path:'structured-mobile.png',fullPage:true})}throw error}
finally{await browser.close();server.kill()}
