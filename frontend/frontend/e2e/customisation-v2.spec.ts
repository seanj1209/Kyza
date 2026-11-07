import { test,expect } from '@playwright/test'

test('element chips keep Fill/Text controls; Labels are text only; other menus stay generic',async({page})=>{
  await page.goto('/')
  await page.evaluate(async()=>{
    const {initCustomisationPanel}=await import('/apps/web/src/ui/customisationPanel.ts')
    const {getPackModule}=await import('/apps/web/src/packs/index.ts')
    const q=window as any;q.spec={...getPackModule('plain-film')!.getDefaults(),attributeBoxes:[
      {id:'bbe',kind:'bbe',x:20,y:20,width:50,height:30},
      {id:'qr1',kind:'qr',x:90,y:20,width:25,height:25},
      {id:'qr2',kind:'qr',x:120,y:20,width:25,height:25},
      {id:'label',kind:'label',label:'Keep exact',x:20,y:80,width:40,height:10}],
      windows:[{id:'win',shape:'rectangle',x:40,y:90,width:30,height:20}],
      perfs:{mode:'regulated',originX:20,originY:20,spacing:10,count:5,lanes:[{originX:20},{originX:40}]}}
    document.body.replaceChildren();const host=document.createElement('div');host.style.cssText='height:850px;position:relative';document.body.append(host)
    q.panel=initCustomisationPanel({host,onChange:(s:any)=>{q.spec=s;q.panel.setSpec(s)},getCurrentSvg:()=>null})
    q.panel.setSpec(q.spec);q.panel.setActiveLayer('notes');document.querySelector('#customisation-panel')!.classList.add('is-open')
  })
  const elements=page.getByRole('radiogroup',{name:'Choose elements appearance',exact:true})
  await expect(elements.getByRole('radio',{name:'BBE box',exact:true})).toBeVisible()
  await expect(page.getByRole('tab',{name:'Fill',exact:true})).toBeVisible()
  await expect(page.getByLabel('BBE box hex colour',{exact:true})).toHaveCount(0)
  await page.getByRole('tab',{name:'Text',exact:true}).click()
  await page.getByLabel('Customise part',{exact:true}).selectOption('heading')
  await page.getByLabel('Text content',{exact:true}).fill('Use before')
  await page.getByLabel('Customise part',{exact:true}).selectOption('date')
  await page.getByLabel('Text content',{exact:true}).fill('03/11/2026')
  await elements.getByRole('radio',{name:'QR code',exact:true}).click()
  await page.getByLabel('Customise element instance').selectOption('qr2')
  await page.getByRole('checkbox',{name:'Enable fill',exact:true}).check()
  await expect.poll(()=>page.evaluate(()=>(window as any).spec.objectAppearance['attribute-box:qr2'].fillEnabled)).toBe(true)
  expect(await page.evaluate(()=>(window as any).spec.objectAppearance['attribute-box:qr1'])).toBeUndefined()
  await elements.getByRole('radio',{name:'Label',exact:true}).click()
  await expect(page.getByRole('tab',{name:'Fill',exact:true})).toHaveCount(0)
  await expect(page.getByLabel('Text content',{exact:true})).toHaveValue('KEEP EXACT')
  await elements.getByRole('radio',{name:'Windows',exact:true}).click()
  await expect(page.getByLabel('Windows hex colour',{exact:true})).toBeVisible()
  await expect(page.getByRole('tab',{name:'Text',exact:true})).toHaveCount(0)
  await page.evaluate(()=>(window as any).panel.setActiveLayer('perf-lines'))
  await expect(page.locator('.customisation-perf-tab')).toHaveCount(2)
  await expect(page.locator('.customisation-perf-lane-delete svg')).toHaveCount(1)
  await expect(page.locator('.customisation-perf-lane .customisation-color-button img')).toHaveCount(2)
  await page.getByRole('button',{name:'Add perf lane',exact:true}).click()
  await expect(page.locator('.customisation-perf-tab')).toHaveCount(3)
  await page.getByRole('button',{name:'Delete perf lane',exact:true}).click()
  await expect(page.locator('.customisation-perf-tab')).toHaveCount(2)
})

