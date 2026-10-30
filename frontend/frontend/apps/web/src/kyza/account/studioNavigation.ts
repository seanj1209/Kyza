export type StudioDestination = "studio" | "app"
const KEY="kyza.studioDestination"
export function getStudioDestination():StudioDestination {
  try{return localStorage.getItem(KEY)==="app"?"app":"studio"}catch{return "studio"}
}
export function setStudioDestination(value:StudioDestination){
  try{localStorage.setItem(KEY,value);return true}catch{return false}
}
export function studioNavigationHref(){return getStudioDestination()==="app"?"/cutter?studio=resume":"/cutter?studio=home"}
