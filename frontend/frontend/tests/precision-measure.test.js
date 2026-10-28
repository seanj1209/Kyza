import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
const read=p=>readFile(p,'utf8')
async function load(name,globals={}){
  const code=ts.transpileModule(await read(`apps/web/src/ui/${name}.ts`),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const exports={};runInNewContext(code,{exports,...globals});return exports
}
const viewport=await load('canvasViewport')
assert.equal(viewport.clampCanvasZoom(100),64)
assert.equal(viewport.clampCanvasZoom(.01),.2)
assert.equal(viewport.clampCanvasZoom(NaN),1)
assert.equal(viewport.REFERENCE_PIXEL_MM,25.4/600)
const base={x:0,y:0,width:640,height:320},current={x:10,y:20,width:320,height:160}
const anchored=viewport.zoomViewBox(base,current,64,{x:90,y:60})
assert.equal(anchored.width,10)
assert.equal((90-anchored.x)/anchored.width,(90-current.x)/current.width)
assert.equal((60-anchored.y)/anchored.height,(60-current.y)/current.height)
const centered=viewport.zoomViewBox(base,current,4)
assert.equal(centered.x+centered.width/2,current.x+current.width/2)
assert.match(viewport.measurementReadout(.125,-.1,.075),/0.125 mm · ΔX 0.100 · ΔY 0.075/)
assert.equal(viewport.formatMeasurement(20.155, .2), '20.16')
assert.equal(viewport.formatMeasurement(20.155, 3.999), '20.16')
assert.equal(viewport.formatMeasurement(20.155, 4), '20.16')
assert.equal(viewport.formatMeasurement(20.155, 15.999), '20.16')
assert.equal(viewport.formatMeasurement(20.155, 16), '20.155')
assert.equal(viewport.formatMeasurement(20, 64), '20.000')
assert.match(viewport.measurementReadout(25.4,25.4,0),/600.00 px at 600 ppi \(reference\)/)
const defaultStyle={display:'inline',visibility:'visible',opacity:'1',stroke:'#222',strokeOpacity:'1',strokeWidth:'1',fill:'none',fillOpacity:'1'}
const snapping=await load('measureSnapping',{getComputedStyle:e=>({...defaultStyle,...e.style})})
const identity={a:1,b:0,c:0,d:1,e:0,f:0}
const line=(matrix=identity,style={})=>({tagName:'line',style,isConnected:true,parentElement:null,getAttribute:n=>({x1:'0',y1:'0',x2:'100',y2:'0'}[n]??null),getScreenCTM:()=>matrix,getBoundingClientRect:()=>{
  const a=snapping.transformPoint({x:0,y:0},matrix),b=snapping.transformPoint({x:100,y:0},matrix);return{left:Math.min(a.x,b.x),right:Math.max(a.x,b.x),top:Math.min(a.y,b.y),bottom:Math.max(a.y,b.y)}
}})
const close=(a,b)=>assert(Math.abs(a-b)<.00001,`${a} should equal ${b}`)
let hit=snapping.findMeasureEdge([line()],{x:40,y:7})
assert(hit);assert.equal(hit.screen.y,0);assert.equal(hit.screen.x,40)
assert.equal(snapping.findMeasureEdge([line()],{x:40,y:9}),null)
hit=snapping.findMeasureEdge([line()],{x:-3,y:0});assert.equal(hit.screen.x,0)
// Includes stepped-lane translation, rotation and non-uniform screen scaling.
hit=snapping.findMeasureEdge([line({a:0,b:64,c:-32,d:0,e:230,f:140})],{x:237,y:780})
assert(hit);assert.equal(hit.screen.x,230);assert.equal(hit.screen.y,780)
assert.equal(snapping.findMeasureEdge([line({a:0,b:64,c:-32,d:0,e:230,f:140})],{x:239,y:780}),null)
assert.equal(snapping.findMeasureEdge([line(identity,{display:'none'})],{x:40,y:0}),null)
const parentHidden=line();parentHidden.parentElement={style:{opacity:'0'},parentElement:null}
assert.equal(snapping.findMeasureEdge([parentHidden],{x:40,y:0}),null)
assert.equal(snapping.findMeasureEdge([line(identity,{stroke:'none'})],{x:40,y:0}),null)
const rect={...line(),tagName:'rect',getAttribute:n=>({x:'0',y:'0',width:'20',height:'10'}[n]??null),getBoundingClientRect:()=>({left:0,right:20,top:0,bottom:10})}
hit=snapping.findMeasureEdge([rect],{x:22,y:5});assert.equal(hit.screen.x,20);assert.equal(hit.screen.y,5)
const clipRect={getAttribute:n=>({x:'20',y:'0',width:'60',height:'10'}[n]??null)}
const clipped=line({...identity,inverse:()=>identity})
const clipParent={style:{},getAttribute:n=>n==='clip-path'?'url(#cut_clip)':null,getScreenCTM:()=>({...identity,inverse:()=>identity}),parentElement:null}
clipped.parentElement=clipParent;clipped.ownerSVGElement={getElementById:()=>({querySelector:()=>clipRect,getAttribute:()=>null})}
assert.equal(snapping.findMeasureEdge([clipped],{x:10,y:0}),null,'Clipped-out geometry must not snap')
assert(snapping.findMeasureEdge([clipped],{x:40,y:0}))
const circle={...line(),tagName:'circle',getTotalLength:()=>2*Math.PI*10,getPointAtLength:s=>({x:10*Math.cos(s/10),y:10*Math.sin(s/10)}),getBoundingClientRect:()=>({left:-10,right:10,top:-10,bottom:10})}
hit=snapping.findMeasureEdge([circle],{x:0,y:12});close(hit.screen.x,0);close(hit.screen.y,10)
const invalidPath={...circle,getTotalLength:()=>{throw Error('not rendered')}}
assert.equal(snapping.findMeasureEdge([invalidPath],{x:0,y:12}),null)
const excluded={closest:()=>true,getAttribute:()=>null},handle={closest:()=>false,getAttribute:()=>'seal-handle'},source={closest:()=>false,getAttribute:()=>'seal-rect'}
assert.deepEqual(Array.from(snapping.collectMeasureEdges({querySelectorAll:()=>[excluded,handle,source]})),[source])

// Exercise actual attachment/cancellation/destruction with a small SVG DOM fixture.
class Element {
  constructor(tag){this.tagName=tag;this.attrs=new Map();this.children=[];this.style={};this.listeners=new Map();this.parentElement=null;this.hidden=false;this.isConnected=true}
  setAttribute(k,v){this.attrs.set(k,v)} getAttribute(k){return this.attrs.get(k)??null}
  appendChild(e){e.parentElement=this;this.children.push(e);return e} append(...es){es.forEach(e=>this.appendChild(e))}
  replaceChildren(...es){this.children=[];this.append(...es)} remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(e=>e!==this)}
  addEventListener(n,f){this.listeners.set(n,f)} removeEventListener(n){this.listeners.delete(n)}
}
let observed=false,disconnected=false,callback=null,captured=false,notifyMutation=null
const document={createElementNS:(_ns,tag)=>new Element(tag),createElement:tag=>new Element(tag),body:new Element('body')}
const window=new Element('window')
const svg=new Element('svg');svg.parentElement=new Element('preview');svg.parentElement.children=[svg]
const matrix={...identity,inverse(){return this},multiply(){return this}}
svg.getScreenCTM=()=>matrix
svg.createSVGPoint=()=>({x:0,y:0,matrixTransform(){return{x:this.x,y:this.y}}})
svg.viewBox={baseVal:{x:0,y:0,width:200,height:100}}
svg.setPointerCapture=()=>{captured=true};svg.hasPointerCapture=()=>captured;svg.releasePointerCapture=()=>{captured=false}
const hits=[line(),{...line(),getAttribute:n=>({x1:'0',x2:'100',y1:'10',y2:'10'}[n]??null),getBoundingClientRect:()=>({left:0,right:100,top:10,bottom:10})}]
svg.querySelectorAll=()=>hits
hits.forEach(e=>e.closest=()=>false)
const values=[]
const toolModule=await load('precisionMeasureTool',{document,window,innerWidth:1280,requestAnimationFrame:f=>{callback=f;return 1},cancelAnimationFrame:()=>{callback=null},MutationObserver:class{constructor(f){notifyMutation=f}observe(){observed=true}disconnect(){disconnected=true}},require:name=>name==='./measureSnapping'?snapping:name==='./canvasViewport'?viewport:{}})
const api=toolModule.attachMeasureTool(svg,n=>values.push(n))
api.setEnabled(true);assert.equal(svg.getAttribute('data-measure-enabled'),'true')
const event=(x,y,altKey=false)=>({clientX:x,clientY:y,button:0,pointerId:1,altKey,preventDefault(){},stopImmediatePropagation(){}})
const overlay=svg.children[0],drawing=overlay.children[3]
svg.listeners.get('pointermove')(event(40,1));callback()
assert.equal(overlay.children[2].children.length,2,'Idle hover highlights the nearest edge and snap point')
assert.equal(document.body.children[0].hidden,true,'Hover alone must not start a measure')
svg.listeners.get('pointermove')(event(40,100));callback()
assert.equal(overlay.children[2].children.length,0,'Leaving edge tolerance clears the highlight')
svg.listeners.get('pointerdown')(event(40,1));assert(captured)
// No move event: release must still resolve/snap the second endpoint.
svg.listeners.get('pointerup')(event(40,9));assert.equal(values.at(-1),10);assert(!captured)
assert.equal(overlay.getAttribute('data-export-ui'),'true')
assert.equal(drawing.children[1].textContent,'10.00 mm')
assert.equal(overlay.children[1].children[0].getAttribute('vector-effect'),'non-scaling-stroke')
svg.listeners.get('pointerdown')(event(40,1,true));svg.listeners.get('pointerup')(event(40,9,true));assert.equal(values.at(-1),8)
svg.listeners.get('pointerdown')(event(20,1));svg.listeners.get('pointercancel')();assert.equal(values.at(-1),null);assert(!captured)
svg.listeners.get('pointerdown')(event(20,1));api.setEnabled(false);assert(!captured);assert.equal(drawing.children.length,0)
svg.setAttribute('data-reference-grid','true');svg.setAttribute('data-canvas-zoom','1.3');notifyMutation();callback()
const canvasGrid=svg.parentElement.children.find(e=>e.getAttribute('data-role')==='canvas-dpi-grid')
assert(canvasGrid && !canvasGrid.hidden);assert.equal(canvasGrid.getAttribute('data-grid-dpi'),'150')
assert.match(canvasGrid.style.cssText,/position:absolute;inset:14px/,'Grid covers the canvas host, not an SVG-only rectangle')
svg.setAttribute('data-canvas-zoom','64');notifyMutation();callback()
assert.equal(canvasGrid.getAttribute('data-grid-dpi'),'600')
svg.setAttribute('data-reference-grid','false');notifyMutation();callback();assert(canvasGrid.hidden)
api.destroy();assert(observed&&disconnected);assert.equal(svg.children.length,0);assert.equal(document.body.children.length,0);assert.equal(svg.parentElement.children.length,1);assert.equal(svg.listeners.size,0);assert.equal(window.listeners.size,0)
const [main,controls,css,exportsSource]=await Promise.all([read('apps/web/src/main.ts'),read('apps/web/src/ui/controls.ts'),read('apps/web/src/ui/measureTool.css'),read('packages/cutter-engine/export/cutterExportService.ts')])
assert.match(main,/measureApi\?\.destroy\(\)/)
assert.doesNotMatch(main,/Math\.min\(5, (?:zoom|nextZoom|viewBoxState.zoom)\)/)
assert.match(main,/controlsApi\?\.setCanvasZoom\?\.\(zoom\)/)
assert.match(controls,/20, 50, 100, 200, 400, 800, 1600, 3200, 6400/)
assert.match(controls,/formatMeasurement\(value, zoomPercent \/ 100\)/)
assert.match(css,/cursor: crosshair !important/)
assert.match(exportsSource,/\[data-export-ui='true'\]/)
console.log('Precision measurement snapping, transformed edges, zoom anchors, reference units, cancellation and cleanup verified')
