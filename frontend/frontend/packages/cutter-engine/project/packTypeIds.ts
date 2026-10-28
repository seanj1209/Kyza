export type FlowWrapPackTypeId = "flow_wrap"
export type FlowWrapEnginePackTypeId = "flowwrap"

export const FLOW_WRAP_PACK_TYPE_IDS = {
  packSpecification: "flow_wrap",
  engine: "flowwrap",
} as const satisfies {
  packSpecification: FlowWrapPackTypeId
  engine: FlowWrapEnginePackTypeId
}

export const toPackSpecificationPackTypeId = (enginePackTypeId: string): string =>
  enginePackTypeId === FLOW_WRAP_PACK_TYPE_IDS.engine
    ? FLOW_WRAP_PACK_TYPE_IDS.packSpecification
    : enginePackTypeId

export const toEnginePackTypeId = (packTypeId: string): string =>
  packTypeId === FLOW_WRAP_PACK_TYPE_IDS.packSpecification
    ? FLOW_WRAP_PACK_TYPE_IDS.engine
    : packTypeId
