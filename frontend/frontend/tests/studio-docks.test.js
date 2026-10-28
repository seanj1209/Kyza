import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
const cache=new Map(),stored=new Map()
function load(file){file=resolve(file);if(!existsSync(file))file=file.slice(0,-3)+'/index.ts';if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},require:n=>load(resolve(dirname(file),n)+'.ts')});return exports}
const {updateGussetControl}=load('packages/cutter-engine/actions/gussetControls.ts')
const kseal=load('apps/web/src/packs/kSealPouchPack.ts').kSealPouchPack.getDefaults()
const doy=load('apps/web/src/packs/doyPouchPack.ts').doyPouchPack.getDefaults()
let next=updateGussetControl(kseal,'sync',true)
next=updateGussetControl(next,'armWidth',12)
for(const key of ['sideSeal','bottomSeal','armWidth'])assert.equal(next.kSealPouch[key],12)
assert.equal(next.width,480,'Synced bottom seals remain inside the entered K Seal gusset with trim off')
next=updateGussetControl(next,'sync',false)
next=updateGussetControl(next,'bottomSeal',15)
assert.equal(next.kSealPouch.sideSeal,12);assert.equal(next.kSealPouch.armWidth,12);assert.equal(next.kSealPouch.bottomSeal,15)
assert.equal(next.width,480,'Independent bottom-seal changes preserve the entered gusset and flat width')
for(const angle of [0,90])assert(updateGussetControl(kseal,'armDegree',angle).kSealPouch.armDegree>=30 && updateGussetControl(kseal,'armDegree',angle).kSealPouch.armDegree<=60)
assert.equal(updateGussetControl(kseal,'gussetSize',NaN),kseal)
const linked=updateGussetControl(doy,'gussetSize',40)
assert.equal(linked.doyPouch.panelWidths.center,80)
// AMENDS 6.2: fold guides sit on the 40 mm marks; the synced oval keeps one 7.5 mm bottom seal inside them.
assert(Math.abs(linked.doyPouch.ovalWidth-(40-7.5)/.375)<1e-9,'Synced oval keeps one bottom seal inside the 40 mm fold guide')
const {resolveDoyBounds}=load('apps/web/src/core/geometry/resolvers/doyBounds.ts')
const linkedBounds=resolveDoyBounds(linked,{originX:0,liveOriginX:linked.seals.left,liveWidth:linked.width-linked.seals.left-linked.seals.right,cutterWidth:linked.width})
assert(Math.abs((linkedBounds.ovalCenterX-linkedBounds.centerWidth/2)-linkedBounds.arcLeftX-40)<1e-9,'Synced arc side span follows the entered 40 mm half gusset')
// Sync-off construction stays bounded without a side-angle control.
const independent=updateGussetControl(updateGussetControl(doy,'sync',false),'gussetSize',40)
assert.equal(independent.doyPouch.gussetSync,false)
const bounds=resolveDoyBounds(independent,{originX:0,liveOriginX:independent.seals.left,liveWidth:independent.width-independent.seals.left-independent.seals.right,cutterWidth:independent.width})
assert(bounds.ovalWidth>=bounds.gussetWidth && bounds.ovalWidth<=independent.width,'Sync off keeps the oval within the available web')
const preferences=load('apps/web/src/klyro/account/studioNavigation.ts')
assert.equal(preferences.studioNavigationHref(),'/cutter?studio=home')
preferences.setStudioDestination('app');assert.equal(preferences.studioNavigationHref(),'/cutter?studio=resume')
preferences.setStudioDestination('studio');assert.equal(preferences.studioNavigationHref(),'/cutter?studio=home')
console.log('Gusset dock engine linking, independent values, bounded geometry, invalid input and persisted Studio navigation verified.')