async function measuresFixture(page:any){
  await page.goto('/')
  await page.evaluate(async()=>{
    const {getPackModule}=await import('/apps/web/src/packs/index.ts')
    const {SelectionStore}=await import('/apps/web/src/state/selectionStore.ts')
    const {attachCustomMeasureInteractions}=await import('/apps/web/src/ui/customMeasureInteractions.ts')
    const {attachMeasureTool}=await import('/apps/web/src/ui/precisionMeasureTool.ts')
    const {createAppearanceEditor}=await import('/apps/web/src/ui/customiseAppearanceControls.ts')
    document.body.replaceChildren();const q=window as any;q.spec={...getPackModule('plain-film')!.getDefaults(),width:200,height:140,attributeBoxes:[{id:'bb',kind:'bbe',x:30,y:30,width:40,height:25}],customMeasures:[]}
    const canvas=document.createElement('div'),host=document.createElement('div');canvas.id='fixture-canvas';canvas.style.cssText='width:900px;height:650px;float:left';host.id='customisation-panel';host.style.cssText='width:360px;height:850px;float:right;overflow:auto';document.body.append(canvas,host)
    q.store=new SelectionStore();q.qaUndoStates=[]
    q.commit=(s:any)=>{q.qaUndoStates.push(structuredClone(q.spec));q.spec=s;q.render();q.editor.refresh()}
    q.render=()=>{
      q.interaction?.destroy();q.tool?.destroy()
      const svg=getPackModule('plain-film')!.render(q.spec);svg.setAttribute('width','900');svg.setAttribute('height','650');canvas.replaceChildren(svg)
      q.store.registerElements(q.spec.customMeasures.map((m:any)=>({id:`custom-measure:${m.id}`,type:'customMeasure',layer:'custom-measures',selectable:true,locked:false,movable:false,resizable:false,rotatable:false,removable:true})))
      q.interaction=attachCustomMeasureInteractions(svg,()=>q.spec,q.store,q.commit,()=>q.store.setSelectionMode(true))
      q.tool=attachMeasureTool(svg,()=>{}, {onComplete:(start:any,end:any)=>{q.commit({...q.spec,customMeasures:[...q.spec.customMeasures,{id:`m${q.spec.customMeasures.length}`,start,end}]});q.tool.setEnabled(false)}})
    }
    q.editor=createAppearanceEditor(host,'measures',()=>q.spec,q.commit)
    q.render();q.editor.refresh()
  })
}
async function point(page:any,x:number,y:number){return page.evaluate(([x,y]:number[])=>{const svg=document.querySelector('#fixture-canvas>svg') as SVGSVGElement,p=svg.createSVGPoint();p.x=x;p.y=y;const r=p.matrixTransform(svg.getScreenCTM()!);return{x:r.x,y:r.y}},[x,y])}
async function draw(page:any,start:[number,number],end:[number,number]){
  await page.evaluate(()=>(window as any).tool.setEnabled(true));const a=await point(page,...start),b=await point(page,...end)
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up()
}
test('custom measure stays square during endpoint resizing until a deliberate sideways drag',async({page})=>{
  await measuresFixture(page)
  await draw(page,[110,30],[110,80])
  await page.evaluate(()=>(window as any).store.setSelectedElementIds(['custom-measure:m0']))
  let end=await point(page,110,80)
  await page.mouse.move(end.x,end.y);await page.mouse.down();await page.mouse.move(end.x+10,end.y+30,{steps:5});await page.mouse.up()
  let measure=await page.evaluate(()=>(window as any).spec.customMeasures[0])
  expect(measure.end.x).toBeCloseTo(measure.start.x,3)
  end=await point(page,110,measure.end.y)
  await page.mouse.move(end.x,end.y);await page.mouse.down();await page.mouse.move(end.x+40,end.y+15,{steps:5});await page.mouse.up()
  measure=await page.evaluate(()=>(window as any).spec.customMeasures[0])
  expect(Math.abs(measure.end.x-measure.start.x)).toBeGreaterThan(1)
})
test('custom measures snap to edges, adapt labels, re-anchor endpoints and survive project/export paths',async({page})=>{
  await measuresFixture(page)
  // BBE left edge at 30; release at its right edge 70, while deliberately a pixel off.
  await draw(page,[30.15,40],[70.15,40])
  await expect(page.locator('[data-role="custom-measure"]')).toHaveCount(1)
  const snapped=await page.evaluate(()=>(window as any).spec.customMeasures[0]);expect(snapped.start.x).toBeCloseTo(30,3);expect(snapped.end.x).toBeCloseTo(70,3)
  await expect(page.locator('[data-role="custom-measure"]')).toHaveAttribute('data-label-mode','inline')
  await expect(page.locator('[data-role="custom-measure-dimension"]')).toHaveAttribute('stroke-width','0.4')
  await page.evaluate(()=>{const q=window as any;q.store.setSelectedElementIds(['custom-measure:m0'])})
  const end=await point(page,70,40),next=await point(page,90,80)
  await page.mouse.move(end.x,end.y);await page.mouse.down();await page.mouse.move(next.x,next.y,{steps:5});await page.mouse.up()
  await expect.poll(()=>page.evaluate(()=>(window as any).spec.customMeasures[0].end.y)).toBeCloseTo(80,2)
  const resized=await page.evaluate(()=>(window as any).spec.customMeasures[0]);expect(resized.end.x).toBeCloseTo(90,2)
  await draw(page,[110,90],[112,90])
  await expect(page.locator('[data-custom-measure-id="m1"][data-role="custom-measure"]')).toHaveAttribute('data-label-mode','callout')
  await expect(page.getByRole('radio',{name:'2',exact:true})).toBeVisible()
  await page.getByRole('radio',{name:'2',exact:true}).click()
  await page.getByLabel('2 thickness',{exact:true}).fill('0.8');await page.getByLabel('2 thickness',{exact:true}).press('Tab')
  await page.getByLabel('2 hex colour',{exact:true}).fill('#123456');await page.getByLabel('2 hex colour',{exact:true}).press('Tab')
  const out=await page.evaluate(async()=>{
    const q=window as any,{projectFromLegacySpec,exportKyzaProjectJson,importKyzaProjectJson}=await import('/packages/cutter-engine/project/index.ts')
    const {buildExportSvgDocument}=await import('/packages/cutter-engine/export/cutterExportService.ts')
    const {createRasterPreviewPdfFromSvg}=await import('/packages/cutter-engine/export/rasterPreviewPdf.ts')
    const {createCutterExportMetadata}=await import('/packages/cutter-engine/export/exportTiers.ts')
    const {getPackModule}=await import('/apps/web/src/packs/index.ts')
    const project=projectFromLegacySpec('plain-film','Custom dimensions QA',q.spec),saved=exportKyzaProjectJson(project)
    if(!saved.ok)throw Error(JSON.stringify(saved));const loaded=importKyzaProjectJson(saved.value);if(!loaded.ok)throw Error(JSON.stringify(loaded))
    const source=getPackModule('plain-film')!.render(loaded.value.cutter!.legacySpec)
    // Include temporary handles to prove the export service strips them.
    source.append(document.querySelector('[data-role="custom-measure-handles"]')!.cloneNode(true))
    const editable=buildExportSvgDocument(loaded.value,{format:'svg',includeLayers:true,preserveVector:true,marginMm:0},source)
    const ai=buildExportSvgDocument(loaded.value,{format:'ai-compatible-svg',includeLayers:true,preserveVector:true,marginMm:0},source)
    const pdf=await createRasterPreviewPdfFromSvg(editable.svgMarkup,editable.frame.widthMm,editable.frame.heightMm,createCutterExportMetadata(loaded.value,{messages:[],isBlocking:false} as any,'raster-preview-pdf'))
    return {measures:loaded.value.cutter!.legacySpec.customMeasures,svg:editable.svgMarkup,ai:ai.svgMarkup,pdfHeader:await pdf.slice(0,8).text(),pdfSize:pdf.size,width:loaded.value.cutter!.legacySpec.width,box:loaded.value.cutter!.legacySpec.attributeBoxes[0]}
  })
  expect(out.measures).toHaveLength(2);expect(out.width).toBe(200);expect(out.box).toMatchObject({x:30,y:30,width:40,height:25})
  for(const markup of [out.svg,out.ai]){expect(markup).toContain('custom-measure-dimension');expect(markup).toContain('#123456');expect(markup).not.toContain('custom-measure-handles');expect(markup).not.toContain('measure-tool-overlay')}
  expect(out.pdfHeader).toBe('%PDF-1.4');expect(out.pdfSize).toBeGreaterThan(1000)
})

