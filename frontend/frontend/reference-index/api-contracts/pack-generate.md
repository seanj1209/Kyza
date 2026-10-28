# Pack Generate Contract

## Engine
- `pack-generator`

## Typical Action Names
- `generate-pack`
- `validate-pack`
- `get-default-pack`

## Request Shape
See `PackGenerateRequest` in `packages/shared/engine-api/types.ts`.

```ts
{
  requestId: string
  engine: "pack-generator"
  action: string
  payload: unknown
  currentState?: unknown
  projectId?: string
  meta?: Record<string, unknown>
}
```

## Response Shape
See `EngineApiResponse` and `ValidationReport`.

## Notes
- Future AI prompt interpretation should produce structured payloads before calling this contract.
- Final geometry and validation still happen inside the engines.
