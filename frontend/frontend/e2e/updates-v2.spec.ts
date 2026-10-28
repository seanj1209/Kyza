import {test,expect,createManualProjectFromDashboard,readCurrentProject} from './helpers/testState'

test('@beta Updates V2 engine construction, opt-in Fit, eyemarks and advice',async({page})=>{
  await page.goto('/')
  const result=await page.evaluate(async()=>{
    const {getPackModule}=await import('/apps/web/src/packs/index.ts')
    const {normalizePaperStripSpec}=await import('/apps/web/src/core/model/paperStripNormalization.ts')
    const {getSafeZoneFit}=await import('/packages/cutter-engine/actions/safeZoneFit.ts')
    const {constrainPouchSafeZone,safeZoneRespectsConstruction}=await import('/packages/cutter-engine/actions/safeZoneContours.ts')
    const {pouchEyemarkPlacements}=await import('/packages/cutter-engine/actions/pouchEyemarkZones.ts')
    const {proportionalResize}=await import('/packages/cutter-engine/actions/proportionalResize.ts')
    const {laserLaneSpacingAdvice}=await import('/packages/cutter-engine/validation/laserLaneAdvice.ts')
    const {validateFlowwrapSpec}=await import('/apps/web/src/constraints/flowwrap.ts')
    const zone={id:'z',label:'Test',x:30,y:25,width:30,height:10}
    const paper=getPackModule('paper-strip')!.getDefaults()
    const unchanged=normalizePaperStripSpec({...paper,safeZones:[zone]}).safeZones![0]
    const pouches=['doy-pouch','k-seal-pouch'].map(id=>{
      const pack=getPackModule(id)!,spec={...pack.getDefaults(),sealClearance:3}
      const fit=getSafeZoneFit({...spec,safeZones:[zone]},zone.id)
      if(!fit.enabled)throw Error(JSON.stringify(fit))
      const fitted={...zone,...fit.zone}
      const edits=[{...fitted,width:fitted.width*2},{...fitted,x:fitted.x+1000},{...fitted,y:-100},{...fitted,height:fitted.height*2},{...fitted,rotation:45}]
      return {id,valid:edits.every(edit=>safeZoneRespectsConstruction(spec,constrainPouchSafeZone(spec,fitted,edit))),
        defaultMark:pouchEyemarkPlacements(spec)?.placements.every(p=>p.allowed),
        invalidMark:pouchEyemarkPlacements({...spec,eyeMarks:{...spec.eyeMarks!,offsetX:10000}})?.placements.some(p=>!p.allowed),
        clearanceErrors:validateFlowwrapSpec(spec).errors.filter(e=>e.toLowerCase().includes('clearance'))}
    })
    const scaled=proportionalResize(zone,{...zone,width:15},'se')
    const thirds=proportionalResize({...zone,width:13,height:7},{...zone,width:6.5,height:7},'right')
    const perf={mode:'continuous',diameter:.1,separation:10,originX:10,lanes:[{originX:10},{originX:100}]} as const
    return {unchanged,pouches,scaled,thirds,close:laserLaneSpacingAdvice(perf as any),wide:laserLaneSpacingAdvice({...perf,lanes:[{originX:0},{originX:151}]} as any)}
  })
  expect(result.unchanged).toMatchObject({x:30,y:25,width:30,height:10})
  expect(result.unchanged.paperFit).toBeUndefined()
  for(const p of result.pouches){expect(p.valid,p.id).toBe(true);expect(p.defaultMark,p.id).toBe(true);expect(p.invalidMark).toBe(true);expect(p.clearanceErrors).toEqual([])}
  expect(result.scaled).toMatchObject({width:15,height:5})
  expect(result.thirds).toMatchObject({width:6.5,height:3.5})
  expect(result.close).toContain('two runs through the slitter');expect(result.wide).toBeNull()
})

