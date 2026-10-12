import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const server=spawn('npm',['run','preview','--','--host','127.0.0.1','--port','4178'],{stdio:'inherit'}),browser=await chromium.launch(),base='http://127.0.0.1:4178/nx-archive/'
try{
 for(let i=0;i<40;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 let conflict=false,submitted,revision=0
 await page.route('https://collaboration.example/**',async route=>{
  const request=route.request(),url=new URL(request.url()),headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Content-Type'}
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers})
  let body,status=200
  if(url.pathname==='/session')body={login:'test',expires:Date.now()+60000}
  else if(url.pathname==='/reviews')body=[]
  else if(url.pathname==='/submit'){submitted=request.postDataJSON();status=conflict?409:201;body=conflict?{error:'主线已更新',currentSha:'a'.repeat(40),content:Buffer.from('# latest').toString('base64')}:{number:9,url:'https://github.com/hrmsLeggenda/nx-archive/pull/9'}}
  else if(url.pathname==='/draft'){if(request.method()==='POST')revision++;body={revision,content:'',savedAt:'today'}}
  else if(url.pathname==='/history')body=[{sha:'b'.repeat(40),message:'previous',date:'2026-10-01'}]
  else if(url.pathname==='/revision')body={content:Buffer.from(readFileSync('docs/games/fire-emblem-fw/guides/contributing.md','utf8')).toString('base64')}
  return route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)})
 })
 await page.goto(base+'collaboration.html#session=test-session');await page.getByText('已登录 test').waitFor();assert.equal(new URL(page.url()).hash,'')
 await page.goto(base+'games/fire-emblem-fw/edit.html?page=guides/contributing');await page.getByLabel('编辑摘要',{exact:true}).fill('修正文档')
 await page.getByRole('button',{name:'保存并发布',exact:true}).click();await page.getByRole('link',{name:'PR #9',exact:true}).waitFor();assert.match(submitted.path,/guides\/contributing.md$/);assert.ok(submitted.baseSha)
 await page.getByRole('button',{name:'读取云端草稿'}).click();await page.getByRole('button',{name:'保存云端草稿'}).click();await page.getByText('云端草稿已保存。',{exact:true}).waitFor()
 conflict=true;await page.getByRole('button',{name:'保存并发布',exact:true}).click();await page.getByText('主线最新内容（保留当前草稿）').click();await page.getByRole('button',{name:'确认合并并采用新基线'}).click();conflict=false;await page.getByRole('button',{name:'保存并发布',exact:true}).click();await page.getByRole('link',{name:'PR #9',exact:true}).waitFor();assert.equal(submitted.baseSha,'a'.repeat(40))
 await page.getByRole('button',{name:'读取版本历史'}).click();await page.getByRole('button',{name:'2026-10-01 previous'}).click();await page.getByRole('button',{name:'载入旧版为草稿（提交后生成新版本）'}).click()
 await page.goto(base)
 await page.getByRole('button',{name:'创建新空间',exact:true}).click()
 await page.getByLabel('空间名称').fill('集成验收空间')
 await page.getByRole('button',{name:'创建并保存',exact:true}).click()
 await page.getByText('空间正在发布，请部署完成后刷新首页。',{exact:true}).waitFor()
 assert.match(submitted.path,/^docs\/games\/space-[a-f0-9-]+\/space.json$/)
 assert.equal(JSON.parse(submitted.content).title,'集成验收空间')
 assert.equal(errors.length,0);console.log('Collaboration mock UI passed; live OAuth is not verified.')
}finally{await browser.close();server.kill('SIGTERM')}
