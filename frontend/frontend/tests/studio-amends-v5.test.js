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
const steps=load('packages/cutter-engine/actions/paperStripSteps.ts')
const validation=load('apps/web/src/constraints/paperStrip.ts')
const flow=load('apps/web/src/constraints/flowwrap.ts')
const normalize=load('apps/web/src/core/model/paperStripNormalization.ts')
const root='apps/web/src/',copy=v=>JSON.parse(JSON.stringify(v))
const bbe={id:'bbe',kind:'bbe',x:30,y:20,width:25,height:15,selected:true}
const base={width:310,height:260,seal:10,sealClearance:5,substrate:'paper',attributeBoxes:[bbe],paperStrip:{stepping:{stepCount:3,gap:0},clearStripWindow:{stripCount:0,stripWidth:50,positionX:0}}}
assert.equal(steps.paperStripActiveStep(base),0)
assert.equal(steps.activatePaperStripStep(base,2),base,'A only edits the first cutter')
let edited={...base,attributeBoxes:[{...bbe,x:50}]}
for(const index of [0,1,2])assert.equal(steps.getPaperStripStepSpec(edited,index).attributeBoxes[0].x,50,'A mirrors positions')
assert.equal(steps.getPaperStripStepSpec(edited,2).attributeBoxes[0].selected,false,'A never mirrors selection')
let independent=steps.setPaperStripSync(base,false)
independent=steps.activatePaperStripStep(independent,2)
edited=steps.commitPaperStripStepEdit(independent,{...independent,attributeBoxes:[{...bbe,x:80,y:60}]})
assert.equal(steps.getPaperStripStepSpec(edited,0).attributeBoxes[0].x,30)
assert.equal(steps.getPaperStripStepSpec(edited,1).attributeBoxes[0].x,30)
assert.equal(steps.getPaperStripStepSpec(edited,2).attributeBoxes[0].x,80,'B changes only step three')
let switched=steps.activatePaperStripStep(copy(edited),0)
switched=steps.activatePaperStripStep(copy(switched),2)
assert.equal(switched.attributeBoxes[0].x,80,'Independent edits survive persisted step switching')
const mirrored=steps.setPaperStripSync(switched,true)
assert.equal(mirrored.attributeBoxes[0].x,30)
assert.equal(steps.activatePaperStripStep(steps.setPaperStripSync(mirrored,false),2).attributeBoxes[0].x,80,'Changing modes preserves independent work')
assert.equal(steps.paperStripActiveStep(steps.setPaperStripStepCount(switched,1)),0,'Shrinking count returns to a valid cutter')
const grown=steps.setPaperStripStepCount(switched,4)
assert.equal(steps.getPaperStripStepSpec({...grown,attributeBoxes:[{...bbe,x:99}]},3).attributeBoxes[0].x,30,'New independent steps do not follow later edits')
const normalized=normalize.normalizePaperStripSpec(copy(edited))
assert.equal(normalized.paperStrip.stepping.syncMirror,false)
assert.equal(normalized.paperStrip.stepping.activeStep,2)
assert.equal(normalized.paperStrip.stepping.elementsByStep[0].attributeBoxes[0].x,30)
// Empty optional collections must overwrite outgoing fields after JSON drops undefined.
let empty=steps.activatePaperStripStep(independent,0)
empty={...empty,eyeMarks:{count:1,position:'top-left',width:5,height:5,color:'black'},perfs:{mode:'continuous',originX:50,separation:10,diameter:1}}
empty=steps.activatePaperStripStep(copy(empty),2)
assert.equal(empty.eyeMarks,undefined);assert.equal(empty.perfs,undefined)
// Moving into another repeat removes the source, translates local coordinates,
// preserves the destination's existing objects and avoids ID collisions.
const moved=steps.commitPaperStripStepEdit(independent,{...independent,attributeBoxes:[{...bbe,x:-280}]},{id:'attribute-box:bbe',dx:-310,dy:0})
assert.equal(moved.attributeBoxes.length,0)
const destination=steps.getPaperStripStepSpec(moved,1)
assert.equal(destination.attributeBoxes.length,2)
assert.equal(new Set(destination.attributeBoxes.map(b=>b.id)).size,2)
assert.equal(destination.attributeBoxes[1].x,30)
assert.equal(steps.getPaperStripStepSpec(moved,0).attributeBoxes.length,1)
const cases=[
  ['safe-zone','safeZones',{id:'sz',label:'Safe',x:30,y:20,width:20,height:15}],
  ['window','windows',{id:'win',shape:'rectangle',x:30,y:20,width:20,height:15}],
  ['attribute-box','attributeBoxes',{id:'strip',kind:'clear-strip',x:30,y:0,width:20,height:260}],
  ['hanger-slot','hangerSlots',{id:'hole',type:'hanger-slot',subtype:'round-hole',diameter:6,centerX:80,centerY:20,mirrored:true}],
  ['half-moon','halfMoonCutouts',{id:'moon',radius:3,centerX:80,centerY:0,alignedCutterEdgeId:'top'}],
  ['fold-line','foldLines',{id:'fold',orientation:'vertical',offset:80}],
]
for(const [kind,key,item] of cases){
  let source=steps.activatePaperStripStep(steps.setPaperStripSync({...base,[key]:[item]},false),2)
  const result=steps.commitPaperStripStepEdit(source,source,{id:`${kind}:${item.id}`,dx:-310,dy:0})
  assert.equal(result[key].length,0,`${kind} leaves its old repeat`)
  assert.equal(steps.getPaperStripStepSpec(result,1)[key].length,2,`${kind} arrives without replacing a peer`)
}
const perf={mode:'continuous',originX:70,separation:10,diameter:1}
let source=steps.activatePaperStripStep(steps.setPaperStripSync({...base,perfs:perf},false),2)
let result=steps.commitPaperStripStepEdit(source,source,{id:'perf-lane:0',dx:-310,dy:0})
assert.equal(result.perfs,undefined);assert.equal(steps.getPaperStripStepSpec(result,1).perfs.lanes.length,2)
const eye={count:1,position:'top-left',width:5,height:5,color:'black'}
source=steps.activatePaperStripStep(steps.setPaperStripSync({...base,eyeMarks:eye},false),2)
result=steps.commitPaperStripStepEdit(source,source,{id:'eye-mark:0',dx:-310,dy:0})
assert.equal(result.eyeMarks,undefined);assert.equal(steps.getPaperStripStepSpec(result,1).eyeMarks.count,2)
assert.equal(steps.getPaperStripStepSpec(result,1).eyeMarks.manualPositioned,true)
const resized=steps.commitPaperStripStepEdit(independent,{...independent,attributeBoxes:[{...bbe,x:-280,width:40}]})
assert.equal(resized.attributeBoxes.length,1,'Resize never transfers ownership')
const bad={...edited,paperStrip:{...edited.paperStrip,stepping:{...edited.paperStrip.stepping,elementsByStep:{...edited.paperStrip.stepping.elementsByStep,1:{attributeBoxes:[{...bbe,x:999}]}}}}}
assert(validation.validatePaperStripSpec(bad).errors.some(e=>e.startsWith('Step 2:')),'Inactive cutter validation is not skipped')
assert.equal(validation.validatePaperStripSpec({...base,attributeBoxes:[],eyeMarks:undefined}).errors.length,0,'Missing optional eyemarks never block construction')
const label={...bbe,kind:'label',labelKey:'fop',x:-5,y:-5}
assert.equal(flow.validateFlowwrapSpec({...base,attributeBoxes:[label]}).warnings.some(w=>w.includes('Attribute box needs more seal clearance')),false)
assert(flow.validateFlowwrapSpec({...base,attributeBoxes:[{...label,kind:'bbe'}]}).warnings.some(w=>w.includes('Attribute box needs more seal clearance')),'BBE seal warnings are retained')
assert(flow.validateFlowwrapSpec({...base,attributeBoxes:[{...label,x:-20}]}).errors.length>0,'Labels still obey physical cutter bounds')
const controls=readFileSync(root+'ui/controls.ts','utf8')
assert(!controls.includes('createFloatingPanel("safe"'))
assert(!controls.includes('createFloatingPanel("labels"'))
assert(controls.indexOf('createGroup("other", "Labels")')>controls.indexOf('createGroup("perforation", "Perforation")'))
for(const name of ['Clear Film','White Film','Brown Paper','White Paper','Black Paper','Custom Measure','Custom Label'])assert(controls.includes(name))
assert(controls.includes('PIFA_ROTATIONS'))
assert.match(readFileSync(root+'ui/dynamicElementMeasures.ts','utf8'),/svg.getAttribute\("data-paper-step-index"\)!==null/)
assert.match(readFileSync(root+'renderers/substrateAppearance.ts','utf8'),/patternUnits/)
assert.doesNotMatch(readFileSync(root+'renderers/substrateAppearance.ts','utf8'),/feTurbulence|requestAnimationFrame/)
console.log('Amends v5: A/B step isolation, persistence, cross-step element transfer, inactive validation, label seal rules and menus passed.')