test('@beta Updates V2 DOY limits apply with Sync off and to manual values',async({page})=>{
  await page.goto('/')
  const rows=await page.evaluate(async()=>{
    const {doyPouchPack}=await import('/apps/web/src/packs/doyPouchPack.ts')
    const {constrainDoyGeometry,resolveDoyBounds}=await import('/apps/web/src/core/geometry/resolvers/doyBounds.ts')
    const {updateGussetControl}=await import('/packages/cutter-engine/actions/gussetControls.ts')
    return [135,300,600].flatMap(height=>[false,true].map(gussetSync=>{
      let spec={...doyPouchPack.getDefaults(),height}
      spec={...spec,doyPouch:{...spec.doyPouch!,gussetSync,ovalWidth:99999,ovalOffsetX:99999,arcOffsetX:99999,gussetDepth:99999}}
      spec=constrainDoyGeometry(spec)
      const g=resolveDoyBounds(spec,{originX:0,liveOriginX:10,liveWidth:spec.width-20,cutterWidth:spec.width})!
      const sized=updateGussetControl(spec,'gussetSize',40)
      return {oval:g.ovalWidth,gussetWidth:g.gussetWidth,web:spec.width,synced:gussetSync,inside:g.ovalLeftX>=10-1e-6 && g.ovalRightX<=spec.width-10+1e-6,gusset:sized.doyPouch!.panelWidths.center}
    }))
  })
  for(const r of rows){expect(r.oval).toBeGreaterThanOrEqual(r.gussetWidth);expect(r.oval).toBeLessThanOrEqual(r.web);expect(r.inside).toBe(true);expect(r.gusset).toBe(80)}
})

test('@beta Updates V2 legend keys reflect contents and hanger silhouettes share hit geometry',async({page})=>{
  await page.goto('/')
  const result=await page.evaluate(async()=>{
    const {getPackModule}=await import('/apps/web/src/packs/index.ts')
    const {HANGER_SLOT_STYLES}=await import('/apps/web/src/geometry/hangerSlotShapes.ts')
    const {renderHangerSlots}=await import('/apps/web/src/renderers/svgHangerSlots.ts')
    const pack=getPackModule('paper-strip')!,base=pack.getDefaults()
    const svg=pack.render({...base,cutterLegend:true,safeZones:[],perfs:undefined,attributeBoxes:[],hangerSlots:[],windows:[],halfMoonCutouts:[],eyeMarks:{...base.eyeMarks!,count:0}})
    const text=svg.querySelector('#cutter_legend')!.textContent
    const gallery=document.createElement('div');gallery.style.cssText='position:fixed;inset:0;z-index:99999;background:white;display:grid;grid-template-columns:repeat(3,1fr);padding:80px;gap:30px'
    const shapes=HANGER_SLOT_STYLES.map(style=>{
      const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 100 60')
      const g=document.createElementNS(s.namespaceURI,'g') as SVGGElement;s.append(g)
      renderHangerSlots(g,[{id:style.id,type:'hanger-slot',subtype:style.id,diameter:10,width:style.id==='keyhole-slot'?12:30,height:style.id==='keyhole-slot'?15:10,centerX:50,centerY:30,mirrored:false}],0,0,100)
      const box=document.createElement('div');box.append(style.name,s);gallery.append(box)
      const path=s.querySelector('[data-role="hanger-slot"]')!,hit=s.querySelector('[data-role="hanger-slot-hit"]')!
      return {id:style.id,shape:path.tagName,d:path.getAttribute('d'),same:path.getAttribute('d')===hit.getAttribute('d') && path.getAttribute('transform')===hit.getAttribute('transform')}
    })
    document.body.append(gallery)
    return {text,shapes}
  })
  expect(result.text).not.toContain('Safe zones');expect(result.text).not.toContain('Perforations');expect(result.text).not.toContain('Elements')
  expect(result.shapes).toHaveLength(6)
  expect(new Set(result.shapes.filter(s=>s.d).map(s=>s.d)).size).toBe(5)
  expect(result.shapes.every(s=>s.same)).toBe(true)
  await page.screenshot({path:'test-results/updates-v2-hanger-styles.png'})
})

