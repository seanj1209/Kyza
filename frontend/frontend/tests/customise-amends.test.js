import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
async function load(path, globals = {}) {
  const source = await readFile(path, 'utf8'), exports = {}
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, ...globals })
  return exports
}
const fixtureDocument={createElement:t=>new Node(t),createElementNS:(_ns,t)=>new Node(t),createTextNode:text=>({textContent:text})}
const appearance = await load('apps/web/src/renderers/elementAppearance.ts',{document:fixtureDocument})
const bbe = appearance.APPEARANCE_TARGETS.find(t => t.id === 'bbe')
assert(bbe.caps.includes('thickness')); assert(!bbe.caps.includes('fill'))
assert.equal(appearance.resolveAppearance(bbe, {color:'url(unsafe)'}).color,'#1a2a49')
assert.equal(appearance.resolveAppearance(bbe, {thickness:-10}).thickness,.1)
assert.equal(appearance.resolveAppearance(bbe, {opacity:5}).opacity,1)
assert.equal(appearance.resolveAppearance(bbe, {fontSize:NaN}).fontSize,4)
assert.deepEqual(Array.from(appearance.availableAppearanceTargets({attributeBoxes:[{kind:'bbe'},{kind:'qr',enabled:false}]}),t=>t.id),['bbe','main','sub'])
class Node {
  constructor(tag='rect', attrs={}) { this.tagName=tag; this.attrs=new Map(Object.entries(attrs)); this.children=[]; this.style={}; this.listeners=new Map(); this.disabled=false; this.checked=false; this.dataset={}; this.className=''; this.textContent='' }
  getAttribute(n) { return this.attrs.get(n)??null } setAttribute(k,v) { this.attrs.set(k,v) } removeAttribute(k) { this.attrs.delete(k) }
  closest() { return null } querySelectorAll() { return this.children } querySelector() { return null }
  append(...n) { this.children.push(...n) } appendChild(n) { this.append(n); return n } prepend(n) { this.children.unshift(n) } replaceChildren(...n) { this.children=n }
  addEventListener(n,f) { this.listeners.set(n,f) }
}
const shape=new Node('rect',{'data-role':'attribute-box','data-kind':'bbe','data-box-id':'box-1',fill:'none',stroke:'#1a2a49','stroke-width':'.3',opacity:'.75',x:'10',y:'20',width:'30',height:'15'})
const hit=new Node('rect',{'data-role':'attribute-box',fill:'transparent',stroke:'none'})
const label=new Node('text',{'data-role':'attribute-box-label','data-box-id':'box-1',fill:'#1a2a49'})
shape.parentElement={querySelectorAll:()=>[label]}
const svg=new Node('svg'); svg.querySelectorAll=s=>s===bbe.selector?[shape,hit]:[]
appearance.applyElementAppearance(svg,{})
assert.equal(shape.getAttribute('opacity'),'.75')
appearance.applyElementAppearance(svg,{elementAppearance:{bbe:{color:'#9e1316'}}})
assert.equal(shape.getAttribute('stroke'),'#9e1316'); assert.equal(label.getAttribute('fill'),'#9e1316')
assert.equal(shape.getAttribute('stroke-width'),'.3','Colour changes preserve unrelated appearance')
assert.equal(shape.getAttribute('opacity'),'.75'); assert.equal(hit.getAttribute('stroke'),'none','Hit targets stay untouched')
appearance.applyElementAppearance(svg,{elementAppearance:{bbe:{thickness:1.25,opacity:.4,lineStyle:'dotted',fill:'solid'}}})
assert.equal(shape.getAttribute('stroke-width'),'1.25'); assert.equal(shape.getAttribute('opacity'),'0.4'); assert.equal(shape.getAttribute('stroke-dasharray'),'.5 1.5'); assert.equal(shape.getAttribute('fill'),'none','Unsupported fills are ignored')
for (const [key,v] of Object.entries({x:'10',y:'20',width:'30',height:'15'})) assert.equal(shape.getAttribute(key),v,'No construction coordinates change')
const wt=appearance.APPEARANCE_TARGETS.find(t=>t.id==='windows'), ws=new Node('rect',{fill:'none'})
svg.querySelectorAll=s=>s===wt.selector?[ws]:[]
appearance.applyElementAppearance(svg,{elementAppearance:{windows:{color:'#2eb774',fill:'hatch'}}})
assert.equal(ws.getAttribute('fill'),'url(#klyro-appearance-hatch-windows)'); assert.match(svg.children[0].innerHTML,/patternUnits="userSpaceOnUse"/)
const mt=appearance.APPEARANCE_TARGETS.find(t=>t.id==='main'), st=appearance.APPEARANCE_TARGETS.find(t=>t.id==='sub'), ml=new Node('line'), sl=new Node('line'), group=new Node('g')
sl.closest=()=>({}); group.children=[ml,sl]; svg.querySelectorAll=s=>s===mt.selector?[group]:s===st.selector?[sl]:[]
appearance.applyElementAppearance(svg,{elementAppearance:{main:{color:'#9e1316'},sub:{color:'#2eb774'}}})
assert.equal(ml.getAttribute('stroke'),'#9e1316'); assert.equal(sl.getAttribute('stroke'),'#2eb774','Main/sub styles stay separate')
const storage=new Map(), localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}
const ui=await load('apps/web/src/ui/customiseAppearanceControls.ts',{localStorage,require:()=>({})})
storage.set('klyro.customise.recentColours',JSON.stringify(['<script>','#ABCDEF','#abcdef',null]))
assert.deepEqual(Array.from(ui.readRecentColours()),['#abcdef'])
for(let i=0;i<10;i++) ui.rememberColour('#'+i.toString(16).padStart(6,'0'))
assert.equal(ui.readRecentColours().length,8); assert.equal(ui.readRecentColours()[0],'#000009')
ui.rememberColour('#000005'); assert.equal(ui.readRecentColours()[0],'#000005')
storage.set('klyro.customise.recentColours','bad json'); assert.equal(ui.readRecentColours().length,0)
const document=fixtureDocument
const eui=await load('apps/web/src/ui/exportSelection.ts',{document,require:()=>({})}), host=new Node(), calls=[]
const actions=[{format:'svg',label:'Editable SVG',available:true,extensions:['.svg']},{format:'json',label:'JSON',available:true,extensions:['.json']},{format:'pdf-vector',label:'Vector PDF',available:false,extensions:['.pdf']}]
const selection=eui.createExportSelection(host,actions,async a=>{calls.push(a.format);return true})
const descendants=n=>[n,...(n.children??[]).flatMap(descendants)]
const button=descendants(host).find(n=>n.tagName==='button'), inputs=descendants(host.children[0]).filter(n=>n.tagName==='input')
assert(button.disabled); assert(inputs[0].checked); assert(inputs[2].disabled)
selection.setReadiness({state:'blocked'}); assert(button.disabled,'Critical findings disable export')
selection.setReadiness({state:'ready_with_advisories'}); assert(!button.disabled)
inputs[0].checked=false; inputs[0].listeners.get('change')(); assert(button.disabled)
inputs[0].checked=true; inputs[1].checked=true; inputs[2].checked=true; inputs[0].listeners.get('change')(); await button.listeners.get('click')()
assert.deepEqual(calls,['svg','json']); assert(inputs[2].disabled)
const cancelHost=new Node(), cancelled=[]
const cancellation=eui.createExportSelection(cancelHost,actions,async a=>{cancelled.push(a.format);return false})
cancellation.setReadiness({state:'ready'}); cancelHost.children[0].children[2].children[0].checked=true
await descendants(cancelHost).find(n=>n.tagName==='button').listeners.get('click')(); assert.deepEqual(cancelled,['svg'],'Cancellation stops the run')
const panel=await readFile('apps/web/src/ui/customisationPanel.ts','utf8')
for(const contract of ['requestExportApproval','executeProjectExport','createExportSelection','onShowMeasures?.()','onShowPerforations?.()']) assert(panel.includes(contract))
const exportStyles=await readFile('apps/web/src/ui/exportSelection.css','utf8')
assert(exportStyles.includes('#controls:has(#customisation-panel.is-file-mode.is-open)'), 'Export raises its ancestor stacking context so the project toolbar cannot intercept the close control')
console.log('Customise appearance, geometry isolation, colour history and selected-export guardrails verified')
