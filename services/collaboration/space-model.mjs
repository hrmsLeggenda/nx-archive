export const validId=id=>typeof id==='string'&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)
export function validateSpace(space){
 const errors=[]
 if(!space||space.schemaVersion!==1||!validId(space.id)||typeof space.title!=='string'||!space.title.trim()||space.title.length>100)errors.push('空间名称或标识无效。')
 if(typeof space?.description!=='string'||space.description.length>1000)errors.push('空间介绍过长。')
 if(!Array.isArray(space?.categories)||space.categories.length>50)errors.push('分类菜单无效。')
 else{const ids=new Set();for(const c of space.categories){if(!validId(c.id)||ids.has(c.id)||typeof c.title!=='string'||!c.title.trim()||c.title.length>80)errors.push('分类名称无效或重复。');ids.add(c.id)}}
 return errors
}
export function spaceFile(id){if(!validId(id))throw new Error('无效空间');return 'docs/games/'+id+'/space.json'}
export function pageFile(space,id){if(!validId(space)||!validId(id))throw new Error('无效页面');return 'docs/games/'+space+'/guides/'+id+'.md'}
