// These types are the contract between the UI, future AI-built screens,
// future backend/API routes, and the engines.
//
// The Reference Index documents the capabilities and expected payload shapes.
// The engines remain the source of truth for geometry, validation, and final decisions.
// These types do not implement behavior yet.

export type EngineName = "pack-generator" | "cutter" | "artwork"

export type ValidationMessage = {
  code: string
  message: string
  severity: "info" | "warning" | "error"
  path?: string
  meta?: Record<string, unknown>
}

export type ValidationReport = {
  valid: boolean
  messages: ValidationMessage[]
}

export type EngineWarning = {
  code: string
  message: string
  meta?: Record<string, unknown>
}

export type EngineError = {
  code: string
  message: string
  meta?: Record<string, unknown>
}

export type EngineApiRequest<
  TEngine extends EngineName = EngineName,
  TPayload = unknown,
  TState = unknown
> = {
  requestId: string
  engine: TEngine
  action: string
  payload: TPayload
  currentState?: TState
  projectId?: string
  meta?: Record<string, unknown>
}

export type EngineApiResponse<
  TEngine extends EngineName = EngineName,
  TOutput = unknown,
  TState = unknown
> = {
  success: boolean
  engine: TEngine
  action: string
  requestId?: string
  updatedState?: TState
  output?: TOutput
  warnings: EngineWarning[]
  errors: EngineError[]
  validationReport?: ValidationReport
}

export type PackGenerateRequest<TPayload = unknown, TState = unknown> =
  EngineApiRequest<"pack-generator", TPayload, TState>

export type CutterActionRequest<TPayload = unknown, TState = unknown> =
  EngineApiRequest<"cutter", TPayload, TState>

export type ArtworkActionRequest<TPayload = unknown, TState = unknown> =
  EngineApiRequest<"artwork", TPayload, TState>
