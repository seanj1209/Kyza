import type { FlowwrapSpec } from "../types/flowwrap"
import { KYZA_SYMBOL_DATA_URI } from "../kyza/shell/brandImageData"
import { resolveSachetLayout } from "../core/geometry/resolvers/resolveSachetLayout"
import { resolveKSealPouchGeometry } from "../geometry/kSealPouchGeometry"
import { doyFinishedWidth } from "../core/geometry/resolvers/doyBounds"
import { collectLegendKey, type LegendKeyEntry } from "./legendKey"

const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!))
export const LEGEND_WIDTH = 116
export const LEGEND_HEIGHT = 154
export const LANDSCAPE_LEGEND_WIDTH = 240
export const LANDSCAPE_LEGEND_HEIGHT = 112
export const DEFAULT_LEGEND_SCALE = 1.3
export const legendScale = (spec:FlowwrapSpec) => {
  const requested = spec.cutterLegendScale ?? DEFAULT_LEGEND_SCALE
  return Number.isFinite(requested) ? Math.max(.7,Math.min(2.5,requested)) : DEFAULT_LEGEND_SCALE
}
const legendExtraHeight = (entries: LegendKeyEntry[], landscape: boolean) =>
  Math.max(0, Math.ceil(entries.length / 2) - (landscape ? 6 : 5)) * 5
const pouchLegendHeight = (spec: FlowwrapSpec, landscape: boolean) =>
  !landscape && (spec.doyPouch || spec.kSealPouch) ? 17 : 0

