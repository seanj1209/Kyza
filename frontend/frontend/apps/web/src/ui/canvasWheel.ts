/** Coalesce high-frequency wheel input without changing saved geometry. */
export function attachCanvasWheel(svg:SVGSVGElement,zoom:(delta:number,x:number,y:number)=>void,resize:(direction:number)=>boolean) {
  let frame=0,delta=0,x=0,y=0
  const wheel=(event:WheelEvent)=>{
    if(event.deltaY===0)return
    if(event.altKey && resize(event.deltaY>0?-2:2)){event.preventDefault();return}
    event.preventDefault()
    const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?svg.clientHeight:1)
    delta+=pixels;x=event.clientX;y=event.clientY
    if(!frame)frame=requestAnimationFrame(()=>{
      frame=0;const amount=delta;delta=0
      if(svg.isConnected && amount!==0)zoom(amount,x,y)
    })
  }
  svg.addEventListener("wheel",wheel,{passive:false})
  return {destroy(){cancelAnimationFrame(frame);frame=0;delta=0;svg.removeEventListener("wheel",wheel)}}
}
