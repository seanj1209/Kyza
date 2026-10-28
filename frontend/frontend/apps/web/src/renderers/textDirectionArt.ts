const NS="http://www.w3.org/2000/svg"
/** Wrapped reading text only, scaled inside an existing selectable label rectangle. */
export function createTextDirectionArt(id:string,lane:number,x:number,y:number,width:number,height:number,rotation:number):SVGSVGElement {
  const art=document.createElementNS(NS,"svg")
  art.setAttribute("viewBox","0 0 100 52")
  art.setAttribute("data-role","text-direction-art");art.setAttribute("data-box-id",id);art.setAttribute("data-lane-index",String(lane))
  art.setAttribute("pointer-events","none");art.setAttribute("fill","#2eb774");art.setAttribute("opacity",".4")
  art.innerHTML='<text x="50" y="23" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="650" font-size="18">Text Reads</text><text x="50" y="44" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="650" font-size="18">This Way</text>'
  updateTextDirectionArt(art,x,y,width,height,rotation)
  return art
}
export function updateTextDirectionArt(art:SVGElement,x:number,y:number,width:number,height:number,rotation:number) {
  Object.entries({x,y,width,height}).forEach(([key,value])=>art.setAttribute(key,String(value)))
  if(rotation)art.setAttribute("transform",`rotate(${rotation} ${x+width/2} ${y+height/2})`)
  else art.removeAttribute("transform")
}
