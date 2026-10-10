import test from 'node:test'
import assert from 'node:assert/strict'
import {initialDraft,buildPatch,correctionState,loadCorrectionDraft,storeCorrectionDraft} from '../docs/.vitepress/theme/components/structured-model.mjs'
const baseline={nameZh:null,aliases:[],'growths.HP':40}
const record={dataset:'characters',id:'characters-100',baseline,effective:baseline,baselineHash:'one',patch:null}
const complete=()=>{
 const d=initialDraft(record);d.active=['growths.HP'];d.values['growths.HP']='55';d.sources='https://example.org/fixture';d.checked='2026-10-10';d.reason='测试夹具';return d
}
test('structured patches keep stable IDs, distinguish null and zero and validate evidence',()=>{
 const d=complete();assert.equal(buildPatch(record,d).patch.changes[0].baseValue,40)
 d.values['growths.HP']='0';assert.equal(buildPatch(record,d).patch.changes[0].value,0)
 d.values['growths.HP']='';assert.equal(buildPatch(record,d).patch.changes[0].value,null)
 d.values['growths.HP']='1.5';assert.ok(buildPatch(record,d).errors.length)
 d.active=['name'];assert.ok(buildPatch(record,d).errors.length)
 d.active=['__proto__'];assert.ok(buildPatch(record,d).errors.length)
})
test('rebase is explicit and unchanged imported corrections keep their recorded baseline',()=>{
 const d=complete(),patch=buildPatch(record,d).patch
 const updated={...record,baseline:{...baseline,'growths.HP':45},effective:{...baseline,'growths.HP':55},patch}
 const draft=initialDraft(updated)
 assert.equal(buildPatch(updated,draft).patch.changes[0].baseValue,40)
 draft.rebase=true;assert.equal(buildPatch(updated,draft).patch.changes[0].baseValue,45)
 assert.equal(correctionState(45,patch.changes[0]),'needs-review')
 assert.equal(correctionState(55,patch.changes[0]),'matches-upstream')
})
test('invalid dates, sources and phase relationships are blocked',()=>{
 const d=complete();d.checked='2026-02-31';assert.ok(buildPatch(record,d).errors.length)
 d.checked='2026-10-10';d.sources='javascript:x';assert.ok(buildPatch(record,d).errors.length)
 const r={dataset:'resources',id:'r',baseline:{phase:'part1',routes:['Cai'],method:'chest',certainty:'fixed',quantity:1},effective:{},patch:null}
 const rd={...complete(),active:['phase'],values:{phase:'part3'}}
 assert.ok(buildPatch(r,rd).errors.length)
})
test('draft storage failures remain recoverable',()=>{
 assert.equal(storeCorrectionDraft(null,'key',complete()),false)
 assert.equal(loadCorrectionDraft(null,'key'),null)
})
