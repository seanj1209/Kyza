import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

function loader(globals={}) {
  const cache=new Map()
  function load(file) {
    file=resolve(file)
    if(cache.has(file))return cache.get(file)
    const exports={};cache.set(file,exports)
    const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    runInNewContext(code,{exports,...globals,require:name=>load(resolve(dirname(file),name)+'.ts')})
    return exports
  }
  return load
}
const load=loader(),root='apps/web/src/'
const defaults=load(root+'core/model/parameterSchema.ts')
const eyeGeometry=load(root+'geometry/eyeMarks.ts')
const marks=defaults.createEyeMarkDefaults({count:2,position:'top',width:15,height:5,offsetY:7.5})
const rects=eyeGeometry.buildEyeMarkRects(marks,80,80,460,200)
assert.equal(rects[0].y,rects[1].y,'New two-eyemark defaults must align')
assert.equal(defaults.createEyeMarkDefaults({count:2,offsetY:7.5,offsetY2:2}).offsetY2,2,'Explicit second offsets stay independent')
const spec={width:120,height:100,seal:10,eyeMarks:{...marks,width:5,width2:7,height2:6},safeZones:[{id:'z',x:3,y:3,width:20,height:20,rotation:0}],attributeBoxes:[{id:'b',x:30,y:30,width:20,height:10}]}
const position=load('packages/cutter-engine/actions/eyemarkPosition.ts')
for(const action of ['top','mid','bottom']) {
  const next=position.positionEyemarks(spec,action)
  assert.equal(next.eyeMarks.count,2)
  assert.equal(next.eyeMarks.width2,7)
  assert.equal(next.eyeMarks.offsetY,0);assert.equal(next.eyeMarks.offsetY2,0)
  const rectangles=eyeGeometry.buildEyeMarkRects(next.eyeMarks,0,0,120,100)
  if(action==='top')assert.equal(rectangles[0].y,1.5)
  if(action==='bottom')assert.equal(rectangles[1].y+rectangles[1].height,98.5)
  if(action==='mid')assert.equal(rectangles[0].y+rectangles[0].height/2,50)
}
assert.equal(position.positionEyemarks(spec,'switch'),null,'Pairs cannot switch to one side')
const single={...spec,eyeMarks:{...marks,count:1,position:'bottom-left',width:5,height:5}}
const swapped=position.positionEyemarks(single,'switch')
assert.equal(swapped.eyeMarks.position,'bottom-right')
assert.equal(eyeGeometry.buildEyeMarkRects(swapped.eyeMarks,0,0,120,100)[0].x,113.5)
assert.equal(spec.eyeMarks.offsetY,7.5,'Position action never mutates its input')
const transforms=load('packages/cutter-engine/actions/selectionTransforms.ts')
let turned=transforms.transformSelectedElements(spec,{kind:'rotate',selectedIds:['attribute-box:b','safe-zone:z'],degrees:-90})
assert.equal(turned.spec.attributeBoxes[0].rotation,270);assert.equal(turned.spec.safeZones[0].rotation,270)
assert.equal(spec.attributeBoxes[0].rotation,undefined)
assert.equal(transforms.transformSelectedElements(spec,{kind:'rotate',selectedIds:['eye-mark:0'],degrees:90}).changed,false,'Unsupported elements are not rotated')
const perfGeometry=load(root+'geometry/perfs.ts')
const perfMeasures=load(root+'renderers/perfMeasurements.ts')
const pack={x:80,y:80,width:120,height:100}
const perf={mode:'continuous',separation:10,originX:15,originY:40,diameter:1.5,lanes:[{originX:15},{originX:35}]}
const centers=perfGeometry.buildPerfCenters(perf,90,90,100,80,80,80,120,100)
let dims=perfMeasures.buildPerfMeasurementDimensions(perf,centers,pack)
assert(!dims.some(d=>d.kind==='first-perf'),'Continuous mode has no first-perf offset')
assert.equal(dims.find(d=>d.kind==='pitch').distance,10)
assert.equal(dims.find(d=>d.kind==='lane-spacing').distance,20)
assert.equal(dims.find(d=>d.kind==='edge-offset').distance,25)
const regulated={...perf,mode:'regulated',count:3,originY:40,lanes:[{originX:15,originY:40}]}
dims=perfMeasures.buildPerfMeasurementDimensions(regulated,perfGeometry.buildPerfCenters(regulated,90,90,100,80,80,80,120,100),pack)
assert.equal(dims.find(d=>d.kind==='first-perf').distance,50)
assert.equal(dims.find(d=>d.kind==='pitch').y2-dims.find(d=>d.kind==='pitch').y1,10,'Pitch line matches its label exactly')

