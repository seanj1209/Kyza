import { writeFile } from "node:fs/promises"
import { test, expect } from '@playwright/test'

async function fixture(page:any) {
  await page.goto('/')
  await page.evaluate(async()=>{
    const {getPackModule}=await import('/apps/web/src/packs/index.ts')
    const {createSelectedObjectCustomise}=await import('/apps/web/src/ui/selectedObjectCustomise.ts')
    const {attachInlineElementText}=await import('/apps/web/src/ui/inlineElementText.ts')
    const {applyBaseLayerCustomisation}=await import('/apps/web/src/renderers/baseLayerCustomisation.ts')
    const q=window as any
    q.spec={...getPackModule('plain-film')!.getDefaults(),attributeBoxes:[
      {id:'bbe',kind:'bbe',x:30,y:30,width:50,height:30,rotation:15,textReference:{width:50,height:30,fontSize:6},texts:{heading:{content:'BBE'},date:{content:'DD/MM/YYYY',visible:true}}},
      {id:'qr',kind:'qr',x:100,y:30,width:25,height:25,texts:{caption:{content:'Scan label'}}},
      {id:'bar',kind:'barcode',x:150,y:30,width:40,height:25,texts:{caption:{content:'Product caption'}}},
    ]}
    document.body.replaceChildren()
    const host=document.createElement('div'),canvas=document.createElement('div')
    host.style.cssText='width:360px;float:right;max-height:900px;overflow:auto';canvas.style.cssText='width:900px;height:650px'
    document.body.append(host,canvas)
    const render=()=>{
      const svg=getPackModule('plain-film')!.render(q.spec)
      svg.setAttribute('width','900');svg.setAttribute('height','650');svg.setAttribute('data-select-enabled','true')
      applyBaseLayerCustomisation(svg,q.spec)
      svg.querySelectorAll('[data-box-id][data-role="attribute-box"]').forEach(n=>n.setAttribute('data-selectable-id',`attribute-box:${n.getAttribute('data-box-id')}`))
      canvas.replaceChildren(svg)
      q.inline=attachInlineElementText(svg,()=>q.spec,(next:any)=>{q.spec=next;render();q.editor.refresh()})
    }
    q.editor=createSelectedObjectCustomise(host,()=>q.spec,(next:any)=>{q.spec=next;render()},()=>canvas.querySelector('svg'))
    q.select=(id:string,key?:string)=>q.editor.setSelection([`attribute-box:${id}`],key)
    q.render=render;render();q.select('bbe')
  })
}

test('appearance is per object; BBE heading/date typography and save/reopen are independent',async({page})=>{
  await fixture(page)
  await page.getByRole('checkbox',{name:'Enable fill',exact:true}).check()
  await page.getByLabel('Fill colour HEX',{exact:true}).fill('#123456');await page.getByLabel('Fill colour HEX',{exact:true}).press('Tab')
  await page.getByLabel('Fill opacity (%)',{exact:true}).fill('25');await page.getByLabel('Fill opacity (%)',{exact:true}).press('Tab')
  await page.getByLabel('Stroke opacity (%)',{exact:true}).fill('70');await page.getByLabel('Stroke opacity (%)',{exact:true}).press('Tab')
  await page.getByLabel('Stroke thickness (mm)',{exact:true}).fill('1.2');await page.getByLabel('Stroke thickness (mm)',{exact:true}).press('Tab')
  await page.getByLabel('Stroke style',{exact:true}).selectOption('dotted')
  const rect=page.locator('rect[data-box-id="bbe"]').filter({hasNot:page.locator('[fill="transparent"]')}).first()
  await expect(rect).toHaveAttribute('fill','#123456');await expect(rect).toHaveAttribute('fill-opacity','0.25');await expect(rect).toHaveAttribute('stroke-opacity','0.7')
  await expect(rect).toHaveAttribute('stroke-width','1.2');await expect(rect).toHaveAttribute('stroke-dasharray','.5 1.5')
  await page.getByRole('checkbox',{name:'Enable stroke',exact:true}).uncheck();await expect(rect).toHaveAttribute('stroke','none')
  await page.getByRole('checkbox',{name:'Enable fill',exact:true}).uncheck();await expect(rect).toHaveAttribute('fill','none')
  await page.getByRole('tab',{name:'Text',exact:true}).click()
  await page.getByLabel('Customise part',{exact:true}).selectOption('heading')
  await page.getByLabel('Text content',{exact:true}).fill('Use before')
  await page.getByLabel('Font family',{exact:true}).selectOption('Montserrat')
  await page.getByLabel('Font weight',{exact:true}).selectOption('700')
  await page.getByLabel('Font size (pt)',{exact:true}).fill('12');await page.getByLabel('Font size (pt)',{exact:true}).press('Tab')
  await page.getByLabel('Text colour HEX',{exact:true}).fill('#cc2244');await page.getByLabel('Text colour HEX',{exact:true}).press('Tab')
  await page.getByLabel('Text X (%)',{exact:true}).fill('30');await page.getByLabel('Text X (%)',{exact:true}).press('Tab')
  await expect(page.locator('text[data-box-id="bbe"][data-text-key="heading"]')).toHaveText('Use before')
  await expect(page.locator('text[data-box-id="bbe"][data-text-key="date"]')).toHaveText('DD/MM/YYYY')
  await page.getByLabel('Customise part',{exact:true}).selectOption('date')
  await page.getByLabel('Text content',{exact:true}).fill('03/11/2026')
  const saved=await page.evaluate(async()=>{
    const {projectFromLegacySpec,exportKyzaProjectJson,importKyzaProjectJson}=await import('/packages/cutter-engine/project/index.ts')
    const q=window as any,project=projectFromLegacySpec('plain-film','Typography QA',q.spec)
    const exported=exportKyzaProjectJson(project)
    if(!exported.ok)throw new Error(JSON.stringify(exported))
    const loaded=importKyzaProjectJson(exported.value)
    if(!loaded.ok)throw new Error(JSON.stringify(loaded))
    const box=loaded.value.cutter.legacySpec.attributeBoxes.find((b:any)=>b.id==='bbe')
    return {texts:box.texts,appearance:loaded.value.cutter.legacySpec.objectAppearance,reference:box.textReference,other:q.spec.attributeBoxes[1]}
  })
  expect(saved.texts.heading).toMatchObject({content:'Use before',fontFamily:'Montserrat',fontWeight:700,fontSizePt:12,sizeMode:'fixed',color:'#cc2244',x:30})
  expect(saved.texts.date.content).toBe('03/11/2026');expect(saved.appearance['attribute-box:bbe'].fillEnabled).toBe(false)
  expect(saved.other.appearance).toBeUndefined();expect(saved.reference.width).toBe(50)
})

