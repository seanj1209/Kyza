import { expect, test, createManualProjectFromDashboard, readCurrentProject } from "./helpers/testState"

test('@beta v14 pouch contours respect entered clearance and highlights follow the shape',async({page})=>{
  await page.goto('/')
  const result=await page.evaluate(async()=>{
    const {getPackModule}=await import('/apps/web/src/packs/index.ts')
    const {getSafeZoneFit}=await import('/packages/cutter-engine/actions/safeZoneFit.ts')
    const {safeZoneRespectsConstruction}=await import('/packages/cutter-engine/actions/safeZoneContours.ts')
    const {attachSelectionInteractions}=await import('/apps/web/src/ui/selectionInteractions.ts')
    const selection=await import('/apps/web/src/state/selectionStore.ts')
    const {getSafeZoneBounds,checkSafeZoneViolation}=await import('/apps/web/src/artwork/artworkPreflight.helpers.ts')
    const {resolveKSealPouchGeometry}=await import('/apps/web/src/geometry/kSealPouchGeometry.ts')
    const outputs=[]
    for(const id of ['doy-pouch','k-seal-pouch'])for(const clearance of [1,5,10])for(const side of ['left','right']){
      const module=getPackModule(id)!,defaults=module.getDefaults()
      const zone={id:'fit',label:'Fit',x:side==='left'?20:defaults.width-50,y:20,width:20,height:20}
      const spec={...defaults,sealClearance:clearance,safeZones:[zone]}
      const fit=getSafeZoneFit(spec,zone.id)
      if(!fit.enabled)throw Error(fit.reason)
      // Independent signed-distance check against the physical band centre lines.
      if(id==='k-seal-pouch'){
        const g=resolveKSealPouchGeometry(spec)
        for(const p of fit.zone.fitOutline!){
          const x=g.liveX+fit.zone.x+p.x*fit.zone.width,y=g.liveY+fit.zone.y+p.y*fit.zone.height
          if(y<g.sideSeal+clearance-1e-6 || y>g.height-g.sideSeal-clearance+1e-6)throw Error('Side-seal clearance')
          if(side==='left'?x>g.leftBottomSealX-clearance+1e-6:x<g.rightBottomSealX+g.bottomSealAreaWidth+clearance-1e-6)throw Error('Bottom-seal clearance')
          for(const arm of g.armLines.filter(a=>a.position==='outer' && a.side.endsWith(side))){
            const dx=arm.endX-arm.startX,dy=arm.endY-arm.startY
            const distance=Math.abs(dx*(y-arm.startY)-dy*(x-arm.startX))/Math.hypot(dx,dy)
            if(distance<g.armWidth/2+clearance-1e-6)throw Error('K-arm edge clearance')
          }
        }
      }
      const svg=module.render({...spec,safeZones:[fit.zone]})
      svg.style.width='900px';svg.style.height='450px';document.body.append(svg)
      const path=svg.querySelector<SVGPathElement>('[data-fit-outline="true"]')!
      const hit=svg.querySelector('[data-role="safe-zone"]')!
      const bounds=path.getBBox()
      const store=new selection.SelectionStore()
      store.registerElements([{id:'safe-zone:fit',type:'safeZone',layer:'safe-zones',selectable:true,movable:true,resizable:true,rotatable:true,removable:true}])
      const interactions=attachSelectionInteractions(svg,store)
      store.setSelectionMode(true);store.setSelectedElementIds(['safe-zone:fit'])
      const highlight=svg.querySelector('#selection_overlay [data-selection-id="safe-zone:fit"] > path')
      const safeBounds=getSafeZoneBounds(svg)
      const artwork={id:'art',x:side==='left'?bounds.x+bounds.width-1:bounds.x+.1,y:bounds.y+.1,baseWidthMm:.5,baseHeightMm:.5,scale:1,rotation:0,flipped:false,flipMode:null,canEnterSafeZone:false}
      const cornerRejected=!!checkSafeZoneViolation(artwork as any,safeBounds)
      outputs.push({id,clearance,side,valid:safeZoneRespectsConstruction(spec,fit.zone),height:fit.zone.height,drawnHeight:bounds.height,shape:path.getAttribute('d'),hit:hit.getAttribute('d'),highlight:highlight?.getAttribute('d'),cornerRejected,square:svg.querySelector('[data-role="safe-zone-outline"]')?.getAttribute('stroke')})
      // Keep representative shapes for visual inspection of both panels.
      if(clearance===5){const img=document.createElement('img');img.style.cssText='display:block;width:900px;height:450px;background:white';img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));document.body.append(img)}
      interactions.destroy();svg.remove()
    }
    return outputs
  })
  expect(result).toHaveLength(12)
  for(const row of result){expect(row.valid).toBe(true);expect(row.shape).toBe(row.hit);expect(row.highlight).toBe(row.shape);expect(row.cornerRejected).toBe(true);expect(row.square).toBe('none');expect(row.drawnHeight).toBeCloseTo(row.height,3)}
  await page.screenshot({path:'test-results/v14-pouch-contours.png',fullPage:true})
})

