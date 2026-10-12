import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import wikis from '../../../data/wikis.json'
import {validateSpace} from '../../../../services/collaboration/space-model.mjs'
export default {
 watch:['../../../games/*/space.json'],
 load(){
  const root=path.resolve('docs/games'),spaces=Object.entries(wikis).map(([id,w]:any)=>({id,title:w.title,description:w.subtitle||'',schemaVersion:1,categories:w.groups.map(g=>({id:g.id,title:g.title})),sha:null}))
  for(const id of fs.readdirSync(root)){
   const file=path.join(root,id,'space.json');if(!fs.existsSync(file))continue
   const record=JSON.parse(fs.readFileSync(file,'utf8'));if(record.id!==id||validateSpace(record).length)throw new Error('无效空间配置：'+id)
   const sha=execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim(),i=spaces.findIndex(s=>s.id===id)
   const value={...record,sha};if(i<0)spaces.push(value);else spaces[i]=value
  }
  return spaces
 }
}
