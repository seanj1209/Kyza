# DOY Pouch

- Engine owner: `pack-generator`
- Current pack id: `doy-pouch`
- Current module name: `DOY Pouch`

## What It Owns
- DOY pouch defaults
- DOY panel widths and gusset-related pouch geometry
- Pack composition and validation

## UI Allowed To Do
- Ask for defaults
- Submit a structured spec for generation/validation
- Render returned geometry and warnings

## UI Must Not Do
- Recalculate DOY geometry rules on its own
- Override final validation decisions

## Current Known Validation/Hard Rules
- Base dimensions must remain valid
- Seal and live-area math must remain valid
- Safe zones, eyemarks, attribute boxes, and holes are validated by the engines

## Suggested API Flow
- Request: `pack-generator / generate-pack`
- Response: updated structured pack state plus validation