test('@beta v14 stepped legends stay outside every cutter repeat',async({page})=>{
  await page.goto('/')
  const rows=await page.evaluate(async()=>{
    const {getPackModule}=await import('/apps/web/src/packs/index.ts')
    const {resolveSachetLayout}=await import('/apps/web/src/core/geometry/resolvers/resolveSachetLayout.ts')
    return ['paper-strip','sachet-3-side-seal','sachet-4-side-seal'].map(id=>{
      const pack=getPackModule(id)!,defaults=pack.getDefaults()
      const spec={...defaults,cutterLegend:true,cutterLegendOrientation:"landscape",...(id==='paper-strip'?{paperStrip:{...defaults.paperStrip,stepping:{stepCount:4,gap:3}}}:{sachet:{...defaults.sachet,stepEnabled:true,stepCount:4}})}
      const svg=pack.render(spec),legend=svg.querySelector('#cutter_legend')!
      const legendX=Number(legend.getAttribute('transform')!.match(/translate\(([^ ]+)/)![1])
      const sachet=spec.sachet?resolveSachetLayout(spec):null
      return {legendX,cutterRight:sachet?sachet.margin+sachet.contentWidth:24+spec.width*4+9,count:svg.querySelectorAll('#cutter_legend').length}
    })
  })
  for(const row of rows){expect(row.legendX).toBeGreaterThan(row.cutterRight);expect(row.count).toBe(1)}
})

test('@beta v14 strip safe zones expand and shrink with their boundary and retain clearance',async({page})=>{
  await page.goto('/')
  const result=await page.evaluate(async()=>{
    const {getPackModule}=await import('/apps/web/src/packs/index.ts')
    const {normalizePaperStripSpec}=await import('/apps/web/src/core/model/paperStripNormalization.ts')
    const {safeZoneRespectsConstruction}=await import('/packages/cutter-engine/actions/safeZoneContours.ts')
    const base=getPackModule('paper-strip')!.getDefaults()
    const initial=normalizePaperStripSpec({...base,sealClearance:5,attributeBoxes:[{id:'strip',kind:'clear-strip',x:140,y:0,width:30,height:base.height,enabled:true}],safeZones:[{id:'left',label:'Left',x:20,y:20,width:20,height:20},{id:'right',label:'Right',x:210,y:20,width:20,height:20}]})
    const {fitPaperSafeZone}=await import('/packages/cutter-engine/actions/paperSafeZones.ts')
    initial.safeZones=initial.safeZones!.map(z=>fitPaperSafeZone(initial,z)!)
    const move=(x:number)=>normalizePaperStripSpec({...initial,attributeBoxes:initial.attributeBoxes!.map(b=>({...b,x}))})
    const moved=move(180),shrunk=move(100)
    const manuallyResized=normalizePaperStripSpec({...initial,safeZones:initial.safeZones!.map(z=>({...z,width:z.width-10}))})
    if(manuallyResized.safeZones![0].width!==initial.safeZones![0].width-10)throw Error('Unchanged strips must not undo manual safe-zone edits')
    const gap=(s:typeof initial,z:NonNullable<typeof initial.safeZones>[number])=>z.id==='left'?s.attributeBoxes![0].x-(base.seals!.left!+z.x+z.width):base.seals!.left!+z.x-(s.attributeBoxes![0].x+s.attributeBoxes![0].width)
    return {initial:initial.safeZones!.map(z=>z.width),moved:moved.safeZones!.map(z=>z.width),shrunk:shrunk.safeZones!.map(z=>z.width),valid:[initial,moved,shrunk].every(s=>s.safeZones!.every(z=>safeZoneRespectsConstruction(s,z))),gaps:[initial,moved,shrunk].flatMap(s=>s.safeZones!.map(z=>gap(s,z)))}
  })
  expect(result.valid).toBe(true)
  expect(result.moved).toEqual([result.initial[0]+40,result.initial[1]-40])
  expect(result.shrunk).toEqual([result.initial[0]-40,result.initial[1]+40])
  expect(result.gaps).toEqual([5,5,5,5,5,5])
})

test('@beta v14 legend is per cutter, persisted, and exported as editable vector artwork',async({page})=>{
  await createManualProjectFromDashboard(page,{name:'E2E V14 Legend'})
  const svg=page.locator('#preview-canvas > svg')
  await expect(svg.locator('#cutter_legend')).toHaveCount(0)
  await page.getByRole('button',{name:'Legend layouts',exact:true}).click()
  await page.getByRole('menuitem',{name:'Portrait Klyro legend'}).click()
  await expect(svg.locator('#cutter_legend')).toBeVisible()
  await page.keyboard.press('Control+s')
  expect((await readCurrentProject(page))?.cutter?.legacySpec?.cutterLegend).toBe(true)
  await page.reload()
  await expect(svg.locator('#cutter_legend')).toBeVisible()
  const exported=await page.evaluate(async()=>{
    const {buildExportSvgDocument}=await import('/packages/cutter-engine/export/cutterExportService.ts')
    const projects=JSON.parse(localStorage.getItem('cutnflow.projects.v1')!)
    const id=new URL(location.href).searchParams.get('projectId'),project=projects.find((p:any)=>p.id===id)
    const svg=document.querySelector<SVGSVGElement>('#preview-canvas > svg')!
    return ['svg','ai-compatible-svg'].map(format=>{
      const doc=buildExportSvgDocument(project,{format,includeLayers:true,marginMm:0},svg)
      const parsed=new DOMParser().parseFromString(doc.svgMarkup,'image/svg+xml'),legend=parsed.querySelector('#cutter_legend')!
      return {format,text:legend.querySelectorAll('text').length,paths:legend.querySelectorAll('path').length,images:legend.querySelectorAll('image').length,right:Number(parsed.documentElement.getAttribute('data-legend-right')),frameRight:doc.frame.x+doc.frame.widthMm,valid:!parsed.querySelector('parsererror'),layer:legend.getAttribute('data-layer-name')}
    })
  })
  for(const item of exported){expect(item.valid).toBe(true);expect(item.text).toBeGreaterThan(12);expect(item.paths).toBeGreaterThan(5);expect(item.images).toBe(0);expect(item.frameRight).toBeGreaterThanOrEqual(item.right)}
  await page.screenshot({path:'test-results/v14-legend.png',fullPage:true})
  await page.getByRole('button',{name:'Legend layouts',exact:true}).click()
  await page.getByRole('menuitem',{name:'Hide legend'}).click()
  await expect(svg.locator('#cutter_legend')).toHaveCount(0)
  await page.keyboard.press('Control+s')
  expect((await readCurrentProject(page))?.cutter?.legacySpec?.cutterLegend).toBe(false)
})

test('@beta legend toolbar selects portrait or landscape with the vector K mark and transparent SVG export',async({page})=>{
  await createManualProjectFromDashboard(page,{name:'Legend layouts'})
  const svg=page.locator('#preview-canvas > svg')
  await page.locator('#studio-bottom-actions').getByRole('button',{name:'Legend layouts'}).click()
  await page.getByRole('menuitem',{name:'Landscape Klyro legend'}).click()
  await expect(svg.locator('#cutter_legend')).toHaveAttribute('data-orientation','landscape')
  await page.keyboard.press('Control+s')
  expect((await readCurrentProject(page))?.cutter?.legacySpec?.cutterLegendOrientation).toBe('landscape')
  const exported=await page.evaluate(async()=>{
    const {buildExportSvgDocument}=await import('/packages/cutter-engine/export/cutterExportService.ts')
    const projects=JSON.parse(localStorage.getItem('cutnflow.projects.v1')!)
    const id=new URL(location.href).searchParams.get('projectId'),project=projects.find((p:any)=>p.id===id)
    return ['svg','ai-compatible-svg'].map(format=>{
      const doc=buildExportSvgDocument(project,{format,includeLayers:true,marginMm:0},document.querySelector<SVGSVGElement>('#preview-canvas > svg')!)
      const root=new DOMParser().parseFromString(doc.svgMarkup,'image/svg+xml')
      const legend=root.querySelector('#cutter_legend')!
      return {orientation:legend.getAttribute('data-orientation'),markPaths:legend.querySelector('svg')?.querySelectorAll('path').length,images:legend.querySelectorAll('image').length,background:root.querySelectorAll('[data-export-background]').length,right:Number(root.documentElement.getAttribute('data-legend-right')),frameRight:doc.frame.x+doc.frame.widthMm}
    })
  })
  for(const item of exported){expect(item.orientation).toBe('landscape');expect(item.markPaths).toBe(4);expect(item.images).toBe(0);expect(item.background).toBe(0);expect(item.frameRight).toBeGreaterThanOrEqual(item.right)}
  await page.locator('#studio-bottom-actions').getByRole('button',{name:'Legend layouts'}).click()
  await page.getByRole('menuitem',{name:'Portrait Klyro legend'}).click()
  await expect(svg.locator('#cutter_legend')).toHaveAttribute('data-orientation','portrait')
})

test('@beta moving measurements target curved and diagonal contours, never imaginary subpath joins',async({page})=>{
  await page.goto('/')
  const result=await page.evaluate(async()=>{
    const {contourDimension}=await import('/apps/web/src/ui/dynamicElementMeasures.ts')
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg')
    svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('width','100');svg.setAttribute('height','100')
    document.body.appendChild(svg)
    const path=(d:string)=>{const node=document.createElementNS(ns,'path');node.setAttribute('d',d);svg.appendChild(node);return node}
    const diagonal=contourDimension(svg,path('M20 20 L80 80'),{x:30,y:48,width:4,height:4},'right')
    const arc=contourDimension(svg,path('M20 60 Q50 10 80 60'),{x:45,y:38,width:5,height:4},'right')
    const gap=contourDimension(svg,path('M20 20 L20 30 M80 70 L80 80'),{x:30,y:48,width:4,height:4},'right')
    svg.remove()
    return {diagonal:diagonal?.distance,arc:arc?.distance,gap}
  })
  expect(result.diagonal).toBeCloseTo(16,1)
  expect(result.arc).toBeGreaterThan(10)
  expect(result.arc).toBeLessThan(17)
  expect(result.gap).toBeNull()
})
