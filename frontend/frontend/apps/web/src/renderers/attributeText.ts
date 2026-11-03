import type { AttributeBoxSpec, ElementTextStyle } from "../types/flowwrap"
import { bounded, hexColour } from "./objectAppearance"
import { requestFont, fontAlias } from "../typography/fontLibrary"

export const MM_PER_PT = 25.4 / 72
export function textBaseline(centreY:number,size:number,family:string,weight:number) {
  const ctx=document.createElement("canvas").getContext("2d")!
  ctx.font=`${weight} ${size}px "${fontAlias(family)}"`
  const metrics=ctx.measureText("Hg")
  return centreY+(metrics.fontBoundingBoxAscent-metrics.fontBoundingBoxDescent)/2
}
export function textKeys(box: AttributeBoxSpec): string[] {
  return box.kind === "bbe" ? ["heading", "date"] : box.kind === "qr" || box.kind === "barcode" ? ["caption"] : box.kind === "label" && box.labelKey !== "text-direction" ? ["label"] : []
}
export function textReference(box: AttributeBoxSpec) {
  const content = box.kind === "label" ? (box.label ?? box.labelKey ?? "LABEL") : box.kind === "barcode" ? "BARCODE" : box.kind === "qr" ? "QR" : "BBE"
  return box.textReference ?? { width:box.width, height:box.height, fontSize:Math.max(2,Math.min(Math.max(3,Math.min(10,box.height*.6)),box.width/Math.max(1,content.length*.6))) }
}
export function resolveText(box: AttributeBoxSpec, key: string) {
  const style: ElementTextStyle = box.texts?.[key] ?? {}
  const reference = textReference(box)
  const scale = Math.min(box.width / Math.max(.1,reference.width), box.height / Math.max(.1,reference.height))
  const custom = box.labelKey === "custom"
  const defaultText = key === "date" ? "DD/MM/YYYY" : box.kind === "label" ? (box.label ?? box.labelKey ?? "LABEL") : box.kind === "barcode" ? "BARCODE" : box.kind === "qr" ? "QR" : "BBE"
  const dateVisible = box.texts?.date?.visible === true
  const autoSize = key === "date" ? reference.fontSize * .55 : reference.fontSize
  return {
    content: style.content ?? (custom ? defaultText : defaultText.toUpperCase()),
    visible: style.visible ?? key !== "date",
    family: style.fontFamily ?? (custom ? "Inter" : "Arial"), weight: style.fontWeight === 700 ? 700 : 400,
    size: style.sizeMode === "fixed" ? bounded(style.fontSizePt,12,1,300)*MM_PER_PT : autoSize*scale,
    color:hexColour(style.color,box.kind === "label" ? "#2eb774" : "#1a2a49"),
    opacity:bounded(style.opacity,1,0,1), align:style.align ?? "centre",
    x:bounded(style.x,50,-200,300), y:bounded(style.y,key === "date" ? 72 : dateVisible ? 32 : 50,-200,300),
    fixed:style.sizeMode === "fixed",
  }
}
export function renderAttributeText(layer: SVGGElement, box: AttributeBoxSpec, x: number, y: number, height: number, lane: number, visible: boolean, edit: boolean) {
  const ns = "http://www.w3.org/2000/svg"
  for (const key of textKeys(box)) {
    const value = resolveText(box,key)
    if (!value.visible) continue
    const node = document.createElementNS(ns,"text")
    const centreY=y+height*value.y/100
    node.setAttribute("x",String(x + box.width*value.x/100)); node.setAttribute("y",String(box.texts ? textBaseline(centreY,value.size,value.family,value.weight) : centreY))
    node.setAttribute("data-text-centre-y",String(centreY))
    node.setAttribute("font-family",value.family === "Arial" ? "Arial,sans-serif" : fontAlias(value.family))
    node.setAttribute("font-kerning","none"); node.setAttribute("font-variant-ligatures","none");
    node.setAttribute("font-weight",String(value.weight)); node.setAttribute("font-size",String(value.size))
    node.setAttribute("fill",value.color); node.setAttribute("opacity",String(value.opacity))
    node.setAttribute("text-anchor",({left:"start",centre:"middle",right:"end"})[value.align]); node.setAttribute("dominant-baseline",box.texts ? "alphabetic" : "middle")
    node.setAttribute("data-box-id",box.id); node.setAttribute("data-text-key",key); node.setAttribute("data-lane-index",String(lane))
    node.setAttribute("data-role","attribute-box-label"); node.setAttribute("data-font-family",value.family)
    node.setAttribute("pointer-events", edit ? "all" : "none"); node.style.cursor = edit ? "text" : "default"
    node.setAttribute("display",visible ? "inline" : "none")
    if (box.rotation) node.setAttribute("transform",`rotate(${box.rotation} ${x+box.width/2} ${y+height/2})`)
    node.textContent = value.content
    if (value.family !== "Arial") requestFont(value.family,value.weight)
    layer.appendChild(node)
  }
}
