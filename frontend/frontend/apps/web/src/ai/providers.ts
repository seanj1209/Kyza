import type {
  ApplyPipelineInput,
  DesignIntent,
  DesignLayerSpec
} from "./types"

export type AIProviderCapability =
  | "intent-normalization"
  | "layer-planning"
  | "palette-refinement"

export type AIProviderRequest = Readonly<{
  intent: DesignIntent
  pipelineInput: ApplyPipelineInput
}>

export type AIProviderResponse = Readonly<{
  plannedLayers: readonly DesignLayerSpec[]
  warnings?: readonly string[]
}>

export interface AIProvider {
  id: string
  label: string
  capabilities: readonly AIProviderCapability[]
  planDesign(request: AIProviderRequest): Promise<AIProviderResponse>
}

export type AIProviderRegistry = Readonly<{
  providers: readonly AIProvider[]
}>