test('Escape/pointer cancellation do not save partial dimensions; screen zoom leaves mm exact',async({page})=>{
  await measuresFixture(page)
  await page.evaluate(()=>(window as any).tool.setEnabled(true));let a=await point(page,100,40),b=await point(page,135.5,40)
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y);await page.keyboard.press('Escape');await page.mouse.up()
  await expect(page.locator('[data-role="custom-measure"]')).toHaveCount(0)
  await page.evaluate(()=>{const svg=document.querySelector('#fixture-canvas>svg')!;svg.setAttribute('viewBox','50 20 100 70')})
  await draw(page,[100,40],[135.5,40])
  await expect(page.getByRole('radio',{name:'35.5',exact:true})).toBeVisible()
  expect(Number(await page.locator('[data-role="custom-measure"]').getAttribute('data-length-mm'))).toBeCloseTo(35.5,3)
})

test('actual studio Custom Measure creates a selectable saved dimension with numeric Customise chip',async({page})=>{
  await page.goto('/cutter.html?studio=home')
  await page.getByRole('button',{name:'Next pack type',exact:true}).click()
  await page.getByRole('button',{name:'Create Flowwrap cutter guide',exact:true}).click()
  await page.getByRole('button',{name:'Elements',exact:true}).click();await page.getByRole('tab',{name:'Labels',exact:true}).click()
  await page.getByRole('button',{name:'Custom Measure',exact:true}).click()
  const points=await page.locator('#preview-canvas>svg').evaluate((svg:SVGSVGElement)=>[30,80].map(x=>{const p=svg.createSVGPoint();p.x=x;p.y=45;const r=p.matrixTransform(svg.getScreenCTM()!);return{x:r.x,y:r.y}}))
  await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();await page.mouse.move(points[1].x,points[1].y,{steps:5});await page.mouse.up()
  await expect(page.locator('#preview-canvas [data-role="custom-measure"]')).toHaveCount(1)
  await page.getByRole('button',{name:'Customise',exact:true}).click()
  await expect(page.getByRole('radio',{name:'50',exact:true})).toBeVisible()
  await page.getByLabel('50 thickness',{exact:true}).fill('0.7');await page.getByLabel('50 thickness',{exact:true}).press('Tab')
  await expect(page.locator('#preview-canvas [data-role="custom-measure-dimension"]')).toHaveAttribute('stroke-width','0.7')
  await page.getByRole('button',{name:'Close panel',exact:true}).click();await page.keyboard.press('Escape');await page.keyboard.press('Control+z')
  await expect(page.locator('#preview-canvas [data-role="custom-measure-dimension"]')).toHaveAttribute('stroke-width','0.4')
  const selectDimension=async()=>{
    const box=await page.locator('#preview-canvas [data-role="custom-measure-label"]').boundingBox();if(!box)throw Error('Dimension label not visible')
    await page.mouse.click(box.x+box.width/2,box.y+box.height/2)
  }
  // Exercise the real app's selection, endpoint edit, delete and undo wiring.
  await selectDimension()
  const handle=page.locator('#preview-canvas [data-measure-end="end"]')
  const endpoint=await handle.evaluate((n:SVGCircleElement)=>{const p=n.ownerSVGElement!.createSVGPoint();p.x=n.cx.baseVal.value;p.y=n.cy.baseVal.value;const r=p.matrixTransform(n.getScreenCTM()!);return{x:r.x,y:r.y}})
  await page.mouse.move(endpoint.x,endpoint.y);await page.mouse.down();await page.mouse.move(endpoint.x+45,endpoint.y+30,{steps:5});await page.mouse.up()
  expect(Number(await page.locator('#preview-canvas [data-role="custom-measure"]').getAttribute('data-length-mm'))).toBeGreaterThan(50)
  await page.keyboard.press('Control+z')
  expect(Number(await page.locator('#preview-canvas [data-role="custom-measure"]').getAttribute('data-length-mm'))).toBeCloseTo(50,3)
  await selectDimension();await page.keyboard.press('Delete')
  await expect(page.locator('#preview-canvas [data-role="custom-measure"]')).toHaveCount(0)
  await page.keyboard.press('Control+z');await expect(page.locator('#preview-canvas [data-role="custom-measure"]')).toHaveCount(1)
  await page.reload();await page.getByRole('button',{name:/Resume Work/}).click()
  await expect(page.locator('#preview-canvas [data-role="custom-measure"]')).toHaveCount(1)
})

