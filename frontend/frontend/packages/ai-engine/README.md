# AI Engine Scaffold

This is a pre-Gemini scaffold for Kyza.

## Current Scope
- Uses `MockAiProvider` only.
- Makes no real Gemini or Google AI Studio calls.
- Does not use API keys.
- Does not call external AI services.

## Purpose
- Convert plain-English pack requests into structured `PackGenerateRequest` / `EngineApiRequest` objects.
- Prepare future Gemini-compatible provider wiring behind the `AiProvider` interface.
- Keep execution separate from interpretation: the Engine API Bridge must execute the generated request.

## Hard Rules
- Gemini or any future AI provider should only convert prompts into structured requests.
- AI must not directly mutate cutter geometry.
- AI must not directly mutate artwork geometry.
- Engines remain the source of truth for geometry and validation.
- The Reference Index remains the source of truth for supported actions and capabilities.

## Future Work
- Add a real Gemini-backed provider implementing `AiProvider`.
- Load the full Reference Index in a server-safe way.
- Expand support beyond pack auto-generation only when the engines and bridge are ready.
