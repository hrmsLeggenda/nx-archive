import { defineConfig } from 'vitepress'
import { tokenize } from './search.mjs'
import wikis from '../data/wikis.json'
const groupNode=(game,wiki,group)=>({text:group.title,collapsed:true,items:[
 {text:'浏览分类',link:'/games/'+game+'/categories/'+group.id},
 ...group.items.map(item=>({text:item.title,link:'/games/'+game+'/'+item.path})),
 ...wiki.groups.filter(g=>g.parent===group.id).map(g=>groupNode(game,wiki,g))
]})
const sidebar=Object.fromEntries(Object.entries(wikis).map(([id,wiki])=>['/games/'+id+'/',[
 {text:wiki.title,link:'/games/'+id+'/'},
 {text:'全部页面',link:'/games/'+id+'/all-pages'},
 {text:'创建页面',link:'/games/'+id+'/edit'},
 ...wiki.groups.filter(g=>!g.parent).map(g=>groupNode(id,wiki,g))
]]))
export default defineConfig({
  lang: 'zh-CN', title: 'NX Archive', description: 'Switch / Switch 2 游戏攻略与地图档案',
  base: '/nx-archive/', lastUpdated: true,
  transformHead({head}) {
    // VitePress 1.6.4's appearance bootstrap reads localStorage without a guard.
    const script=head.find(([tag,attrs])=>tag==='script' && attrs?.id==='check-dark-mode')
    if(script && !script[2]?.startsWith('try {')) script[2]='try {'+script[2]+'} catch { if(window.matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.classList.add("dark") }'
  },
  themeConfig: {
    logo: '/logo.svg', siteTitle: 'NX Archive',
    nav: [{ text: '空间', link: '/' }, { text: '游戏档案', link: '/games/' }, { text: '贡献指南', link: '/contribute' }],
    sidebar: { ...sidebar, '/': [{ text: '站点导航', items: [{ text: '游戏板块', link: '/games/' }, { text: '贡献指南', link: '/contribute' }] }] },
    search: { provider: 'local', options: { miniSearch: { options: { tokenize }, searchOptions: { combineWith: 'AND', prefix: true, fuzzy: false } }, locales: { root: { translations: { button: { buttonText: '搜索攻略', buttonAriaLabel: '搜索攻略' }, modal: { noResultsText: '没有找到结果', resetButtonTitle: '清空', footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' } } } } } } },
    editLink: { pattern: 'https://github.com/hrmsLeggenda/nx-archive/edit/main/docs/:path', text: '在 GitHub 编辑此页' },
    outline: { label: '本页目录' }, lastUpdated: { text: '更新于' },
    footer: { message: '玩家维护的攻略档案 · 非 Nintendo 官方网站', copyright: '游戏名称及商标归各自权利人所有。' }
  }
})