class Node {
  constructor(){this.attrs={};this.listeners=new Map();this.style={};this.isConnected=true;this.children=[]}
  setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]??null}
  removeAttribute(k){delete this.attrs[k]}
  addEventListener(k,fn){this.listeners.set(k,fn)}removeEventListener(k){this.listeners.delete(k)}
  closest(){return null}dispatchEvent(event){this.listeners.get(event.type)?.(event)}
  setPointerCapture(id){this.captured=id}hasPointerCapture(id){return this.captured===id}
  releasePointerCapture(){this.captured=null}
}
const win=new Node(),svg=new Node()
svg.getScreenCTM=()=>({inverse:()=>({a:.5,b:0,c:0,d:.5})})
svg.setAttribute('data-pan-enabled','false')
const state={selectionMode:true,selectedElementIds:['attribute-box:b']}
const panLoad=loader({window:win,Element:Node,Event:class{constructor(type){this.type=type}}})
const pan=panLoad(root+'ui/canvasPan.ts')
let delta=[]
const api=pan.attachCanvasPan(svg,{getState:()=>state},()=>false,(x,y)=>delta.push([x,y]))
let stopped=0
const event={button:0,target:svg,altKey:true,pointerId:1,clientX:10,clientY:20,preventDefault(){},stopImmediatePropagation(){stopped++}}
svg.listeners.get('pointerdown')(event)
assert.equal(svg.getAttribute('data-pan-enabled'),'true')
svg.listeners.get('pointermove')({...event,clientX:30,clientY:40})
assert.deepEqual(delta,[[-10,-10]],'Alt pan uses the real inverse screen transform')
win.listeners.get('pointerup')(event)
assert.equal(svg.getAttribute('data-pan-enabled'),'false')
assert.deepEqual(state.selectedElementIds,['attribute-box:b'],'Temporary pan preserves selection')
assert(stopped>=3,'Capture phase blocks element editing handlers')
svg.listeners.get('pointerdown')(event);win.listeners.get('blur')()
assert.equal(svg.getAttribute('data-dragging'),'false','Blur releases temporary pan')
api.destroy();assert.equal(win.listeners.size,0);assert.equal(svg.listeners.size,0)
// Execute idle action timing, interruption, click and key behaviour with a controlled clock.
const clock=new Map();let clockId=0,observed=null
Node.prototype.appendChild=function(child){child.parent=this;this.children.push(child);return child}
Node.prototype.replaceChildren=function(){this.children=[]}
Node.prototype.remove=function(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this)}
Object.defineProperty(Node.prototype,'childElementCount',{get(){return this.children.length}})
const contextSvg=new Node(),contextWin=new Node(),zone=new Node()
const matrix={a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this},multiply(other){return other}}
contextSvg.getScreenCTM=zone.getScreenCTM=()=>matrix
zone.getBBox=()=>({x:20,y:20,width:20,height:20})
zone.setAttribute('data-zone-id','z')
const eyeNode=new Node();eyeNode.setAttribute('data-eye-index','0')
eyeNode.getBBox=zone.getBBox;eyeNode.getScreenCTM=zone.getScreenCTM
contextSvg.querySelectorAll=selector=>selector.includes('eye-mark')?[eyeNode]:[zone]
const contextState={selectionMode:true,selectedElementIds:['safe-zone:z']}
let contextChanged=null,contextListener=null
const contextStore={getState:()=>contextState,getElement:()=>({rotatable:true,locked:false}),subscribe(fn){contextListener=fn;return()=>{contextListener=null}}}
const contextLoad=loader({
  window:contextWin,Element:Node,
  document:{createElementNS:()=>new Node(),createElement:()=>new Node()},
  MutationObserver:class{constructor(fn){observed=fn}observe(){}disconnect(){observed=null}},
  setTimeout(fn,delay){assert.equal(delay,1500);clock.set(++clockId,fn);return clockId},clearTimeout(id){clock.delete(id)},
})
const contextModule=contextLoad(root+'ui/selectionContextActions.ts')
const fitSpec={...spec,foldLines:[{id:'fold',orientation:'vertical',offset:50}],sealClearance:3}
const contextApi=contextModule.attachSelectionContextActions(contextSvg,contextStore,()=>fitSpec,next=>{contextChanged=next})
const actionLayer=contextSvg.children[0]
assert.equal(actionLayer.children.length,0,'No action before idle delay')
assert.equal(clock.size,1)
const tick=()=>{const pending=[...clock.values()];clock.clear();pending.forEach(fn=>fn())}
tick();assert.equal(actionLayer.children.length,1,'Element actions appear after the idle clock')
const moreButton=actionLayer.children[0].children[0].children[0]
assert.equal(moreButton.textContent,'⋮')
moreButton.listeners.get('click')({stopPropagation(){}})
const fitButton=actionLayer.children[0].children[0].children[1]
assert.equal(fitButton.textContent,'Fit')
contextSvg.listeners.get('pointerdown')({target:contextSvg})
assert.equal(actionLayer.children.length,0,'Starting an edit hides the action immediately')
contextWin.listeners.get('pointerup')({target:contextSvg});tick()
actionLayer.children[0].children[0].children[0].listeners.get('click')({stopPropagation(){}})
actionLayer.children[0].children[0].children[1].listeners.get('click')({stopPropagation(){}})
assert(contextChanged);assert.equal(contextChanged.safeZones[0].x,3,'Fit click commits engine result')
contextListener();tick()
contextState.selectedElementIds=['eye-mark:0'];contextListener();tick()
const positionButton=actionLayer.children[0].children[0].children[0]
positionButton.listeners.get('click')({stopPropagation(){}})
actionLayer.children[0].children[0].children[0].listeners.get('click')({stopPropagation(){}})
assert.equal(actionLayer.children[0].children[0].children.length,3,'Pair position menu never shows Switch')
contextWin.listeners.get('keydown')({target:contextSvg,key:'Escape'})
assert.equal(actionLayer.children.length,0)
contextState.selectedElementIds=['attribute-box:b']
contextWin.listeners.get('keydown')({target:contextSvg,key:'R',shiftKey:true,preventDefault(){}})
assert.equal(contextChanged.attributeBoxes[0].rotation,90)
contextApi.destroy();assert.equal(clock.size,0);assert.equal(contextWin.listeners.size,0);assert.equal(contextListener,null)
const context=readFileSync(root+'ui/selectionContextActions.ts','utf8')
assert.match(context,/SELECTION_ACTION_DELAY_MS=1500/)
assert.match(context,/data-export-ui/)
assert.match(context,/event\.target\.closest\("\[data-context-action\]"\)/)
assert.match(context,/item\?\.rotatable && !item\.locked/)
assert.match(context,/observer\.disconnect\(\)/)
console.log('Amends v2: paired defaults, eyemark placement/clearance, rotation, perf modes/distances and Alt-pan lifecycle passed.')
