import test from 'node:test'
import assert from 'node:assert/strict'
import {validateSpace,spaceFile,pageFile} from '../services/collaboration/space-model.mjs'
import {allowedPath,validateSubmission} from '../services/collaboration/worker.mjs'
test('spaces and menus keep stable scoped IDs and bounded fields',()=>{const space={schemaVersion:1,id:'space-test',title:'新空间',description:'介绍',categories:[{id:'general',title:'文档'}]};assert.deepEqual(validateSpace(space),[]);assert.ok(validateSpace({...space,categories:[...space.categories,...space.categories]}).length);assert.ok(validateSpace({...space,id:'../bad'}).length);assert.equal(spaceFile(space.id),'docs/games/space-test/space.json');assert.ok(allowedPath(spaceFile(space.id)));assert.throws(()=>pageFile('space-test','../bad'));assert.doesNotThrow(()=>validateSubmission({path:spaceFile(space.id),content:JSON.stringify(space),summary:'创建空间',baseSha:null}));assert.equal(allowedPath('docs/data/wikis.json'),false)})