test('@beta Updates V2 live DOY dropdown and toolbar Legend with Customise settings',async({page})=>{
  await createManualProjectFromDashboard(page,{name:'Updates V2 DOY',packLabel:'DOY Pouch'})
  await page.getByRole('button',{name:'Expand gusset tray'}).click()
  const dock=page.getByRole('region',{name:'Gusset dock'}).or(page.locator('.gusset-dock'))
  await expect(page.locator('.gusset-dock-tray')).toBeVisible()
  for(const label of ['Gusset (mm)','Side Seals (mm)'])await expect(page.locator('.gusset-dock').getByLabel(label,{exact:true})).toBeVisible()
  await expect(page.locator('.gusset-dock').getByLabel('Side Gusset (°)',{exact:true})).toHaveCount(0)
  await expect(page.locator('.gusset-dock').getByLabel('Bottom Gusset (°)',{exact:true})).toHaveCount(0)
  await page.locator('.gusset-dock').getByLabel('Gusset (mm)',{exact:true}).fill('40')
  await page.locator('.gusset-dock').getByLabel('Gusset (mm)',{exact:true}).press('Tab')
  await expect(page.locator('.floating-panel[data-panel="gusset-arch"]')).toHaveCount(0)
  await page.getByRole('button',{name:'Legend layouts',exact:true}).click()
  await page.getByRole('menuitem',{name:'Portrait Klyro legend'}).click()
  await expect(page.locator('#cutter_legend')).toBeVisible()
  await expect(page.locator('.cutter-legend-bar')).toHaveCount(0)
  await page.getByRole('button',{name:'Customise',exact:true}).click()
  await expect(page.locator('#customisation-panel')).toHaveClass(/is-open/)
  await page.keyboard.press('Control+s')
  expect((await readCurrentProject(page))?.cutter?.legacySpec?.doyPouch?.panelWidths.center).toBe(80)
  await page.screenshot({path:'test-results/updates-v2-doy-controls.png',fullPage:true})
})

test('@beta Updates V2 Ctrl drag keeps a 30 × 10 safe zone proportional',async({page})=>{
  await page.goto('/')
  const point=await page.evaluate(async()=>{
    const {getPackModule}=await import('/apps/web/src/packs/index.ts')
    const {attachSafeZoneInteractions}=await import('/apps/web/src/ui/safeZoneInteractions.ts')
    const pack=getPackModule('flowwrap')!,spec={...pack.getDefaults(),safeZones:[{id:'resize-test',label:'Resize',x:50,y:50,width:30,height:10,selected:true,enabled:true}]}
    const svg=pack.render(spec);svg.id='resize-fixture';svg.style.cssText='position:fixed;inset:0;z-index:99999;width:1000px;height:650px;background:white'
    svg.setAttribute('data-select-enabled','true')
    document.body.append(svg);attachSafeZoneInteractions(svg,spec,next=>{(window as any).resizeResult=next.safeZones![0]})
    const handle=svg.querySelector<SVGGraphicsElement>('[data-role="safe-zone-handle"][data-handle="se"]')!
    const r=handle.getBoundingClientRect(),m=svg.getScreenCTM()!
    return {x:r.x+r.width/2,y:r.y+r.height/2,dx:15*m.a,dy:5*m.d}
  })
  await page.keyboard.down('Control');await page.mouse.move(point.x,point.y);await page.mouse.down()
  await page.mouse.move(point.x-point.dx,point.y-point.dy,{steps:8});await page.mouse.up();await page.keyboard.up('Control')
  const size=await page.evaluate(()=>(window as any).resizeResult)
  expect(size.width).toBeCloseTo(15,1);expect(size.height).toBeCloseTo(5,1)
})

