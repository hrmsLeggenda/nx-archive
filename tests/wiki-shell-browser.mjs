import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import assert from 'node:assert/strict'
const server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4174'],{stdio:'inherit'})
const browser=await chromium.launch()
try{
 const page=await browser.newPage(),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 const base='http://127.0.0.1:4174/nx-archive/'
 for(let i=0;i<40;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
 await page.goto(base)
 assert.equal(await page.locator('.space-cards > button').count(),4)
 await page.goto(base+'games/fire-emblem-fw/categories/training.html')
 await page.getByLabel('筛选页面',{exact:true}).fill('职业')
 assert.ok(await page.locator('.page-directory li').count()>0)
 assert.equal(await page.locator('.page-directory a[href*="zelda-totk"]').count(),0)
 await page.goto(base+'games/zelda-totk/')
 assert.equal(await page.locator('.wiki-navigation a[href*="fire-emblem-fw"]').count(),0)
 await page.setViewportSize({width:390,height:844})
 await page.goto(base+'games/fire-emblem-fw/guides/classes.html')
 await page.locator('.wiki-navigation summary').click()
 assert.ok(await page.getByRole('navigation',{name:'游戏 Wiki 导航',exact:true}).getByRole('link',{name:'全部页面',exact:true}).isVisible())
 await page.screenshot({path:'wiki-shell-mobile.png',fullPage:true})
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))
 assert.deepEqual(errors,[])
 console.log('Wiki shell browser checks passed')
}finally{await browser.close();server.kill()}
