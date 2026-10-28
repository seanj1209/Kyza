import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
function loader(globals={}) {
  const cache=new Map()
  function load(file){
    file=resolve(file);if(cache.has(file))return cache.get(file)
    const exports={};cache.set(file,exports)
    runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,...globals,require:name=>load(resolve(dirname(file),name)+'.ts')})
    return exports
  }
  return load
}
const load=loader(),root='apps/web/src/'
const action=load('packages/cutter-engine/actions/textDirection.ts')
const routing=load(root+'geometry/annotationPlacement.ts')
const label={id:'t',kind:'label',labelKey:'text-direction',x:35,y:30,width:30,height:15,rotation:0}
const bbe={id:'b',kind:'bbe',x:30,y:65,width:40,height:10}
const spec={width:120,height:100,seal:10,sealClearance:3,attributeBoxes:[label,bbe]}
let placed=action.placeTextDirection(spec,'t')
assert(placed)
let fitted=placed.attributeBoxes[0]
assert.equal(fitted.x+fitted.width/2,50,'Centred between side seals')
assert.equal(fitted.y+fitted.height/2,33.5,'Centred between top clearance and BBE exclusion')
assert(fitted.width<=46 && fitted.width<40,'Large panel uses a modest label, not maximum empty area')
assert.equal(action.placeTextDirection(placed,'t').attributeBoxes[0].width,fitted.width,'Place is idempotent')
for(const pifa of [1,2,3,4]){
  const turned=action.setTextDirectionPifa(placed,'t',pifa).attributeBoxes[0]
  assert.equal(turned.rotation,[0,180,270,90][pifa-1])
  for(const key of ['x','y','width','height'])assert.equal(turned[key],fitted[key],'PIFA changes orientation only')
  const fittedAgain=action.placeTextDirection({...placed,attributeBoxes:[turned,bbe]},'t').attributeBoxes[0]
  const envelope=routing.rotatedRect(fittedAgain,fittedAgain.rotation)
  assert(envelope.x>=3 && envelope.y>=3 && envelope.x+envelope.width<=97 && envelope.y+envelope.height<=77,'Rotated text stays within live clearances')
  assert(!routing.overlaps(envelope,bbe),'Place avoids BBE in every orientation')
}
const folded={...spec,foldLines:[{id:'f',orientation:'vertical',offset:50}],attributeBoxes:[{...label,x:35,width:30}]}
assert(action.getTextDirectionPlacement(folded,'t').enabled,'Label exactly centred on a fold can still be placed in an adjacent closed panel')
assert.equal(action.setTextDirectionPifa(spec,'missing',1),null)
assert.equal(action.setTextDirectionPifa(spec,'t',5),null,'Reverse-print codes remain future Artwork context')
const narrow={...spec,width:40,height:45,seal:5,attributeBoxes:[{...label,x:5,y:5}]}
fitted=action.placeTextDirection(narrow,'t').attributeBoxes[0]
assert(fitted.width<label.width,'Small cutter scales the label down')
const eye=load('packages/cutter-engine/actions/eyemarkPosition.ts')
const eyeSpec={...spec,eyeMarks:{count:1,width:5,height:5,position:'top-left'}}
assert.deepEqual(Array.from(eye.eyemarkPositionActions(eyeSpec,'sachet-3-side-seal')),['top','mid','bottom'])
assert.equal(eye.positionEyemarks(eyeSpec,'switch','sachet-3-side-seal'),null)
assert.deepEqual(Array.from(eye.eyemarkPositionActions(eyeSpec,'sachet-4-side-seal')),['centre'])
assert.equal(eye.positionEyemarks(eyeSpec,'bottom','sachet-4-side-seal'),null)
const viewport=load(root+'ui/canvasViewport.ts')
// Amends v10 (19a5571) supersedes the original 80–300 reference tiers.
assert.equal(viewport.referenceGridDpi(1.2),150);assert.equal(viewport.referenceGridDpi(1.4),150)
assert.deepEqual([2,4,8,16,64].map(viewport.referenceGridDpi),[200,300,600,600,600])
assert(Math.abs(viewport.wheelZoomFactor(.5)-1)<.001,'Tiny trackpad movement is not a fixed 10% jump')
assert(Math.abs(viewport.wheelZoomFactor(100)*viewport.wheelZoomFactor(-100)-1)<1e-12,'Opposite wheel input is reversible')
assert(Math.abs(viewport.wheelZoomFactor(10)**10-viewport.wheelZoomFactor(100))<1e-12,'Event frequency does not change total zoom')
const frames=new Map();let nextFrame=0,calls=[],resizeCalls=[]
const wheelLoad=loader({requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame},cancelAnimationFrame:id=>frames.delete(id)})
const listeners=new Map(),svg={isConnected:true,clientHeight:600,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)}
const wheel=wheelLoad(root+'ui/canvasWheel.ts').attachCanvasWheel(svg,(...args)=>calls.push(args),d=>{resizeCalls.push(d);return true})
const event=(dy,mode=0,altKey=false)=>({deltaY:dy,deltaMode:mode,clientX:100,clientY:200,altKey,preventDefault(){}})
listeners.get('wheel')(event(10));listeners.get('wheel')(event(20))
assert.equal(frames.size,1);assert.equal(calls.length,0)
const tick=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(f=>f())}
tick();assert.deepEqual(calls,[[30,100,200]])
listeners.get('wheel')(event(2,1));tick();assert.equal(calls.at(-1)[0],32)
listeners.get('wheel')(event(-1,2));tick();assert.equal(calls.at(-1)[0],-600)
listeners.get('wheel')(event(1,0,true));assert.deepEqual(resizeCalls,[-2]);assert.equal(frames.size,0)
listeners.get('wheel')(event(10));wheel.destroy();assert.equal(frames.size,0);assert.equal(listeners.size,0)
const perf=load(root+'renderers/perfMeasurements.ts')
const points=[{x:20,y:40},{x:20,y:50},{x:20,y:60}],pack={x:0,y:0,width:100,height:100},safe={x:0,y:0,width:100,height:100}
const measures=perf.buildPerfMeasurementDimensions({mode:'continuous'},points,pack,[safe],[])
assert(measures.some(d=>d.kind==='edge-offset'),'Width can cross a safe-zone region')
assert(!measures.some(d=>d.kind==='pitch'),'Pitch retains its own obstacle routing')
const art=readFileSync(root+'renderers/textDirectionArt.ts','utf8')
assert.doesNotMatch(art,/<path/,'Text label has no arrow')
console.log('Amends v4: chart PIFA, stable text sizing/placement, sachet action limits, DPI tiers and frame-coalesced wheel input passed.')
