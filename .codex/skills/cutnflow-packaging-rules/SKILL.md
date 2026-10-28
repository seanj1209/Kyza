---
name: cutnflow-packaging-rules
description: Use for CutnFlow flexo cutter-guide domain decisions covering seals, safe zones, gussets, zippers, tear notches, die-cuts, print-practical constraints, rule extraction, new pack-type design, and modular packaging-rule boundaries.
---

# Domain Assumptions
- Treat cutter guides as deterministic and parameter-driven.
- Prefer mm internally unless the file already uses inches.

# Guidance
- Keep important elements out of seal, zipper, and tear-notch zones where applicable.
- Keep rules modular and config-driven.
- Avoid hardcoding packaging rules inside pack modules.
- Keep geometry limited to shape math only.
- Keep rules limited to constraints and placement only.
- Keep rendering limited to SVG output only.

# Apply This Skill For
- Extract zipper, gusset, and die-cut logic into shared modules.
- Design new pack types such as DOY, K-seal, sachet, flowwrap, and pillow.
- Add new rule sets without modifying core geometry.
