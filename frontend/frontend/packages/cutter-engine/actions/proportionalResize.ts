type Bounds={x:number;y:number;width:number;height:number}
/** One scale factor preserves aspect ratio; the opposite corner/edge stays anchored. */
export function proportionalResize(origin:Bounds,requested:Bounds,handle="",minSize=1,maxWidth=Infinity,maxHeight=Infinity):Bounds {
  const sx=requested.width/origin.width,sy=requested.height/origin.height
  const vertical=handle==="top" || handle==="bottom",horizontal=handle==="left" || handle==="right"
  const desired=vertical?sy:horizontal?sx:Math.abs(sx-1)>=Math.abs(sy-1)?sx:sy
  const scale=Math.min(maxWidth/origin.width,maxHeight/origin.height,Math.max(minSize/origin.width,minSize/origin.height,desired))
  const width=origin.width*scale,height=origin.height*scale
  const west=handle==="left" || handle.includes("w"),north=handle==="top" || handle.includes("n")
  return {width,height,x:vertical?origin.x+(origin.width-width)/2:west?origin.x+origin.width-width:origin.x,
    y:horizontal?origin.y+(origin.height-height)/2:north?origin.y+origin.height-height:origin.y}
}
