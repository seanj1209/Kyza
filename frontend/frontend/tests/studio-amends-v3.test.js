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
const root='apps/web/src/'
const routing=load(root+'geometry/annotationPlacement.ts')
assert.equal(routing.largestClearRect({x:0,y:0,width:100,height:100},[{x:0,y:0,width:100,height:100}]),null)
const free=routing.largestClearRect({x:0,y:0,width:100,height:100},[{x:20,y:20,width:60,height:60}])
assert(free && !routing.overlaps(free,{x:20,y:20,width:60,height:60}))
const action=load('packages/cutter-engine/actions/textDirection.ts')
const spec={width:120,height:100,seal:10,sealClearance:3,foldLines:[{id:'f',orientation:'vertical',offset:50}],safeZones:[{id:'sz',x:3,y:3,width:20,height:25}],attributeBoxes:[{id:'b',kind:'bbe',x:5,y:40,width:20,height:10},{id:'t',kind:'label',labelKey:'text-direction',x:5,y:10,width:20,height:12,rotation:0}]}
let fit=action.getTextDirectionPlacement(spec,'t')
assert(fit.enabled);assert.equal(spec.attributeBoxes[1].x,5)
const obstacles=routing.annotationObstacles({...spec,safeZones:[]},0,0,{x:-10,y:-10,width:120,height:100},'t')
assert(!obstacles.some(r=>routing.overlaps(fit.box,r)),'Placement avoids solid BBE boxes; safe zones are usable content regions')
assert(fit.box.x>=3 && fit.box.x+fit.box.width<=47,'Placement stays within selected fold/seal panel')
assert.equal(action.getTextDirectionPlacement({...spec,doyPouch:{}},'t').enabled,false)
assert.equal(action.placeTextDirection(spec,'missing'),null)
for(const pifa of [1,2,3,4]){
  const next=action.setTextDirectionPifa(spec,'t',pifa)
  const box=next.attributeBoxes.find(b=>b.id==='t')
  assert.equal(box.rotation,[0,180,270,90][pifa-1])
  assert.equal(box.width,20);assert.equal(box.height,12)
}
const added=action.addTextDirection({...spec,attributeBoxes:[]})
assert.equal(added.attributeBoxes[0].label,'Text Reads This Way')
assert.equal(added.attributeBoxes[0].labelKey,'text-direction')
assert.notEqual(action.addTextDirection(added).attributeBoxes[1].id,added.attributeBoxes[0].id)
const aligned=load(root+'ui/dynamicMeasureGeometry.ts')
const placement=load('packages/cutter-engine/actions/attributeAlignment.ts')
const nearCentre={id:'odd',kind:'bbe',x:13,y:13,width:25,height:15}
const snapped=placement.alignAttributePlacement({width:100,height:100,seal:10,safeZones:[{id:'safe',x:5,y:0,width:40,height:40}]},nearCentre,true,false,.75)
assert.equal(snapped.x,12.5,'Odd-width rectangles can snap exactly to a panel centre')
assert.equal(placement.alignAttributePlacement(spec,nearCentre,false,false,.75),nearCentre,'Disabled placement toggles do not change coordinates')
const object={x:40,y:20,width:20,height:10},zone={x:0,y:0,width:100,height:80}
let dims=aligned.alignmentDimensions(object,[zone],true,false)
assert.equal(dims.length,2);assert(dims.every(d=>d.aligned));assert.equal(dims[0].distance,dims[1].distance)
assert.equal(aligned.alignmentDimensions(object,[zone],false,false).length,0)
assert(aligned.alignmentDimensions({...object,x:0},[zone],false,true).some(d=>d.label==='Aligned'))
const perf=load(root+'geometry/perfs.ts'),measure=load(root+'renderers/perfMeasurements.ts')
const settings={mode:'continuous',separation:10,originX:140,diameter:1.5}
const pack={x:0,y:0,width:200,height:200}
const centers=perf.buildPerfCenters(settings,0,0,200,200,0,0,200,200)
const blocks=[{x:30,y:70,width:60,height:60},{x:0,y:98,width:15,height:5}]
dims=measure.buildPerfMeasurementDimensions(settings,centers,pack,blocks)
const pitch=dims.find(d=>d.kind==='pitch'),edge=dims.find(d=>d.kind==='edge-offset')
assert(pitch && edge)
assert.equal(pitch.y2-pitch.y1,10)
assert(Math.abs((pitch.y1+pitch.y2)/2-100)<15,'Continuous pitch is near lane centre, not first two holes')
assert(!dims.some(d=>d.kind==='first-perf'))
assert(!blocks.some(r=>routing.overlaps({x:Math.min(edge.x1,edge.x2),y:edge.y1-6,width:Math.abs(edge.x2-edge.x1),height:7},r)),'Width routing avoids the BBE and eyemark')
const crowded=measure.buildPerfMeasurementDimensions(settings,centers,pack,[{x:0,y:0,width:200,height:200}])
assert.equal(crowded.length,0,'No invented clear route when all space is blocked')
const controls=readFileSync(root+'ui/controls.ts','utf8'),art=readFileSync(root+'renderers/textDirectionArt.ts','utf8')
assert.match(controls,/createGroup\("other", "Labels"\)/)
assert.match(controls,/Custom Measure/);assert.match(controls,/Custom Label/);assert.match(controls,/button\.disabled=true/)
assert.match(art,/Text Reads/);assert.match(art,/This Way/);assert.match(art,/setAttribute\("opacity","\.4"\)/)
console.log('Amends v3: Text Direction placement/PIFA, obstacle envelopes, centre/squared feedback and tidy continuous perf routing passed.')
