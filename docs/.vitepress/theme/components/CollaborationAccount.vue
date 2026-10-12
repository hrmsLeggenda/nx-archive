<script setup>
import {ref,onMounted} from 'vue'
import {service,call,saveSession} from './collaboration-client.mjs'
const user=ref(null),items=ref([]),detail=ref(null),message=ref('')
async function refresh(){try{user.value=await call('/session');items.value=await call('/reviews')}catch(e){message.value=e.message}}
async function inspect(n){try{detail.value=await call('/reviews/'+n)}catch(e){message.value=e.message}}
async function logout(){try{await call('/logout');saveSession('');user.value=null;items.value=[];detail.value=null}catch(e){message.value=e.message}}
onMounted(()=>{const id=new URLSearchParams(location.hash.slice(1)).get('session');if(id){history.replaceState(null,'',location.pathname);if(!saveSession(id)){message.value='浏览器禁止会话存储，无法保留登录。';return}}if(service)refresh()})
</script>
<template><section><p v-if="!service">站内协作等待服务端配置。现有 Markdown 和勘误导出功能可继续使用。</p><template v-else><p v-if="user">已登录 {{user.login}} <button @click="logout">退出</button> <button @click="refresh">刷新状态</button></p><a v-else :href="service+'/auth/login'">登录 GitHub</a><p>登录仅允许具有仓库写入权限的账户。通过安装到 nx-archive 的 GitHub App 授权，服务端只操作此仓库。会话一小时后失效。</p><ul><li v-for="p in items" :key="p.number"><a :href="p.url">#{{p.number}} {{p.title}}</a> · {{p.state}} <button @click="inspect(p.number)">查看审阅与检查</button></li></ul><div v-if="detail"><p>状态：{{detail.state}} · 可合并：{{detail.mergeable===null?'计算中':detail.mergeable?'是':'否'}}</p><ul><li v-for="c in detail.checks" :key="c.name"><a :href="c.url">{{c.name}}</a>：{{c.conclusion||c.status}}</li></ul><p v-for="(r,i) in detail.reviews" :key="i">{{r.user}} · {{r.state}}：{{r.body}}</p><a :href="detail.url">在 GitHub 审阅或合并</a></div></template><p role="status">{{message}}</p></section></template>