test('inline editing commits/cancels within rotated parent without replacing QR or barcode data',async({page})=>{
  await fixture(page)
  for(const [id,key,content] of [['bbe','heading','Fresh until'],['bbe','date','November 2026'],['qr','caption','Scan to explore'],['bar','caption','Revised caption']]){
    const text=page.locator(`text[data-box-id="${id}"][data-text-key="${key}"]`)
    await text.dblclick()
    const input=page.getByRole('textbox',{name:`Edit ${key} text`,exact:true});await expect(input).toBeFocused()
    await input.fill(content);await input.press('Enter');await expect(text).toHaveText(content)
  }
  await page.locator('text[data-box-id="bbe"][data-text-key="heading"]').dblclick()
  await page.getByRole('textbox',{name:'Edit heading text',exact:true}).fill('Cancel me')
  await page.getByRole('textbox',{name:'Edit heading text',exact:true}).press('Escape')
  await expect(page.locator('text[data-box-id="bbe"][data-text-key="heading"]')).toHaveText('Fresh until')
  const box=await page.evaluate(()=>(window as any).spec.attributeBoxes[0])
  expect(box).toMatchObject({x:30,y:30,width:50,height:30,rotation:15})
})

test('only explicit point-size fixes text; parent resize, nudge, rotation and persistence retain independent scaling',async({page})=>{
  await fixture(page)
  const result=await page.evaluate(async()=>{
    const {transformSelectedElements}=await import('/packages/cutter-engine/actions/selectionTransforms.ts')
    const {resolveText}=await import('/apps/web/src/renderers/attributeText.ts')
    const q=window as any,box=q.spec.attributeBoxes[0]
    box.texts.heading={...box.texts.heading,fontFamily:'Poppins',color:'#884422',fontWeight:700}
    const before=resolveText(box,'heading').size
    q.spec=transformSelectedElements(q.spec,{kind:'resize',selectedIds:['attribute-box:bbe'],deltaWidth:25,deltaHeight:15}).spec
    const auto=resolveText(q.spec.attributeBoxes[0],'heading')
    q.spec.attributeBoxes[0].texts.heading={...q.spec.attributeBoxes[0].texts.heading,sizeMode:'fixed',fontSizePt:12}
    const dateBefore=resolveText(q.spec.attributeBoxes[0],'date').size
    q.spec=transformSelectedElements(q.spec,{kind:'resize',selectedIds:['attribute-box:bbe'],deltaWidth:75,deltaHeight:45}).spec
    q.spec=transformSelectedElements(q.spec,{kind:'rotate',selectedIds:['attribute-box:bbe'],degrees:30}).spec
    q.spec=transformSelectedElements(q.spec,{kind:'nudge',selectedIds:['attribute-box:bbe'],deltaX:5,deltaY:6}).spec
    const final=JSON.parse(JSON.stringify(q.spec.attributeBoxes[0]))
    return {before,auto,fixed:resolveText(final,'heading'),dateBefore,dateAfter:resolveText(final,'date').size,final}
  })
  expect(result.auto.size).toBeCloseTo(result.before*1.5);expect(result.auto.fixed).toBe(false)
  expect(result.fixed.size).toBeCloseTo(12*25.4/72);expect(result.dateAfter).toBeCloseTo(result.dateBefore*2)
  expect(result.final.rotation).toBe(45);expect(result.final.texts.date.sizeMode).toBeUndefined()
})

