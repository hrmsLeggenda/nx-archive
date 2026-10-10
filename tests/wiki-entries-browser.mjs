import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import assert from 'node:assert/strict'
const server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4175'],{stdio:'inherit'})
const browser=await chromium.launch()
try{
 const page=await browser.newPage(),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 const base='http://127.0.0.1:4175/nx-archive/games/fire-emblem-fw/'
 for(let i=0;i<40;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
 await page.goto(base+'categories/characters.html')
 assert.equal(await page.locator('.page-directory li').count(),62)
 await page.getByLabel('筛选页面',{exact:true}).fill('Cai')
 await page.locator('.page-directory a').filter({hasText:'凯伊'}).click()
 assert.ok(await page.getByRole('heading',{name:'凯伊',exact:true}).isVisible())
 assert.ok(await page.getByRole('heading',{name:'基础成长率',exact:true}).isVisible())
 assert.equal(await page.locator('.page-actions a').filter({hasText:'在 GitHub 编辑'}).count(),0)
 await page.goto(base)
 await page.getByLabel('搜索本游戏 Wiki',{exact:true}).fill('Dietrich')
 assert.ok(await page.locator('.wiki-search a').filter({hasText:'迪托利希'}).count()>0)
 await page.goto(base+'resources.html?location=dragon-forest')
 await page.waitForFunction(()=>document.body.textContent.includes('当前地点：'))
 assert.equal(await page.locator('tbody tr').count(),7)
 await page.getByRole('link',{name:'ラッキーコイン',exact:true}).first().click()
 assert.ok(await page.getByRole('heading',{name:'已录入获取途径',exact:true}).isVisible())
 await page.getByRole('link',{name:'龙骨之森（暂译）',exact:true}).first().click()
 assert.ok(await page.getByRole('heading',{name:'第三部·救世篇',exact:true}).isVisible())
 await page.getByRole('link',{name:'在阶段地图中查看',exact:true}).click()
 await page.waitForFunction(()=>document.body.textContent.includes('当前地点：'))
 assert.equal(await page.locator('.marker-list li').count(),1)
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:'wiki-entries-mobile.png',fullPage:true})
 assert.deepEqual(errors,[])
 console.log('Entity browser checks passed: aliases, 62 character pages, Wiki search, item/place backlinks and focused map')
}finally{await browser.close();server.kill()}