/** Native SVG text and paths: editable Illustrator artwork, never a screenshot. */
export function cutterLegendMarkup(spec: FlowwrapSpec, packName: string, x: number, y: number, entries: LegendKeyEntry[] = []) {
  const landscape=spec.cutterLegendOrientation==='landscape'
  const width=landscape?LANDSCAPE_LEGEND_WIDTH:LEGEND_WIDTH
  const extraHeight=legendExtraHeight(entries,landscape)
  const height=(landscape?LANDSCAPE_LEGEND_HEIGHT:LEGEND_HEIGHT)+extraHeight+pouchLegendHeight(spec,landscape)
  const text=(px:number,py:number,value:string,size=3.5,extra='')=>`<text x="${px}" y="${py}" font-family="Arial, sans-serif" font-size="${size}" fill="#302d2c" ${extra}>${escape(value)}</text>`
  const rule=(x1:number,y1:number,x2:number,y2:number,color='#ded4ca')=>`<path d="M${x1} ${y1}H${x2}" stroke="${color}" stroke-width=".25"/>`
  const heading=(px:number,py:number,value:string,end:number)=>`${text(px,py,value,2.5,'fill="#a71920" font-weight="700" letter-spacing=".45"')}${rule(px,py+2,end,py+2)}`
  const mark=(px:number,py:number,size:number)=>`<svg x="${px}" y="${py}" width="${size}" height="${size}" viewBox="210 245 850 830"><image data-export-include-raster="true" href="${KYZA_SYMBOL_DATA_URI}" width="1254" height="1254"/></svg>`
  const count=spec.paperStrip?.stepping?.stepCount??(spec.sachet?.stepEnabled?spec.sachet.stepCount??1:1)
  const totalWidth=spec.paperStrip ? spec.width*count+(spec.paperStrip.stepping?.gap??0)*(count-1) : spec.sachet ? resolveSachetLayout(spec).contentWidth : spec.kSealPouch ? resolveKSealPouchGeometry(spec).width : spec.width
  const finished = spec.kSealPouch
    ? { width: resolveKSealPouchGeometry(spec).pouchWidth, height: resolveKSealPouchGeometry(spec).pouchHeight }
    : spec.doyPouch ? { width: spec.height, height: doyFinishedWidth(spec) } : null
  const pouchDimensions = (px:number,py:number) => finished
    ? `${text(px,py,'Pouch Spec',2.5,'font-weight="700" fill="#a71920"')}${text(px,py+7,`Finished ${finished.width}W × ${finished.height}H mm`,2.35)}`
    : ''
  const eyemark=spec.eyeMarks?.count?`${spec.eyeMarks.count} × ${spec.eyeMarks.width} × ${spec.eyeMarks.height} mm`:'None'
  const substrate=(spec.substrate??'clear').replaceAll('-',' ')
  const sample=(entry:LegendKeyEntry,cx:number,cy:number)=>
    `<g transform="translate(${cx} ${cy-3})">${entry.preview}</g>`
  const key=(px:number,py:number,columnWidth:number)=>{
    return entries.map((entry,i)=>{
      const col=i%2,row=Math.floor(i/2),cx=px+col*columnWidth,cy=py+row*5
      return `${sample(entry,cx,cy)}${text(cx+10,cy+.2,entry.label,2.2,'font-weight="600"')}`
    }).join('')
  }
  const header=landscape
    ? `${text(8,13,'CUTTER SPECIFICATION',6,'font-weight="700" letter-spacing=".6"')}${text(8,18,'Precision-led packaging geometry',2.7,'font-style="italic" fill="#6c6663"')}${mark(213,5,10)}${text(224,12,'Kyza',6,'font-weight="700" fill="#a71920"')}${rule(8,21,232,21,'#302d2c')}`
    : `${mark(8,7,10)}${text(21,15,'Kyza',7,'font-weight="700" fill="#a71920"')}${text(8,29,'CUTTER SPECIFICATION',6,'font-weight="700" letter-spacing=".7"')}${text(8,34,'Precision-led packaging geometry',2.7,'font-style="italic" fill="#6c6663"')}${rule(8,39,108,39,'#302d2c')}`
  const content=landscape
    ? `${heading(8,28,'PRODUCT INFORMATION',72)}${text(8,36,'Product',2,'fill="#77716e"')}${text(8,41,packName,3.2,'font-weight="600"')}${rule(8,44,72,44)}${text(8,50,'Cutter ref.',2,'fill="#77716e"')}${text(8,55,'Current cutter',2.8)}${rule(8,58,72,58)}
       ${heading(78,28,'TECHNICAL SPECIFICATION',138)}${text(78,38,'WIDTH',2.1,'font-weight="700"')}${text(108,38,'REPEAT',2.1,'font-weight="700"')}${text(78,47,String(totalWidth),7,'font-weight="700"')}${text(108,47,String(spec.height),7,'font-weight="700"')}${finished?`${pouchDimensions(78,54)}${text(78,70,'Eyemark',2.7)}${text(138,70,eyemark,2.7,'text-anchor="end"')}${rule(78,73,138,73)}${text(78,80,'Substrate',2.7)}${text(138,80,substrate,2.7,'text-anchor="end"')}${rule(78,83,138,83)}`:`${text(78,55,'Eyemark',2.7)}${text(138,55,eyemark,2.7,'text-anchor="end"')}${rule(78,58,138,58)}${text(78,64,'Substrate',2.7)}${text(138,64,substrate,2.7,'text-anchor="end"')}${rule(78,67,138,67)}`}
       ${heading(145,28,'PRODUCT KEY / ELEMENTS',232)}${key(145,36,44)}${heading(145,70+extraHeight,'TECHNICAL NOTES',232)}${text(145,76+extraHeight,'Verify production-critical specifications',2.15)}${text(145,80+extraHeight,'against the intended manufacturing process.',2.15)}
       ${rule(8,98+extraHeight,232,98+extraHeight)}${mark(8,101+extraHeight,7)}${text(16,106+extraHeight,'Kyza',3.2,'font-weight="700" fill="#a71920"')}${text(31,106+extraHeight,'INTELLIGENCE IN MOTION',1.8,'letter-spacing=".5"')}${text(92,106+extraHeight,'Production suitability and approval remain subject to verification.',2,'fill="#77716e"')}`
    : `${heading(8,47,'PRODUCT INFORMATION',108)}${text(8,54,'Product',2,'fill="#77716e"')}${text(8,59,packName,3.2,'font-weight="600"')}${rule(8,62,108,62)}
       ${heading(8,69,'TECHNICAL SPECIFICATION',108)}${text(8,75,'WIDTH',2,'font-weight="700"')}${text(60,75,'REPEAT',2,'font-weight="700"')}${text(8,84,String(totalWidth),7,'font-weight="700"')}${text(60,84,String(spec.height),7,'font-weight="700"')}${finished?`${pouchDimensions(8,91)}${rule(8,102,108,102)}${text(8,108,'Eyemark',2.7)}${text(108,108,eyemark,2.7,'text-anchor="end"')}${rule(8,111,108,111)}${text(8,117,'Substrate',2.7)}${text(108,117,substrate,2.7,'text-anchor="end"')}${rule(8,120,108,120)}`:`${text(8,91,'Eyemark',2.7)}${text(108,91,eyemark,2.7,'text-anchor="end"')}${rule(8,94,108,94)}${text(8,99,'Substrate',2.7)}${text(108,99,substrate,2.7,'text-anchor="end"')}${rule(8,102,108,102)}`}
       ${heading(8,108+pouchLegendHeight(spec,false),'PRODUCT KEY / ELEMENTS',108)}${key(8,115+pouchLegendHeight(spec,false),50)}
       ${heading(8,142+extraHeight+pouchLegendHeight(spec,false),'TECHNICAL NOTES',108)}${text(8,147+extraHeight+pouchLegendHeight(spec,false),'Verify specifications before production approval.',2,'fill="#77716e"')}`
  return `<g id="cutter_legend" data-layer-id="cutter-legend" data-orientation="${landscape?'landscape':'portrait'}" transform="translate(${x} ${y}) scale(${legendScale(spec)})"><rect width="${width}" height="${height}" fill="#fff" stroke="#ded4ca" stroke-width=".3"/><rect width="${width}" height="1" fill="#a71920"/>${header}${content}</g>`
}