test('self-hosted fonts embed in SVG; Illustrator output outlines text and PDF proof renders',async({page})=>{
  test.setTimeout(90000)
  const outlineRequests:string[]=[]
  page.on('request',request=>{if(/\/fonts\/.+\.json$/.test(request.url()))outlineRequests.push(request.url())})
  await fixture(page)
  const result=await page.evaluate(async()=>{
    const {FONT_GROUPS,ensureFont,prepareTypographySource,fontAlias}=await import('/apps/web/src/typography/fontLibrary.ts')
    const {createRasterPreviewPdfFromSvg}=await import('/packages/cutter-engine/export/rasterPreviewPdf.ts')
    const families=Object.values(FONT_GROUPS).flat()
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 180 180');svg.setAttribute('xmlns',svg.namespaceURI)
    for(const [index,family] of families.entries())for(const weight of [400,700]){
      await ensureFont(family,weight)
      const text=document.createElementNS(svg.namespaceURI,'text')
      for(const [key,value] of Object.entries({'font-kerning':'none','font-variant-ligatures':'none','data-font-family':family,'font-family':fontAlias(family),'font-size':'4','font-weight':String(weight),x:String(weight===400?20:100),y:String(10+index*15),'dominant-baseline':'central','text-anchor':'middle',fill:'#123456'}))text.setAttribute(key,value)
      text.textContent='Kyza 123 £';svg.append(text)
    }
    svg.append(svg.firstElementChild!.cloneNode(true))
    const editable=await prepareTypographySource(svg,false),outlined=await prepareTypographySource(svg,true)
    const raster=async(node:SVGSVGElement)=>{
      const copy=node.cloneNode(true) as SVGSVGElement
      copy.setAttribute('width','1440');copy.setAttribute('height','1440')
      const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(copy));await image.decode()
      const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1440
      const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);return {pixels:ctx.getImageData(0,0,1440,1440).data,png:canvas.toDataURL('image/png')}
    }
    const a=await raster(editable),b=await raster(outlined),pixels=a.pixels,outlinePixels=b.pixels
    let different=0,ink=0
    for(let i=3;i<pixels.length;i+=4){if(pixels[i]>100||outlinePixels[i]>100)ink++;if((pixels[i]>100)!==(outlinePixels[i]>100))different++}
    // Native hinted text and unhinted paths rasterise differently on Linux.
    // Allow one output pixel at the boundary; substantial shape/position changes still fail.
    const at=(data:Uint8ClampedArray,x:number,y:number)=>x>=0&&y>=0&&x<1440&&y<1440&&data[(y*1440+x)*4+3]>100
    const near=(data:Uint8ClampedArray,x:number,y:number)=>{
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(at(data,x+dx,y+dy))return true
      return false
    }
    const edgeDifference=(shift=0)=>{
      let unmatched=0,union=0
      for(let y=0;y<1440;y++)for(let x=0;x<1440;x++){
        const a=at(pixels,x,y),b=at(outlinePixels,x-shift,y);if(a||b)union++
        if(a&&!b&&!near(outlinePixels,x-shift,y))unmatched++
        if(b&&!a&&!near(pixels,x,y))unmatched++
      }
      return unmatched/union
    }
    const markup=new XMLSerializer().serializeToString(editable)
    const pdf=await createRasterPreviewPdfFromSvg(markup,90,90)
    return {editablePNG:a.png,outlinedPNG:b.png,inkMismatch:different/ink,edgeMismatch:edgeDifference(),shiftedEdgeMismatch:edgeDifference(3),families:families.length,embedded:editable.querySelector('style')!.textContent!.includes('data:font/woff2;base64,'),
      editableText:editable.querySelectorAll('text').length,outlinedText:outlined.querySelectorAll('text').length,paths:outlined.querySelectorAll('path').length,
      external:markup.includes('https://'),pdfHeader:await pdf.slice(0,8).text(),pdfBytes:pdf.size,labels:[...outlined.querySelectorAll('[data-text-outlined]')].map(n=>n.getAttribute('aria-label'))}
  })
  await writeFile('test-results/typography-editable.png',Buffer.from(result.editablePNG.split(',')[1],'base64'))
  await writeFile('test-results/typography-outlined.png',Buffer.from(result.outlinedPNG.split(',')[1],'base64'))
  expect(result).toMatchObject({families:10,embedded:true,editableText:21,outlinedText:0,external:false,pdfHeader:'%PDF-1.4'})
  expect(outlineRequests).toHaveLength(20)
  expect(new Set(outlineRequests).size).toBe(20)
  expect(result.edgeMismatch).toBeLessThan(.08)
  expect(result.shiftedEdgeMismatch).toBeGreaterThan(.15) // A deliberate 3px displacement must be detected.
  expect(result.paths).toBeGreaterThan(100);expect(result.pdfBytes).toBeGreaterThan(1000);expect(result.labels.every(label=>label==='Kyza 123 £')).toBe(true)
})