test('@beta Updates V2 hanger options stay inside Elements and pouch clearance is in Base',async({page})=>{
  await createManualProjectFromDashboard(page,{name:'Updates V2 Elements',packLabel:'DOY Pouch'})
  await page.getByRole('button',{name:'Base',exact:true}).click()
  const clearance=page.getByLabel('Seal Clearance',{exact:true})
  await expect(clearance).toBeVisible();await expect(clearance).toHaveValue('5')
  await page.getByRole('button',{name:'Elements',exact:true}).click()
  await page.getByRole('tab',{name:'Die Cut Outs',exact:true}).click()
  await page.getByRole('button',{name:'Hanger Slots',exact:true}).click()
  await expect(page.locator('.floating-panel[data-panel="hanger"]')).toHaveCount(0)
  for(const name of ['Round Hole','Standard Euro Slot','Keyhole Euro Slot','Keyhole Slot','Delta Slot','Sombrero Slot'])await expect(page.getByRole('button',{name:'Add '+name,exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Add Delta Slot',exact:true}).click()
  await page.keyboard.press('Control+s')
  expect((await readCurrentProject(page))?.cutter?.legacySpec?.hangerSlots?.[0]?.subtype).toBe('delta-slot')
  await page.screenshot({path:'test-results/updates-v2-hanger-menu.png',fullPage:true})
})

test('@beta Updates V2 hanger Ctrl resize preserves ratio and handle positions',async({page})=>{
  await page.goto('/')
  const point=await page.evaluate(async()=>{
    const {getPackModule}=await import('/apps/web/src/packs/index.ts')
    const {attachHangerSlotInteractions}=await import('/apps/web/src/ui/hangerSlotInteractions.ts')
    const pack=getPackModule('flowwrap')!,spec={...pack.getDefaults(),hangerSlots:[{id:'hanger-resize',type:'hanger-slot',subtype:'standard-euro-slot',diameter:10,width:30,height:10,centerX:60,centerY:50,selected:true,mirrored:false}]}
    const svg=pack.render(spec as any);svg.id='hanger-resize-fixture';svg.style.cssText='position:fixed;inset:0;z-index:99999;width:1000px;height:650px;background:white'
    svg.setAttribute('data-select-enabled','true');document.body.append(svg)
    attachHangerSlotInteractions(svg,spec as any,next=>{(window as any).hangerResizeResult=next.hangerSlots![0]})
    const handle=svg.querySelector<SVGGraphicsElement>('[data-role="hanger-slot-handle"][data-handle="se"]')!
    const r=handle.getBoundingClientRect(),m=svg.getScreenCTM()!
    return {x:r.x+r.width/2,y:r.y+r.height/2,dx:4.5*m.a,dy:1.5*m.d}
  })
  await page.keyboard.down('Control');await page.mouse.move(point.x,point.y);await page.mouse.down()
  await page.mouse.move(point.x-point.dx,point.y-point.dy,{steps:8})
  await page.mouse.up();await page.keyboard.up('Control')
  const result=await page.evaluate(async()=>{
    const {RESIZE_CORNER_OFFSET_MM,RESIZE_VERTICAL_OFFSET_MM}=await import('/apps/web/src/renderers/movementHandleImages.ts')
    const slot=(window as any).hangerResizeResult
    const svg=document.querySelector<SVGSVGElement>('#hanger-resize-fixture')!
    const shape=svg.querySelector('[data-role="hanger-slot"]')!.getBoundingClientRect()
    const handle=svg.querySelector('[data-role="hanger-slot-handle"][data-handle="se"]')!.getBoundingClientRect()
    const transform=svg.getScreenCTM()!
    return {slot,dx:handle.x+handle.width/2-shape.right,dy:handle.y+handle.height/2-shape.bottom,expectedDx:RESIZE_CORNER_OFFSET_MM*transform.a,expectedDy:RESIZE_VERTICAL_OFFSET_MM*transform.d}
  })
  expect(result.slot.width).toBeLessThan(30)
  expect(result.slot.height).toBeLessThan(10)
  expect(result.slot.height/result.slot.width).toBeCloseTo(1/3,5)
  expect(result.dx).toBeCloseTo(result.expectedDx,1)
  expect(result.dy).toBeCloseTo(result.expectedDy,1)
})
