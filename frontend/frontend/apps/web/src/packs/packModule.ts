import type { RenderOptions } from "../types/flowwrap"

export type PackValidationResult = {
  errors: string[]
  warnings?: string[]
}

export type PackModule<TSpec, TGeometry> = {
  id: string
  name: string
  version: number
  getDefaults: () => TSpec
  resolveGeometry: (spec: TSpec) => TGeometry
  validate: (spec: TSpec) => PackValidationResult
  render: (spec: TSpec, options?: RenderOptions) => SVGSVGElement
}