export function renderCutterLegend(svg: SVGSVGElement, spec: FlowwrapSpec, packName: string) {
  if (!spec.cutterLegend) return svg
  const entries=collectLegendKey(svg)
  const vb=svg.viewBox.baseVal
  const cutter=svg.querySelector('[data-cutter-width]')
  const sachet=spec.sachet?resolveSachetLayout(spec):null
  const cutterX=spec.paperStrip?24:sachet?sachet.margin:Number(cutter?.getAttribute('data-origin-x')??cutter?.getAttribute('data-cutter-origin-x')??vb.x)
  const cutterY=spec.paperStrip?24:sachet?sachet.originY:Number(cutter?.getAttribute('data-origin-y')??cutter?.getAttribute('data-cutter-origin-y')??vb.y)
  const steps=spec.paperStrip?.stepping?.stepCount??1
  const cutterWidth=spec.paperStrip?spec.width*steps+(spec.paperStrip.stepping?.gap??0)*(steps-1):sachet?sachet.contentWidth:Number(cutter?.getAttribute('data-cutter-width')??spec.width)
  const width=spec.cutterLegendOrientation==='landscape'?LANDSCAPE_LEGEND_WIDTH:LEGEND_WIDTH
  const height=(spec.cutterLegendOrientation==='landscape'?LANDSCAPE_LEGEND_HEIGHT:LEGEND_HEIGHT)+legendExtraHeight(entries,spec.cutterLegendOrientation==='landscape')+pouchLegendHeight(spec,spec.cutterLegendOrientation==='landscape')
  const scale=legendScale(spec)
  const position=spec.cutterLegendPosition ?? 'right'
  const cutterHeight=sachet?sachet.geometry.cutterRect.height:Number(cutter?.getAttribute('data-cutter-height')??spec.height)
  // Align to the cutter itself. The incoming viewBox includes annotations and margins.
  const x=position==='left'?Math.min(cutterX,vb.x)-width*scale-24:position==='right'?Math.max(cutterX+cutterWidth,vb.x+vb.width)+24:cutterX+(cutterWidth-width*scale)/2
  const y=position==='top'?Math.min(cutterY,vb.y)-height*scale-24:position==='bottom'?Math.max(cutterY+cutterHeight,vb.y+vb.height)+24:cutterY+(cutterHeight-height*scale)/2
  const wrapper=document.createElementNS('http://www.w3.org/2000/svg','g')
  wrapper.innerHTML=cutterLegendMarkup(spec,packName,x,y,entries)
  svg.append(...Array.from(wrapper.childNodes))
  svg.setAttribute('data-legend-left',String(x))
  svg.setAttribute('data-legend-top',String(y))
  svg.setAttribute('data-legend-right',String(x+width*scale))
  svg.setAttribute('data-legend-bottom',String(y+height*scale))
  const left=Math.min(vb.x,x-20),top=Math.min(vb.y,y-20),right=Math.max(vb.x+vb.width,x+width*scale+20),bottom=Math.max(vb.y+vb.height,y+height*scale+20)
  svg.setAttribute('viewBox',`${left} ${top} ${right-left} ${bottom-top}`)
  return svg
}
