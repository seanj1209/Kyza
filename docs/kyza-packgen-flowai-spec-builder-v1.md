# FlowAI Pack Gen / Spec Builder v1

FlowAI Pack Gen v1 is a flexible, deterministic pre-Studio spec builder. It accepts one free-text description and does not require structured size, film, machine, weight, pack-type or technical fields.

## Input model

Users can provide as little or as much information as they have, for example:

- `bag for nuts`
- `XL bag Brazil nuts 1kg`
- `flow wrap protein bar 60g`
- `doy pouch for granola 500g`
- `lidding film for chicken tray`
- `plain web 420mm wide`
- `pillow pack salad 350 x 220`
- `500g frozen prawns reverse print OPP/PE`
- `20g Sauce Packet`
- `ketchup sachet 10g`
- `powder sachet 30g`

The extractor looks for product category, weight, pack hints, size words, millimetre dimensions, substrate/print hints, machine terms and storage terms. Weight is normalized to grams and supplied dimensions are treated as millimetres.

No external AI provider or API is used. The current provider adapter calls the same local deterministic recommendation service.

## Confidence and recommendations

Results vary with the supplied detail:

- vague prompts produce low-confidence generic starting points, multiple alternatives, assumptions and questions;
- detailed prompts produce a stronger primary recommendation with higher confidence and fewer questions;
- technical values supplied in the prompt are preserved as extracted hints and explicit dimensions override estimated size bands.

Recommendations are starting estimates, not guaranteed production sizes or production approval. Construction values such as seals, bleed and eyemarks are read from the existing pack-module defaults. The FlowAI UI does not recreate geometry or validation rules.

## Product-intent suitability scoring

Pack Gen ranks candidate pack types instead of showing the same default cards for every prompt. Each candidate receives positive reasons and penalties based on:

- explicit pack words such as `sachet`, `packet`, `flow wrap` or `lidding film`;
- product category;
- fill weight or supplied volume;
- small, portion, large or XL intent;
- liquid/viscous, powder/dry, frozen or solid behaviour;
- known suitability of the registered pack type;
- web, reel, tray, cup, pot and tooling wording.

The score determines ordering, but does not bypass engine defaults or validation. Fallback cards receive low confidence and explicit fallback wording. An unregistered recommendation is marked `Coming Soon - Not Yet Buildable`; it cannot create a Cutter Studio project.

Every recommendation carries one buildability state:

- `buildable` — registered primary that can open in Cutter Studio;
- `recommended-not-buildable-yet` — relevant primary that is not registered yet;
- `fallback-buildable` — real registered alternative, clearly presented as a fallback;
- `unsupported` — no direct creation action.

Buildability contributes modestly to suitability scoring, but it does not hide a better unsupported production route. For example, explicit lidding intent remains the primary recommendation while the current Plain Web route is labelled as a lower-confidence buildable fallback.

## Benchmark-driven quality

Pack Gen v1.1 includes a repeatable benchmark matrix covering 34 realistic sachet, snack, flowwrap, pillow, pouch, lidding, Plain Web and vague prompts. Each case can specify expected top pack types, acceptable fallbacks, rejected primaries, extracted category/weight/size, confidence, dimensions, option count and buildability.

The benchmark runner reports failures by prompt, for example: `Prompt '20g Sauce Packet' expected sachet first, but got 'pillow-pack'.` Buildable benchmark primaries are also converted into the current project contract and structurally validated, so a recommendation cannot pass merely because its label looks correct.

To add a prompt case:

1. Add a typed entry to `tests/fixtures/packgen-benchmark-fixtures.ts`.
2. State the acceptable top and fallback pack IDs narrowly.
3. Add extraction, confidence, dimension or buildability expectations where known.
4. Run `npm run test:packgen-benchmark` and review any prompt-specific failure before changing scoring.

