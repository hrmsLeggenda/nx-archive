import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import assert from 'node:assert/strict'
const server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4179'],{stdio:'inherit'}),browser=await chromium.launch(),base='http://127.0.0.1:4179/nx-archive/'
try{
 for(let i=0;i<40;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)})
 await page.goto(base);assert.equal(await page.locator('.space-cards > button').count(),4)
 await page.getByRole('button',{name:'创建新空间',exact:true}).click();await page.getByLabel('空间名称').fill('测试草稿空间');await page.getByRole('button',{name:'创建并保存',exact:true}).click();await page.getByText('在线保存尚未启用：需先配置协作服务。内容已保留为本地草稿，不会更新公开网站。',{exact:true}).waitFor();assert.equal(await page.locator('.space-cards > button').count(),4)
 await page.locator('.space-cards > button').filter({hasText:'火焰纹章'}).click();assert.match(page.url(),/space=fire-emblem-fw/)
 await page.getByRole('button',{name:'管理分类菜单',exact:true}).click();const menuCount=await page.locator('input[aria-label^="分类名称 "]').count();await page.getByRole('button',{name:'添加分类',exact:true}).click();await page.waitForFunction(n=>document.querySelectorAll('input[aria-label^="分类名称 "]').length===n+1,menuCount);await page.locator('input[aria-label^="分类名称 "]').last().fill('自定义攻略');await page.getByRole('button',{name:'保存分类菜单',exact:true}).click();await page.getByText(/在线保存尚未启用/).waitFor();await page.getByRole('button',{name:'取消',exact:true}).click()
 await page.getByRole('button',{name:'在入门与养成下新建页面',exact:true}).click();await page.getByLabel('文档标题').fill('新文档测试');await page.locator('.toastui-editor-ww-container [contenteditable="true"]').fill('这是一篇草稿正文。');await page.getByRole('button',{name:'保存页面',exact:true}).click();await page.getByText(/在线保存尚未启用/).waitFor();assert.ok((await page.getByLabel('文档标题').inputValue()).includes('新文档测试'))
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'spaces-mobile.png',fullPage:true});console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('*')).filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,10).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right}))));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));await page.screenshot({path:'spaces-mobile.png',fullPage:true})
 await page.goto(base+'workspace.html?space=fire-emblem-fw&page=guides/classes');await page.setViewportSize({width:1440,height:1000});await page.locator('.document-body .toastui-editor-contents').waitFor()
 assert.ok(await page.locator('.document-body').evaluate(el=>el.getBoundingClientRect().width>850),'desktop document must occupy a wide canvas')
 await page.getByRole('button',{name:'切换侧边菜单',exact:true}).click();assert.ok(await page.locator('.workspace-content').evaluate(el=>el.getBoundingClientRect().width>1350))
 await page.getByRole('button',{name:'切换侧边菜单',exact:true}).click()
 await page.screenshot({path:'wiki-desktop-reading.png',fullPage:true})
 await page.getByRole('button',{name:'编辑页面',exact:true}).click();await page.getByLabel('文档标题').waitFor();assert.ok(await page.getByLabel('文档标题').inputValue())
 await page.locator('.toastui-editor-ww-container [contenteditable="true"]').waitFor()
 await page.getByRole('button',{name:'Markdown 源码',exact:true}).click();await page.getByLabel('特殊页面正文').fill('## 测试标题\n\n测试正文')
 await page.getByRole('button',{name:'文档编辑',exact:true}).click();await page.locator('.toastui-editor-ww-container [contenteditable="true"]').waitFor()
 assert.match(await page.locator('.toastui-editor-ww-container').innerText(),/测试标题/)
 await page.screenshot({path:'wiki-desktop-editing.png',fullPage:true})
 assert.deepEqual(errors,[]);console.log('Spaces portal, menus, document editing and disabled-service behavior passed')
}finally{await browser.close();server.kill('SIGTERM')}
