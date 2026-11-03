export const FONT_GROUPS = {
  Technical:["Inter","Roboto","IBM Plex Sans"], Modern:["Montserrat","Poppins","Outfit"],
  Premium:["Playfair Display","Libre Baskerville"], "Variable data":["Roboto Mono","IBM Plex Mono"]
}
const families = Object.values(FONT_GROUPS).flat()
type Glyphs = { units:number; ascender:number; descender:number; glyphs:Record<string,[number,string]> }
const data = new Map<string,string>(), metrics = new Map<string,Glyphs>(), pending = new Map<string,Promise<void>>()
export const isLibraryFont = (family: string) => families.includes(family)
export const fontAlias = (family:string) => family === "Arial" ? "Arial" : `KyzaStudio${families.indexOf(family)+1}`
const fontKey = (family:string,weight:number) => `${family}:${weight === 700 ? 700 : 400}`
const fontPath = (family:string,weight:number) => `/fonts/${family.toLowerCase().replaceAll(" ","")}/${weight === 700 ? 700 : 400}`
export async function ensureFont(family:string,weight:number) {
  if (!isLibraryFont(family)) throw new Error(`Font ${family} is not in the Kyza library.`)
  const key = fontKey(family,weight)
  if (data.has(key)) return
  if (!pending.has(key)) pending.set(key,(async()=>{
    const response = await fetch(fontPath(family,weight)+".woff2")
    if (!response.ok) throw new Error(`Unable to load ${family}. Please retry before exporting.`)
    const buffer = await response.arrayBuffer()
    const face = new FontFace(fontAlias(family), buffer, {weight:String(weight === 700 ? 700 : 400)})
    await face.load(); document.fonts.add(face)
    let binary = ""; new Uint8Array(buffer).forEach(byte=>{binary+=String.fromCharCode(byte)})
    data.set(key,btoa(binary))
    window.dispatchEvent(new Event("kyza:font-ready"))
  })().catch(error=>{pending.delete(key); throw error}))
  await pending.get(key)
}
export function requestFont(family:string,weight:number) {
  if (!isLibraryFont(family)) return
  void ensureFont(family,weight).catch(error=>window.dispatchEvent(new CustomEvent("kyza:font-error",{detail:String(error.message)})))
}
const managedText = (svg:SVGSVGElement) => [...svg.querySelectorAll<SVGTextElement>('text[data-font-family]')].filter(node=>isLibraryFont(node.getAttribute("data-font-family")!))
export function fontSvgStyle(svg:SVGSVGElement) {
  const used = new Set(managedText(svg).map(node=>fontKey(node.getAttribute("data-font-family")!,Number(node.getAttribute("font-weight")))))
  const rules = [...used].filter(key=>data.has(key)).map(key=>{
    const colon = key.lastIndexOf(":"), family = key.slice(0,colon), weight = key.slice(colon+1)
    return `@font-face{font-family:'${fontAlias(family)}';font-weight:${weight};src:url(data:font/woff2;base64,${data.get(key)}) format('woff2');}`
  }).join("\n")
  if (!rules) return null
  const style = document.createElementNS("http://www.w3.org/2000/svg","style")
  style.setAttribute("data-kyza-fonts","true"); style.textContent = rules; return style
}
export function embedReadyFonts(svg:SVGSVGElement) {
  svg.querySelectorAll('[data-kyza-fonts]').forEach(node=>node.remove())
  const style = fontSvgStyle(svg); if(style) svg.prepend(style)
}
/** Editable SVG embeds fonts. Illustrator SVG outlines managed text to prevent substitution. */
export async function prepareTypographySource<T extends SVGSVGElement|string|undefined>(source:T,outline:boolean):Promise<T> {
  if (!source || (typeof source === "string" && !source.includes("data-font-family"))) return source
  const svg = typeof source === "string" ? new DOMParser().parseFromString(source,"image/svg+xml").documentElement as unknown as SVGSVGElement : source.cloneNode(true) as SVGSVGElement
  if (svg.querySelector("[data-inline-text-editor]")) throw new Error("Finish the inline text edit before exporting.")
  const nodes = managedText(svg)
  await Promise.all(nodes.map(node=>ensureFont(node.getAttribute("data-font-family")!,Number(node.getAttribute("font-weight")))))
  embedReadyFonts(svg)
  // Resolve an explicit alphabetic baseline for portable text and outline geometry.
  for(const node of nodes) if(node.getAttribute("dominant-baseline") !== "alphabetic") {
    const ctx=document.createElement("canvas").getContext("2d")!
    ctx.font=`${node.getAttribute("font-weight")} ${node.getAttribute("font-size")}px "${fontAlias(node.getAttribute("data-font-family")!)}"`
    const m=ctx.measureText(node.textContent??"")
    node.setAttribute("y",String(Number(node.getAttribute("y"))+(m.fontBoundingBoxAscent-m.fontBoundingBoxDescent)/2))
    node.setAttribute("dominant-baseline","alphabetic")
  }
  if(outline) {
    const outlineFonts=[...new Map(nodes.map(node=>[fontKey(node.getAttribute("data-font-family")!,Number(node.getAttribute("font-weight"))),node])).values()]
    await Promise.all(outlineFonts.map(async node=>{
      const family = node.getAttribute("data-font-family")!, weight = Number(node.getAttribute("font-weight")), key = fontKey(family,weight)
      if (!metrics.has(key)) {
        const response = await fetch(fontPath(family,weight)+".json")
        if(!response.ok) throw new Error(`Unable to outline ${family}. Retry export.`)
        metrics.set(key,await response.json())
      }
    }))
    const mount=document.createElement("div")
    mount.style.cssText="position:fixed;left:-100000px;top:-100000px;visibility:hidden;pointer-events:none;width:1000px;height:1000px"
    document.body.appendChild(mount);mount.appendChild(svg)
    try {
      for(const node of nodes) {
        const family=node.getAttribute("data-font-family")!,weight=Number(node.getAttribute("font-weight")),font=metrics.get(fontKey(family,weight))!
        const chars=[...(node.textContent??"")],scale=Number(node.getAttribute("font-size"))/font.units
        const group=document.createElementNS(svg.namespaceURI,"g")
        for(const attr of [...node.attributes])if(!["x","y","font-family","font-size","font-weight","dominant-baseline","text-anchor"].includes(attr.name))group.setAttribute(attr.name,attr.value)
        group.setAttribute("aria-label",node.textContent??"");group.setAttribute("data-text-outlined","true")
        let characterIndex=0
        for(const character of chars) {
          const glyph=font.glyphs[String(character.codePointAt(0))]
          if(!glyph)throw new Error(`${family} does not contain “${character}”. Choose another font before export.`)
          const position=node.getStartPositionOfChar(characterIndex)
          const path=document.createElementNS(svg.namespaceURI,"path")
          path.setAttribute("d",glyph[1]);path.setAttribute("transform",`translate(${position.x} ${position.y}) scale(${scale} ${-scale})`)
          group.appendChild(path);characterIndex+=character.length
        }
        node.replaceWith(group)
      }
    } finally { svg.remove();mount.remove() }
    svg.querySelectorAll('[data-kyza-fonts]').forEach(node=>node.remove())
  }
  return (typeof source === "string" ? new XMLSerializer().serializeToString(svg) : svg) as T
}
