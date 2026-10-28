import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
async function load(path, deps = {}, globals = {}) {
  const source = await readFile(path,'utf8')
  const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const exports = {}; runInNewContext(code,{exports,...globals,require:name=>{if(!(name in deps))throw Error(name);return deps[name]}}); return exports
}
const root = 'apps/web/src/'
// Load the real construction dependencies, including the Updates V2 contours.
const engineCache = new Map()
function engineLoad(path) {
  let file = resolve(path)
  if (!existsSync(file)) file = file.slice(0, -3) + '/index.ts'
  if (engineCache.has(file)) return engineCache.get(file)
  const exports = {}; engineCache.set(file, exports)
  runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => engineLoad(resolve(dirname(file), name) + '.ts') })
  return exports
}
const math = await load(root+'ui/dynamicMeasureGeometry.ts')
const separated = math.separateMeasureLabel({x:0,y:0,width:40,height:12},[{x:5,y:0,width:60,height:12}],4)
assert.equal(separated.y,16,'Overlapping perf labels move clear of each other')
assert.equal(math.separateMeasureLabel({x:80,y:0,width:40,height:12},[{x:5,y:0,width:60,height:12}],4).y,0,'Clear labels remain aligned with their dimension')
const object = {x:40,y:30,width:20,height:10}
const pack = {x:0,y:0,width:100,height:80}
const near = {x:25,y:28,width:5,height:20}
let dims = math.directionalDimensions(object,[pack,near],-1,-1)
assert.equal(dims.length,2,'Diagonal movement shows both axes')
assert.equal(dims[0].direction,'left'); assert.equal(dims[0].distance,10)
assert.equal(dims[1].direction,'top'); assert.equal(dims[1].distance,30)
dims = math.directionalDimensions(object,[pack],0,1)
assert.equal(dims.length,1);assert.equal(dims[0].direction,'bottom');assert.equal(dims[0].distance,40)
assert.equal(math.directionalDimensions(object,[pack],0,-1)[0].direction,'top','Reversal uses current movement, not drag-origin delta')
assert.equal(math.directionalDimensions(object,[pack],0,0).length,0,'Idle does not show random measures')
assert.equal(math.directionalDimensions(object,[pack],0,0,true).length,4,'Held shortcut shows all available sides')
assert.equal(math.directionalDimensions(object,[{x:35,y:100,width:1,height:2}],-1,0).length,0,'Off-axis objects are not references')
assert.equal(math.directionalDimensions(object,[{x:20,y:0,width:0,height:80}],-1,0)[0].distance,20,'Fold has a zero-width reference')
assert.equal(math.directionalDimensions(object,[{x:10,y:10,width:80,height:60}],-1,0)[0].distance,30,'Enclosing safe-zone edge is a reference')
const perf = math.perfDimensions([{x:25,y:50},{x:25,y:50},{x:25,y:65}],pack,[45,80])
assert.equal(perf.find(d=>d.label==='First perf from top').distance,50)
assert.equal(perf.find(d=>d.label==='Perf pitch').distance,15)
assert.equal(perf.find(d=>d.label==='Lane spacing').distance,20)
assert.equal(perf.find(d=>d.label==='From right').distance,75)
assert.equal(math.perfDimensions([{x:125,y:60},{x:125,y:70}],{x:100,y:10,width:100,height:80})[2].distance,50,'Translated packs preserve measurements')
const geometry = await load(root+'geometry/flowwrapGeometry.ts',{'../constraints/bleed':{INTERNAL_BLEED_MM:1}})
const folds = await load(root+'geometry/foldLines.ts')
const fit = engineLoad('packages/cutter-engine/actions/safeZoneFit.ts')
const spec = {width:120,height:100,seal:10,sealClearance:3,foldLines:[{id:'a',orientation:'vertical',offset:30},{id:'b',orientation:'vertical',offset:70}],safeZones:[{id:'zone',label:'Zone',x:40,y:10,width:10,height:10,rotation:30}],attributeBoxes:[{id:'bbe',kind:'bbe',x:45,y:10,width:10,height:5}],perfs:{mode:'regulated',originX:50,originY:20,separation:10,diameter:1.5}}
let result = fit.getSafeZoneFit(spec,'zone')
assert(result.enabled);assert.equal(result.zone.x,33);assert.equal(result.zone.y,3);assert.equal(result.zone.width,34);assert.equal(result.zone.height,74);assert.equal(result.zone.rotation,0)
const next = fit.fitSafeZone(spec,'zone')
assert.equal(next.attributeBoxes,spec.attributeBoxes);assert.equal(next.perfs,spec.perfs);assert.equal(spec.safeZones[0].x,40,'Fit does not mutate source')
result = fit.getSafeZoneFit({...spec,safeZones:[{...spec.safeZones[0],x:5}]},'zone')
assert(result.enabled);assert.equal(result.zone.width,24,'3 seals and 1 fold enclosure fits')
result = fit.getSafeZoneFit({...spec,sealClearance:5},'zone');assert(result.enabled);assert.equal(result.zone.width,30)
for (const invalid of [{...spec,foldLines:[]},{...spec,seal:0},{...spec,sealClearance:50},{...spec,sealClearance:NaN},{...spec,safeZones:[{...spec.safeZones[0],enabled:false}]}]) assert.equal(fit.getSafeZoneFit(invalid,'zone').enabled,false)
for (const [file, key, contour] of [['doyPouchPack','doyPouchPack','doy-'],['kSealPouchPack','kSealPouchPack','kseal-']]) {
  const defaults = engineLoad(root+'packs/'+file+'.ts')[key].getDefaults()
  let prior
  for (const clearance of [3,5]) {
    result = fit.getSafeZoneFit({...defaults,sealClearance:clearance,safeZones:[spec.safeZones[0]]},'zone')
    assert(result.enabled, `${file} fits its actual construction contour`)
    assert.equal(result.clearance,clearance)
    assert(result.zone.fitContour.startsWith(contour))
    assert(result.zone.width>0 && result.zone.height>0)
    if(prior) assert(result.zone.width<prior.width && result.zone.height<prior.height,'Larger entered clearance reduces the fitted envelope')
    prior=result.zone
  }
}
result = fit.getSafeZoneFit({...spec,foldLines:[{id:'h',orientation:'horizontal',offset:999}],safeZones:[{...spec.safeZones[0],x:10,y:5,width:10,height:10}]},'zone')
assert(result.enabled);assert.equal(result.zone.height,34,'Horizontal fold follows rendered centre, not unused offset')
const [attachment,annotations,selection,controls] = await Promise.all(['ui/dynamicElementMeasures.ts','ui/measurementAnnotations.ts','ui/selectionInteractions.ts','ui/controls.ts'].map(name=>readFile(root+name,'utf8')))
assert.match(attachment,/event\.clientX-drag\.x/)
assert.match(attachment,/event\.key\.toLowerCase\(\)===\"m\"/)
assert.match(attachment,/window\.removeEventListener\("blur",stop\)/)
assert.match(attachment,/root\.inverse\(\)\.multiply\(matrix\)/)
assert.match(selection,/dynamicMeasures\.destroy\(\)/)
assert.doesNotMatch(controls,/fitButton\.textContent = "Fit"/,'Fit is now an idle canvas action')
assert.match(annotations,/data-export-ui/)
assert.doesNotMatch(annotations,/#6b7bff|#b48800|#7a3db8|MAX_MEASUREMENTS/)
// Execute attachment lifecycle, not just its source contract.
class Node {
  constructor(attrs = {}) {this.attrs = attrs;this.listeners = new Map();this.isConnected = true}
  getAttribute(name) {return this.attrs[name] ?? null}
  setAttribute(name,value) {this.attrs[name] = value}
  removeAttribute(name) {delete this.attrs[name]}
  closest(selector) {return selector === '[data-role]' ? this : null}
  addEventListener(name,fn) {this.listeners.set(name,fn)}
  removeEventListener(name) {this.listeners.delete(name)}
  querySelector() {return null}
}
const win = new Node(), svgFixture = new Node()
const identityMatrix = {a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this},multiply(m){return m}}
svgFixture.getScreenCTM = () => identityMatrix
const source = new Node({'data-role':'attribute-box','data-box-id':'bbe'})
source.getBBox = () => object
source.getScreenCTM = () => identityMatrix
const reference = new Node()
reference.getBBox = () => pack
reference.getScreenCTM = () => identityMatrix
const state = {selectionMode:true,selectedElementIds:['attribute-box:bbe']}
let listener = null, removed = false, shown = [], cleared = 0
const store = {getState:()=>state,subscribe(fn){listener=fn;return()=>{removed=true}}}
const deferred = []
const attachmentModule = await load(root+'ui/dynamicElementMeasures.ts',{
  './measureSnapping':{collectMeasureEdges:()=>[source,reference],visibleEdge:()=>true,transformPoint:(p,m)=>({x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f})},
  './dynamicMeasureGeometry':math,
  './canvasViewport':{formatMeasurement:n=>n.toFixed(1)},
  './measurementAnnotations':{renderDynamicDimensions:(_svg,dims)=>{shown=dims},renderElementReadout:(_svg,box,value)=>{shown=[{box,value}]},clearMeasurementAnnotations:()=>{shown=[];cleared++}}
},{window:win,Element:Node,queueMicrotask:fn=>deferred.push(fn),document:{documentElement:{getAttribute:()=>"false"}}})
const attachmentApi = attachmentModule.attachDynamicElementMeasures(svgFixture,store)
const fire = (target,name,event)=>target.listeners.get(name)(event)
fire(svgFixture,'pointerdown',{button:0,target:source,pointerId:1,clientX:40,clientY:30})
fire(svgFixture,'pointermove',{pointerId:1,clientX:45,clientY:35});deferred.splice(0).forEach(fn=>fn())
assert.equal(shown.length,2);assert.equal(shown[0].direction,'right');assert.equal(shown[1].direction,'bottom')
fire(svgFixture,'pointermove',{pointerId:1,clientX:45,clientY:34});deferred.splice(0).forEach(fn=>fn())
assert.equal(shown.length,1);assert.equal(shown[0].direction,'top','Current event immediately reverses the axis')
fire(win,'pointerup',{});assert.equal(shown.length,0)
fire(win,'keydown',{target:svgFixture,ctrlKey:true,key:'m',preventDefault(){}})
assert.equal(shown.length,4)
fire(win,'keyup',{key:'m'});assert.equal(shown.length,0)
svgFixture.setAttribute('data-paper-step-index','2')
const localMeta=new Node({'data-cutter-width':'120','data-cutter-height':'100','data-live-origin-x':'10','data-live-origin-y':'10','data-live-width':'100','data-live-height':'80'})
svgFixture.querySelector=selector=>selector==='#attribute_boxes'?localMeta:null
fire(win,'keydown',{target:svgFixture,ctrlKey:true,key:'m',preventDefault(){}})
assert.equal(shown.find(d=>d.direction==='left').distance,30,'Step three uses its own left seal boundary, not the multi-step sheet')
assert.equal(shown.find(d=>d.direction==='top').distance,20,'Step three uses its own top seal boundary')
fire(win,'keyup',{key:'m'})
svgFixture.removeAttribute('data-paper-step-index');svgFixture.querySelector=()=>null
source.attrs['data-role']='attribute-box-handle'
fire(svgFixture,'pointerdown',{button:0,target:source,pointerId:2,clientX:40,clientY:30})
fire(svgFixture,'pointermove',{pointerId:2,clientX:47,clientY:35});deferred.splice(0).forEach(fn=>fn())
assert.equal(shown.length,1);assert.equal(shown[0].value,'20.0 × 10.0 mm','Resizing shows only intrinsic width × height')
fire(win,'keydown',{target:svgFixture,ctrlKey:true,key:'m',preventDefault(){}})
assert.equal(shown[0].value,'20.0 × 10.0 mm','Ctrl+M cannot introduce movement measures during resize')
fire(win,'pointerup',{});fire(win,'keyup',{key:'m'})
source.attrs['data-role']='attribute-box'
source.attrs['data-lane-index']='0';delete source.attrs['data-box-id']
fire(svgFixture,'pointerdown',{button:0,target:source,pointerId:3,clientX:40,clientY:30})
fire(svgFixture,'pointermove',{pointerId:3,clientX:47,clientY:35});deferred.splice(0).forEach(fn=>fn())
assert.equal(shown.length,0,'Perf drag has no dynamic overlay')
fire(win,'pointerup',{})
source.attrs['data-box-id']='bbe';delete source.attrs['data-lane-index']
fire(win,'keydown',{target:svgFixture,ctrlKey:true,key:'m',preventDefault(){}})
fire(win,'blur',{});assert.equal(shown.length,0,'Focus loss cannot leave stuck measures')
const rotated = {...source,getScreenCTM:()=>({a:0,b:2,c:-3,d:0,e:200,f:300})}
const transformed = attachmentModule.renderedBounds(svgFixture,rotated)
assert.equal(transformed.x,80);assert.equal(transformed.y,380);assert.equal(transformed.width,30);assert.equal(transformed.height,40)
attachmentApi.destroy();assert(removed);assert.equal(svgFixture.listeners.size,0);assert.equal(win.listeners.size,0);assert(cleared>0)
// AMENDS 6.1: perf lanes use the real quarter-millimetre movement grid.
const movementSnap = await load(root+'ui/movementSnap.ts',{'../klyro/account/preferenceService':await load(root+'klyro/account/preferenceService.ts')})
const perfAttachment = await load(root+'ui/perfInteractions.ts',{
  '../renderers/svgPerfs':{renderPerfs(){}},
  '../geometry/perfs':{buildPerfCenters:()=>[]},
  '../geometry/annotationPlacement':{annotationObstacles:()=>[]},
  '../renderers/perfMeasurements':{renderPerfMeasurements(){}},
  './movementSnap':movementSnap
})
svgFixture.isConnected=false
svgFixture.setPointerCapture=()=>{throw Error('Detached SVG must not capture')}
perfAttachment.attachPerfInteractions(svgFixture,spec,()=>{})
assert.doesNotThrow(()=>fire(svgFixture,'pointerdown',{button:0,target:source,pointerId:1,clientX:40,clientY:30}),'Changing selection cannot capture a detached perf renderer')
console.log('Dynamic attachment movement/reversal, held-key/blur cleanup, transformed bounds, perf distances and seal/fold Fit verified')
