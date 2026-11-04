import type { FlowwrapSpec } from "../types/flowwrap"
import { getPackModule } from "../packs"
import { KYZA_JSON_EXPORT_SCHEMA_VERSION } from "../../../../packages/cutter-engine/export/jsonExport"

export type ImportedCutterExport = {
  packId: string
  name: string
  spec: FlowwrapSpec
  viewMode?: "normal" | "pre-slit"
}

/** Read the JSON produced by Save / Export without trusting arbitrary file contents. */
export function parseCutterExport(text: string): ImportedCutterExport | null {
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error("Imported cutter file is not valid JSON.") }
  if (!value || typeof value !== "object") return null
  const payload = value as Record<string, unknown>
  if (payload.schemaVersion !== KYZA_JSON_EXPORT_SCHEMA_VERSION) return null
  const cutter = payload.cutterSpecification as Record<string, unknown> | undefined
  const project = payload.project as Record<string, unknown> | undefined
  const packId = cutter?.packTypeId
  const spec = cutter?.starterSpecification as FlowwrapSpec | undefined
  if (typeof packId !== "string" || !getPackModule(packId) || !spec ||
      !Number.isFinite(spec.width) || spec.width <= 0 ||
      !Number.isFinite(spec.height) || spec.height <= 0) {
    throw new Error("This Kyza export does not contain a valid supported cutter.")
  }
  const viewMode = cutter?.viewMode === "pre-slit" ? "pre-slit" : "normal"
  return {
    packId,
    name: typeof project?.name === "string" && project.name.trim() ? project.name.trim() : "Imported Cutter",
    spec: JSON.parse(JSON.stringify(spec)) as FlowwrapSpec,
    ...(packId === "paper-strip" ? { viewMode } : {})
  }
}