test('PDF v1 measurements, no default film dash and four Flow statuses',async({page})=>{
  await page.goto('/')
  const result=await page.evaluate(async()=>{
    const {getPackModule}=await import('/apps/web/src/packs/index.ts')
    const {createFlowAssistantDock}=await import('/apps/web/src/ui/flowAssistantDock.ts')
    const strip=getPackModule('paper-strip')!,base=strip.getDefaults()
    const render=(count:number)=>strip.render({...base,paperStrip:{...base.paperStrip,stepping:{stepCount:count,gap:8}}})
    const one=render(1),two=render(2),film=getPackModule('plain-film')!.render(getPackModule('plain-film')!.getDefaults())
    document.documentElement.setAttribute('data-sub-measures','true')
    const kseal=getPackModule('k-seal-pouch')!.render(getPackModule('k-seal-pouch')!.getDefaults())
    const top=[...kseal.querySelectorAll('[data-role="kseal-submeasure-text"][data-row="top"]')]
    const panel=document.createElement('div'),dock=createFlowAssistantDock(panel)
    const statuses=[]
    for(const counts of [{critical:0,warning:0,advisory:0,pass:1},{critical:0,warning:0,advisory:1,pass:1},{critical:0,warning:1,advisory:1,pass:1},{critical:1,warning:1,advisory:1,pass:0}]){
      dock.setValidation(counts);const status=dock.element.querySelector('#flow-issues-tab')!;statuses.push([status.textContent,status.getAttribute('data-severity')])
    }
    return {oneOverall:one.querySelectorAll('[data-role="paper-strip-measure-main-width"]').length,twoOverall:two.querySelector('[data-role="paper-strip-measure-main-width"]')?.textContent,
      filmDash:film.querySelector('#bleed_guides')?.childElementCount,top:top.map(n=>n.textContent),aligned:top.every(n=>n.getAttribute('y')===kseal.querySelector(`[data-role="kseal-submeasure-line"][data-row="top"][data-seg="${n.getAttribute('data-seg')}"]`)?.getAttribute('y1')),statuses}
  })
  expect(result.oneOverall).toBe(0);expect(result.twoOverall).toContain('628mm');expect(result.filmDash).toBe(0)
  expect(result.top).toEqual(['200mm','80mm','200mm']);expect(result.aligned).toBe(true)
  expect(result.statuses).toEqual([['Ready','ready'],['Advisory','advisory'],['Warning','warning'],['Critical','critical']])
})

test('actual studio Custom Label inserts text only and starts inline editing',async({page})=>{
  await page.goto('/cutter.html?studio=home')
  await page.getByRole('button',{name:'Create Plain Film cutter guide',exact:true}).click()
  await page.getByRole('button',{name:'Elements',exact:true}).click()
  await page.getByRole('tab',{name:'Labels',exact:true}).click()
  await page.getByRole('button',{name:'Custom Label',exact:true}).click()
  const input=page.getByRole('textbox',{name:'Edit label text',exact:true});await expect(input).toHaveValue('Type here...');await expect(input).toBeFocused()
  await input.fill('Kyza flexible packaging');await input.press('Enter')
  const text=page.locator('#preview-canvas text[data-text-key="label"]');await expect(text).toHaveText('Kyza flexible packaging')
  const id=await text.getAttribute('data-box-id')
  await expect(page.locator(`#preview-canvas rect[data-box-id="${id}"]`).first()).toHaveAttribute('stroke','none')
  await expect(page.locator(`#preview-canvas rect[data-box-id="${id}"]`).first()).toHaveAttribute('fill','none')
  await page.getByRole('button',{name:'Customise',exact:true}).click()
  await expect(page.getByRole('tab',{name:'Text',exact:true})).toBeVisible()
  await expect(page.getByRole('tab',{name:'Fill',exact:true})).toHaveCount(0)
  await expect(page.getByLabel('Text content',{exact:true})).toHaveValue('Kyza flexible packaging')
  await page.getByLabel('Font family',{exact:true}).selectOption('Inter')
  await expect(page.getByText('Auto scaling — follows parent size.',{exact:true})).toBeVisible()
})
