import type { SelectionStore } from "../state/selectionStore"

/** Capture phase keeps Alt-pan from starting any element edit or changing selection. */
export function attachCanvasPan(svg:SVGSVGElement, store:SelectionStore, enabled:()=>boolean, apply:(dx:number,dy:number)=>void) {
  let drag:{id:number;x:number;y:number;matrix:DOMMatrix;temporary:boolean}|null=null
  let altHeld=false
  const keyDown=(event:KeyboardEvent)=>{
    if(event.key!=="Alt" || !(store.getState().selectionMode || svg.getAttribute("data-measure-enabled")==="true") || !svg.isConnected)return
    if(event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]'))return
    altHeld=true;svg.setAttribute("data-alt-pan-ready","true")
    if(!drag)svg.style.cursor="grab"
  }
  const keyUp=(event:KeyboardEvent)=>{
    if(event.key!=="Alt")return
    altHeld=false;svg.removeAttribute("data-alt-pan-ready")
    if(!drag)svg.style.cursor=enabled()?"grab":""
  }
  const down=(event:PointerEvent)=>{
    if (event.button!==0 || !svg.isConnected || (event.target instanceof Element && event.target.closest("[data-context-action]"))) return
    const temporary=(event.altKey || altHeld) && (store.getState().selectionMode || svg.getAttribute("data-measure-enabled")==="true")
    if (!enabled() && !temporary) return
    // Keep the mark as the double-click target so Pan can hand it to Select.
    if (!temporary && event.target instanceof Element && event.target.closest('[data-role="eye-mark"]')) return
    const matrix=svg.getScreenCTM()
    if (!matrix) return
    event.preventDefault();event.stopImmediatePropagation()
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,matrix:matrix.inverse(),temporary}
    svg.setAttribute("data-pan-enabled","true")
    svg.setAttribute("data-dragging","true")
    svg.style.cursor="grabbing"
    svg.setPointerCapture(event.pointerId)
  }
  const move=(event:PointerEvent)=>{
    if (!drag || event.pointerId!==drag.id) return
    event.preventDefault();event.stopImmediatePropagation()
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y,m=drag.matrix
    apply(-(m.a*dx+m.c*dy),-(m.b*dx+m.d*dy))
    drag.x=event.clientX;drag.y=event.clientY
  }
  const finish=()=>{
    if (!drag) return
    const id=drag.id;drag=null
    if (svg.hasPointerCapture(id)) svg.releasePointerCapture(id)
    svg.setAttribute("data-pan-enabled",enabled()?"true":"false")
    svg.setAttribute("data-dragging","false")
    svg.style.cursor=enabled()?"grab":""
    svg.dispatchEvent(new Event("canvasviewportchange"))
  }
  const up=(event:PointerEvent)=>{
    if (!drag || event.pointerId!==drag.id) return
    event.stopImmediatePropagation();finish()
  }
  const blur=()=>{altHeld=false;svg.removeAttribute("data-alt-pan-ready");finish();svg.style.cursor=enabled()?"grab":""}
  svg.addEventListener("pointerdown",down,true);svg.addEventListener("pointermove",move,true)
  window.addEventListener("pointerup",up,true);window.addEventListener("pointercancel",up,true);window.addEventListener("blur",blur)
  window.addEventListener("keydown",keyDown);window.addEventListener("keyup",keyUp)
  svg.addEventListener("lostpointercapture",finish)
  return {destroy(){blur();svg.removeEventListener("pointerdown",down,true);svg.removeEventListener("pointermove",move,true);window.removeEventListener("pointerup",up,true);window.removeEventListener("pointercancel",up,true);window.removeEventListener("blur",blur);window.removeEventListener("keydown",keyDown);window.removeEventListener("keyup",keyUp);svg.removeEventListener("lostpointercapture",finish)}}
}