test('all pack render paths retain dimensions; malformed project dimensions are rejected',async({page})=>{
  await page.goto('/')
  const result=await page.evaluate(async()=>{
    const {packModules}=await import('/apps/web/src/packs/index.ts')
    const {projectFromLegacySpec,exportKyzaProjectJson,importKyzaProjectJson}=await import('/packages/cutter-engine/project/index.ts')
    const fixtures=packModules.map(pack=>{const spec={...pack.getDefaults(),customMeasures:[{id:'qa',start:{x:60,y:50},end:{x:95.5,y:50}}]},svg=pack.render(spec)
      return {id:pack.id,count:svg.querySelectorAll('[data-role="custom-measure"]').length,label:svg.querySelector('[data-role="custom-measure-label"]')?.textContent}})
    const spec={...packModules[0].getDefaults(),customMeasures:[{id:'qa',start:{x:60,y:50},end:{x:95.5,y:50}}]}
    const saved=exportKyzaProjectJson(projectFromLegacySpec(packModules[0].id,'Validate dimensions',spec));if(!saved.ok)throw Error(JSON.stringify(saved))
    const base=JSON.parse(saved.value),invalid=[null,{id:'bad',start:{x:'oops',y:0},end:{x:1,y:1}},{id:'bad',start:{x:0,y:0},end:{x:0,y:0}}]
    const rejected=invalid.map(m=>{const p=structuredClone(base);p.cutter.legacySpec.customMeasures=[m];return !importKyzaProjectJson(JSON.stringify(p)).ok})
    const duplicate=structuredClone(base);duplicate.cutter.legacySpec.customMeasures.push(duplicate.cutter.legacySpec.customMeasures[0]);rejected.push(!importKyzaProjectJson(JSON.stringify(duplicate)).ok)
    return {fixtures,rejected}
  })
  expect(result.fixtures).toHaveLength(8);expect(result.fixtures.every(x=>x.count===1&&x.label==='35.5mm')).toBe(true)
  expect(result.rejected).toEqual([true,true,true,true])
})
