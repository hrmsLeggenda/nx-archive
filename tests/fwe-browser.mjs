import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import assert from 'node:assert/strict'
const server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4173'],{stdio:'inherit'})
const browser=await chromium.launch()
try {
 const page=await browser.newPage()
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 const base='http://127.0.0.1:4173/nx-archive/games/fire-emblem-fw/'
 let ready=false
 for(let i=0;i<40;i++){try{const r=await fetch(base);if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,250))}
 assert.ok(ready,'Preview server starts')
 await page.goto(base+'database.html')
 await page.getByLabel('资料类型').selectOption('classes')
 await page.getByLabel('职业层级').selectOption('Beginner')
 assert.ok(await page.locator('tbody tr').count()>0)
 await page.getByLabel('搜索',{exact:true}).fill('does-not-exist-1234')
 assert.equal(await page.locator('table').first().locator('tbody tr').count(),0)
 await page.getByLabel('搜索',{exact:true}).fill('')
 await page.getByLabel('人物',{exact:true}).selectOption('Cai')
 await page.getByLabel('升级次数').fill('10')
 assert.ok(await page.locator('table').last().locator('tbody tr').count()===9)
 await page.goto(base+'resources.html')
 assert.ok(await page.getByText('ラッキーコイン',{exact:true}).count()>0)
 await page.getByLabel('阶段',{exact:true}).selectOption('part3')
 assert.equal(await page.getByText('ラッキーコイン',{exact:true}).count(),0)
 assert.ok(await page.getByText('天使の衣',{exact:true}).count()>0)
 await page.goto(base+'maps/world.html')
 await page.getByRole('button',{name:/龙骨之森/}).click()
 await page.getByRole('button',{name:'标记完成',exact:true}).click()
 await page.reload()
 await page.getByRole('button',{name:/龙骨之森/}).click()
 assert.ok(await page.getByRole('button',{name:'取消完成',exact:true}).isVisible())
 await page.getByLabel('阶段',{exact:true}).selectOption('part3')
 await page.getByRole('button',{name:/龙骨之森/}).click()
 assert.ok(await page.getByRole('button',{name:'标记完成',exact:true}).isVisible())
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:'fwe-mobile.png',fullPage:true})
 await page.goto(base+'timeline.html')
 await page.getByLabel('路线',{exact:true}).selectOption('Cai')
 assert.equal(await page.getByText('第五章：夜间怪物（暂译）',{exact:true}).count(),0)
 assert.deepEqual(errors,[])
 console.log('FWE browser checks passed: filters, growth controls, phase resources, progress isolation, mobile render, hydration.')
} catch(error) { console.error(error); throw error } finally {await browser.close();server.kill()}
