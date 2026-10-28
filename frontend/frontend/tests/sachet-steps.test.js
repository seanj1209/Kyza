import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
const cache=new Map()
function load(file){
  file=resolve(file);if(cache.has(file))return cache.get(file)
  const exports={};cache.set(file,exports)
  runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>load(resolve(dirname(file),name)+'.ts')})
  return exports
}
const s=load('packages/cutter-engine/actions/sachetSteps.ts'),copy=v=>JSON.parse(JSON.stringify(v))
const bbe={id:'bbe',kind:'bbe',x:10,y:20,width:10,height:8}
const base={width:50,height:100,seal:3,sealClearance:2,attributeBoxes:[],sachet:{stepCount:2,stepPair:true,stepEnabled:true}}
for(const [requested,expected] of [[1,2],[2,2],[3,4],[4,4],[5,6],[7,8]])assert.equal(s.sachetStepCount(base,requested),expected)
let spec=s.initialiseSachetSteps(base)
spec={...spec,attributeBoxes:[bbe]}
spec=s.setSachetStepCount(spec,6)
assert.equal(s.sachetStepIds(spec).join(','),'3A,2A,1A,1B,2B,3B')
for(const id of ['1A','2A','3A'])assert.equal(s.getSachetStepSpec(spec,id).attributeBoxes.length,1)
for(const id of ['1B','2B','3B'])assert.equal(s.getSachetStepSpec(spec,id).attributeBoxes.length,0,'A must never mirror to B')
spec=s.activateSachetStep(copy(spec),'3B')
assert.equal(s.sachetActiveId(spec),'1B','Linked copies open their matching source')
spec={...spec,attributeBoxes:[{...bbe,id:'back',x:20}]}
assert.equal(s.getSachetStepSpec(spec,'2B').attributeBoxes[0].x,20)
assert.equal(s.getSachetStepSpec(spec,'2A').attributeBoxes[0].x,10)
spec=s.setSachetSync(spec,false)
spec=s.activateSachetStep(copy(spec),'2B')
spec={...spec,attributeBoxes:[{...bbe,id:'back',x:25}]}
assert.equal(s.getSachetStepSpec(spec,'2B').attributeBoxes[0].x,25)
assert.equal(s.getSachetStepSpec(spec,'1B').attributeBoxes[0].x,20)
assert.equal(s.getSachetStepSpec(spec,'3B').attributeBoxes[0].x,20)
spec=s.activateSachetStep(copy(spec),'1A');spec=s.activateSachetStep(copy(spec),'2B')
assert.equal(spec.attributeBoxes[0].x,25,'JSON switching retains face data')
spec=s.setSachetStepCount(spec,8)
assert.equal(s.getSachetStepSpec(spec,'2B').attributeBoxes[0].x,25,'Count growth preserves stable IDs')
assert.equal(s.getSachetStepSpec(spec,'4B').attributeBoxes[0].x,20,'New face seeds from its matching source')
spec=s.setSachetStepCount(spec,2)
assert.equal(s.sachetActiveId(spec),'1B')
spec=s.setSachetSync(spec,true)
spec={...spec,attributeBoxes:[]}
spec=s.setSachetStepCount(spec,6)
spec=s.setSachetSync(spec,false)
assert.equal(s.getSachetStepSpec(spec,'2B').attributeBoxes.length,0,'Unlink freezes visible state, not stale snapshots')
const preset=s.initialiseSachetSteps({...base,attributeBoxes:[{...bbe,laneSide:'B'}]})
assert.equal(preset.attributeBoxes.length,0)
assert.equal(s.getSachetStepSpec(preset,'1B').attributeBoxes.length,1)
let moving=s.setSachetStepCount(s.initialiseSachetSteps({...base,attributeBoxes:[bbe]}),6)
let moved=s.commitSachetStepEdit(moving,moving,{id:'attribute-box:bbe',dx:50,dy:0})
for(const id of ['1A','2A','3A'])assert.equal(s.getSachetStepSpec(moved,id).attributeBoxes.length,0,'Transfer removes A series')
for(const id of ['1B','2B','3B'])assert.equal(s.getSachetStepSpec(moved,id).attributeBoxes.length,1,'Transfer moves to B series')
moved=s.commitSachetStepEdit(moving,moving,{id:'attribute-box:bbe',dx:-50,dy:0})
assert.equal(moved.attributeBoxes.length,1,'Same-face transfer does not duplicate')
const three={...base,sachet:{stepEnabled:true,stepCount:1,stepPair:false}}
for(const count of [1,2,3,4])assert.equal(s.sachetStepCount(three,count),count)
const threeStepped=s.setSachetStepCount(s.initialiseSachetSteps({...three,attributeBoxes:[bbe]}),3)
assert.equal(s.sachetStepIds(threeStepped).join(','),'1,2,3')
assert.equal(s.getSachetStepSpec(threeStepped,'3').attributeBoxes.length,1)
const controls=readFileSync('apps/web/src/ui/controls.ts','utf8')
assert(!controls.includes('createSelect("Edit Step"'))
assert(controls.includes('input.step=is4Side?"2":"1"'))
console.log('Sachet stepping: pair counts, face ownership, sync, independent edits, transfers, persistence and 3SS passed.')
