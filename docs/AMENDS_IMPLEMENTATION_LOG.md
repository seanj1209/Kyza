# Amends implementation log

This log records implementation, merge and Airtable update status for the V5 amendment sequence.

## V5, V5.1 and V5.2

- Status: merged into `main` through [PR #40](https://github.com/seanj1209/ArtworkSandbox/pull/40) on 23 October 2026 (merge commit `2f6a2e9bc52100f908c7212cd16b5a4bd37c30c0`).
- Scope: Studio and legend adjustments, K Seal and DOY gusset geometry, opening and hanger behaviour, and V5.1 rollback of the DOY bottom-seal guide, as recorded in PR #40.
- Airtable: matching roadmap actions updated with merge and test evidence on 23 October 2026; broader QA statuses remain open.

## V5.3

- Source: `Amends V5.3#.pdf` supplied 23 October 2026.
- Status: merged into `main` through [PR #41](https://github.com/seanj1209/ArtworkSandbox/pull/41) on 23 October 2026 (merge commit `1a8e2931efc935344f6bf02955e3aa5cbddb90a0`).
- Scope: Pouch Spec legend section; 80 mm K Seal gusset measure; aligned K Seal arms and centre apex fold clearance; DOY two-eyemark trim rule; joined seal fill and simplified fold guides; DOY gusset-size-driven matching angles when Sync is active.
- Airtable: matching roadmap actions updated with merge and test evidence on 23 October 2026.

## V5.4

- Source: `Amends V5.4#.pdf` supplied 23 October 2026.
- Status: merged into `main` through [PR #41](https://github.com/seanj1209/ArtworkSandbox/pull/41) on 23 October 2026 (merge commit `1a8e2931efc935344f6bf02955e3aa5cbddb90a0`).
- DOY seal fill: top, side/gusset and bottom seal areas use one green fill and shared opacity, so overlapping areas read as one continuous section.
- DOY gusset: the entered Gusset value now measures the clear span on each side of the fold. The bottom seal allowance remains outside that span. At Gusset 40 mm with 7.5 mm bottom seals, the widest oval cross-section reads side arc, 7.5 mm, 7.5 mm, 40 mm, 40 mm, 7.5 mm, 7.5 mm, side arc.
- The stored centre footprint, drawing width, oval/arc syncing and eyemark/cutout zones now follow that definition. Existing DOY project data may need a compatibility review because a stored centre width from an older version can represent the prior, narrower interpretation.
- Verification: full 28-part verification suite and 23 focused browser checks passed.
- Airtable: evidence added to KYZA-0801, KYZA-2304, KYZA-1007, KYZA-2517 and KYZA-2521 on 23 October 2026. Their existing QA and engineering status was retained.
