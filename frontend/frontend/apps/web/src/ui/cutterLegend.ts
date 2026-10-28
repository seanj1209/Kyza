import type { FlowwrapSpec } from "../types/flowwrap"
import "./cutterLegend.css"

export function mountCutterLegend(host: HTMLElement, spec: FlowwrapSpec, onChange: (next: FlowwrapSpec) => void, onSettings: () => void) {
  const bar=document.createElement('div')
  bar.className='cutter-legend-bar'
  bar.setAttribute('aria-label','Legend controls')
  const button=document.createElement('button')
  button.type='button'
  button.className='cutter-legend-button'
  button.textContent='Legend'
  button.setAttribute('aria-pressed',String(!!spec.cutterLegend))
  button.title='Include an editable Klyro legend with this cutter and its export'
  button.addEventListener('click',()=>onChange({...spec,cutterLegend:!spec.cutterLegend}))
  const layoutButton=document.createElement('button')
  layoutButton.type='button'
  layoutButton.className='cutter-legend-layout'
  layoutButton.setAttribute('aria-label','Choose legend layout')
  layoutButton.setAttribute('aria-expanded','false')
  layoutButton.textContent='▾'
  const layoutTray=document.createElement('div')
  layoutTray.className='cutter-legend-layout-tray'
  layoutTray.hidden=true
  for(const orientation of ['portrait','landscape'] as const){
    const option=document.createElement('button')
    option.type='button'
    option.textContent=`${orientation[0].toUpperCase()}${orientation.slice(1)} legend`
    option.setAttribute('aria-pressed',String((spec.cutterLegendOrientation??'portrait')===orientation))
    option.addEventListener('click',()=>onChange({...spec,cutterLegend:true,cutterLegendOrientation:orientation}))
    layoutTray.append(option)
  }
  layoutButton.addEventListener('click',()=>{
    layoutTray.hidden=!layoutTray.hidden
    layoutButton.setAttribute('aria-expanded',String(!layoutTray.hidden))
  })
  const settings=document.createElement('button')
  settings.type='button';settings.className='cutter-legend-settings'
  settings.setAttribute('aria-label','Cutter preset and settings')
  settings.title='Cutter preset, technical colours and element appearance'
  settings.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 3-1 2 2 3-1 1-3 3-1 1-3-2-2 1-3-3-2-3 1-2-2Z"/><circle cx="12" cy="11" r="3"/></svg>'
  const tray=document.createElement('div');tray.className='cutter-legend-tray';tray.hidden=true
  const presetLabel=document.createElement('label');presetLabel.textContent='Cutter preset'
  const preset=document.createElement('select');preset.setAttribute('aria-label','Cutter preset')
  preset.innerHTML='<option value="default">Klyro default appearance</option><option value="custom">Custom appearance</option>'
  preset.value=spec.baseCustomisation || Object.keys(spec.elementAppearance??{}).length?'custom':'default'
  preset.addEventListener('change',()=>{
    if(preset.value==='default')onChange({...spec,baseCustomisation:undefined,elementAppearance:undefined})
    else onSettings()
  })
  presetLabel.append(preset)
  const customise=document.createElement('button');customise.type='button';customise.textContent='Adjust colours, lines and elements';customise.addEventListener('click',onSettings)
  tray.append(presetLabel,customise)
  settings.setAttribute('aria-expanded','false')
  settings.addEventListener('click',()=>{tray.hidden=!tray.hidden;settings.setAttribute('aria-expanded',String(!tray.hidden))})
  bar.append(button,layoutButton,settings,layoutTray,tray);host.append(bar)
  const svg=host.querySelector('svg'),legend=svg?.querySelector('#cutter_legend')
  const position=()=>{
    if(!legend || !bar.isConnected)return
    const rect=legend.getBoundingClientRect(),parent=host.getBoundingClientRect()
    bar.style.right='auto'
    bar.style.left=`${Math.max(8,Math.min(host.clientWidth-bar.offsetWidth-8,rect.left-parent.left))}px`
    bar.style.top=`${Math.max(8,rect.top-parent.top-bar.offsetHeight-8)}px`
  }
  const observer=new MutationObserver(position)
  if(svg)observer.observe(svg,{attributes:true,attributeFilter:['viewBox','style','transform']})
  const resize=new ResizeObserver(position);resize.observe(host)
  requestAnimationFrame(position)
  return ()=>{observer.disconnect();resize.disconnect();bar.remove()}
}
