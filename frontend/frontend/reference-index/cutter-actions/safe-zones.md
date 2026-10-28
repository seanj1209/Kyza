# Safe Zones

- Engine owners: `cutter-engine` for geometry, `artwork-engine` for artwork preflight

## Current Actions
- Add safe zones
- Remove safe zones
- Resize/reposition safe zones
- Use safe zones as artwork-preflight boundaries

## Current Known Rules
- Safe zones must remain inside the live area.
- Safe zones must respect engine validation and clearance rules.
- Artwork preflight uses safe zones when active and falls back to distance rules otherwise.

## Hard Rules
- UI must not duplicate safe-zone validation rules.
- Engines remain the source of truth for allowable bounds.