Vague prompts deliberately retain several low-confidence options and confirmation questions. Detailed prompts accumulate explicit pack, product, weight, size and production signals, producing a stronger score and higher confidence.

## Sachet and packet prompts

Terms including `sachet`, `packet`, `single serve`, `portion pack`, `sauce packet`, `condiment packet`, `ketchup sachet`, `mayo sachet`, `powder sachet` and `sample sachet` strongly favour the registered 3-side-seal and 4-side-seal sachet packs.

For `20g Sauce Packet`, Pack Gen detects:

- sauce/condiment product intent;
- liquid or viscous food-product format;
- 20g fill weight;
- sachet/packet construction intent;
- a small portion size class.

It ranks the registered 3-side-seal sachet first, followed by the 4-side-seal sachet. The cautious starting estimate is approximately `70 × 90mm`, subject to product, viscosity, machine, tooling, seals and tear-notch review. Pillow Pack, DOY Pouch and Plain Web are not presented as equal medium-confidence defaults.

Current portion bands are deliberately cautious starting points:

- 5–15g sauce/condiment: approximately 60 × 70mm;
- 15–30g sauce/condiment: approximately 70 × 90mm;
- 30–50g sauce/condiment: approximately 80 × 110mm;
- powder and personal-care samples use a separate sachet band.

Explicit dimensions still override these estimates. These values are not final production tool specifications.

Only empty prompts, impossible explicit dimensions and unsupported/unsafe values are rejected. A vague prompt such as `bag` still returns selectable starting options.

## Review step

Each recommendation card shows:

- the raw prompt and extracted signals;
- recommended pack type and starting dimensions;
- seal, bleed and eyemark defaults;
- substrate suggestion;
- confidence;
- assumptions, questions and warnings;
- `Create in Cutter Studio`.

When several pack constructions are plausible, the user chooses among multiple cards.

### Condensed recommendation cards

Recommendation cards are condensed by default so options remain easy to compare. The visible summary contains option/title, Best Match status, confidence, buildability, pack type, starting size, seals, bleed, eyemarks, substrate status and suggested export tier.

Deeper analysis is collapsed into native expandable sections:

- `Why this recommendation?` — ranking reasons and penalties;
- `Assumptions`;
- `Questions to confirm`;
- `Technical details` — parsed signals, score, fallback and keywords;
- `Warnings`.

Sections with no content are omitted. Hiding this material initially keeps card height controlled without discarding the reasoning needed for technical review.

Cards are selectable. One selected-card action controls the Cutter Studio handoff: buildable and fallback-buildable cards enable creation, while unsupported or not-yet-buildable selections show a disabled status. The top-ranked card carries a restrained `Best match` badge; fallbacks use distinct wording and styling.

## Cutter Studio handoff

Selecting a recommendation:

1. starts from the chosen engine-owned pack defaults;
2. converts the recommendation to the current editable spec model;
3. creates a `KyzaProjectV1` through the Phase 1 project contract;
4. synchronizes it through the Phase 2 project boundary;
5. preserves the generated Phase 3 cutter element identity map;
6. runs Phase 4 structured validation;
7. stages the validated active cutter state and opens Cutter Studio.

FlowAI does not edit a live Cutter Studio canvas from free text. After handoff, the starting spec is edited through the normal Cutter Studio controls.

## v1 boundaries

- No external AI or API calls.
- No live prompt-to-geometry mutation.
- No upload parsing.
- No FlowwrapSpec rewrite.
- No Cutter Studio shell or export changes.
- Lidding prompts can be recognized, but v1 does not claim to interpret Multivac tooling or lidding production specifications.

## Future Pack Gen v2

- tooling specification upload;
- Multivac/lidding specifications;
- MD/TD direction;
- web width and repeat length;
- machine limits;
- reel and unwind direction.

## Future Artwork/Repro v2

- product specification upload;
- ingredients, nutrition and allergens;
- barcode and legal copy;
- artwork metadata.
