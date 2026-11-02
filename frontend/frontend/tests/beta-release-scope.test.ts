import {
  BETA_PACK_IDS, betaProjectRestriction,
} from "../packages/shared/releaseScope"
import { getPackModule, packModules } from "../apps/web/src/packs"
import {
  projectFromLegacySpec, parseKyzaProject, importKyzaProjectJson,
  loadKyzaProject, saveKyzaProject, KYZA_PROJECT_STORAGE_KEY,
} from "../packages/cutter-engine/project"
import { generatePackGenRecommendations } from "../packages/ai-engine/pack-spec/packGenService"
import { runEngineRequest } from "../packages/engine-api/runEngineRequest"
import { prepareProjectExport } from "../packages/cutter-engine/export/projectExportService"
import { authorizeProjectExport } from "../packages/cutter-engine/export/preExportValidation"
import { buildKyzaJsonExport } from "../packages/cutter-engine/export/jsonExport"
import { createExportPackageDraft } from "../packages/cutter-engine/export/exportPackage"
import { cutterUrlRestriction, createPresentationStorage } from "../apps/web/src/kyza/betaUiGuards"

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}
class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}
assert(packModules.length === 7, "Only seven pack constructions may be offered")
for (const packId of BETA_PACK_IDS) {
  const module = getPackModule(packId)
  assert(module, `${packId} must be available`)
  const project = projectFromLegacySpec(packId, `Beta ${packId}`, module.getDefaults())
  assert(!betaProjectRestriction(project), `${packId} default project must remain usable`)
  const storage = new MemoryStorage()
  assert(saveKyzaProject(project, storage).ok, `${packId} must save`)
  assert(loadKyzaProject(project.id, storage).ok, `${packId} must reopen`)
  assert(importKyzaProjectJson(JSON.stringify(project), new MemoryStorage()).ok, `${packId} must import`)
  const validation = { valid: true, messages: [], projectId: project.id, revision: String(project.revision) }
  const envelope = buildKyzaJsonExport({ project, validation, exportPackage: createExportPackageDraft({ source: "save_export", project, validation }) })
  const imported = importKyzaProjectJson(JSON.stringify(envelope), new MemoryStorage())
  assert(imported.ok, "Save/Export JSON must be re-importable")
  assert(JSON.stringify(imported.value.cutter.legacySpec) === JSON.stringify(project.cutter.legacySpec), "JSON backup must retain complete geometry")
}
const base = projectFromLegacySpec("flowwrap", "Valid beta project", getPackModule("flowwrap")!.getDefaults())
for (const disabled of ["lidding", "lidding-film", "plain-film", "plain-web", "2-side-seal-pouch", "3-side-seal-pouch", "sandbox", "unknown"]) {
  assert(!getPackModule(disabled), `${disabled} must not resolve via the registry`)
  const forbidden = { ...base, id: `old-${disabled}`, cutter: { ...base.cutter, packType: disabled } }
  assert(!parseKyzaProject(forbidden).ok, `${disabled} must fail project admission`)
  const storage = new MemoryStorage()
  const raw = JSON.stringify([forbidden])
  storage.setItem(KYZA_PROJECT_STORAGE_KEY, raw)
  assert(!loadKyzaProject(forbidden.id, storage).ok, `${disabled} must not reopen`)
  assert(storage.getItem(KYZA_PROJECT_STORAGE_KEY) === raw, "Blocked saved project must not be rewritten")
  assert(!importKyzaProjectJson(JSON.stringify(forbidden), storage).ok, `${disabled} must not import`)
  assert(!importKyzaProjectJson(JSON.stringify({ schemaVersion: "kyza-json-export-1", projectDocument: forbidden }), storage).ok, "Export envelopes must not bypass restrictions")
  assert(storage.getItem(KYZA_PROJECT_STORAGE_KEY) === raw, "Rejected import must not change storage")
  assert(saveKyzaProject(base, storage).ok, "A valid project can save alongside blocked work")
  assert(JSON.parse(storage.getItem(KYZA_PROJECT_STORAGE_KEY)!)[0].cutter.packType === disabled, "Saving another project must retain blocked raw records")
  const generated = runEngineRequest({ engine: "pack-generator", action: "generatePack", requestId: "scope", payload: { packId: disabled } })
  assert(!generated.success, `${disabled} engine generation must be rejected`)
  const exported = prepareProjectExport({ project: forbidden, request: { format: "json" }, validationRun: {} as never })
  assert(exported.ok === false && exported.code === "beta_scope_restricted", "Direct export must reject disabled work before validation")
  const authorized = authorizeProjectExport({ project: forbidden, exportFormat: "svg", validationRun: {} as never })
  assert(authorized.ok === false && authorized.code === "beta_scope_restricted", "Low-level export must reject disabled work too")
}
for (const query of ["studio=sandbox", "packId=lidding", "pack=plain-web", "studio=home&studio=sandbox", "packId=flowwrap&packId=plain-film"]) {
  assert(cutterUrlRestriction(new URLSearchParams(query)), "Direct or duplicate URL values must not unlock excluded work")
}
assert(!cutterUrlRestriction(new URLSearchParams("studio=home&packId=flowwrap")), "Allowed URL must remain usable")
const rawStorage = new MemoryStorage()
rawStorage.setItem("draft", "original")
createPresentationStorage(rawStorage).setItem("draft", "migrated")
assert(rawStorage.getItem("draft") === "original", "Displaying projects must not rewrite originals")
for (const property of ["lidding", "sideSealPouch", "plainWeb", "sandbox", "customPackDefinition"]) {
  const disguised = { ...base, cutter: { ...base.cutter, legacySpec: { ...base.cutter.legacySpec, [property]: {} } } }
  assert(!parseKyzaProject(disguised).ok, "Changing a pack ID must not admit unsupported geometry")
}
for (const prompt of ["Create a 250g SUP", "nuts", "flowwrap", "sauce sachet", "lidding film", "plain web"]) {
  const result = generatePackGenRecommendations(prompt)
  assert(result.recommendations.every(item => (BETA_PACK_IDS as readonly string[]).includes(item.packType)), "Flow must only recommend beta constructions")
  if (["lidding film", "plain web"].includes(prompt)) assert(!result.ok, "Unsupported request must explain unavailability")
}
assert(!runEngineRequest({ engine: "artwork", action: "generate", requestId: "scope", payload: {} }).success, "Artwork engine must remain disabled")
console.log("Beta release scope: seven packs, saved work, imports, guidance, engines and export guards passed.")
