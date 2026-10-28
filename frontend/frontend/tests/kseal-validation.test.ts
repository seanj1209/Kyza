import { createPackValidator } from "../apps/web/src/engines/validation-engine"
import { resolveKSealLayout } from "../apps/web/src/core/geometry/resolvers/resolveKSealLayout"
import { createKSealDefaults } from "../apps/web/src/core/model/parameterSchema"
import {
  buildKSealEyeMarkRects,
  resolveKSealDimensionSemantics,
  resolveKSealPouchGeometry
} from "../apps/web/src/geometry/kSealPouchGeometry"
import { fitKSealSubMeasureLabel } from "../apps/web/src/renderers/kSealPouchSvg"
import {
  clampKSealTacHole,
  getKSealTacBaseWidth,
  getKSealTacCentreX,
  getKSealTacCentreY,
  getKSealTacMovementBounds,
  getKSealTacTolerance
} from "../apps/web/src/rules/kSealTacHoleRules"
import { createKSealEyemarkDefaults } from "../apps/web/src/rules/kSealEyemarkRules"
import {
  applyCutterValidationFix
} from "../packages/cutter-engine/actions/validationFixes"
import {
  cloneValidKSealFixture,
  INVALID_KSEAL_FIXTURES,
  VALID_KSEAL_FIXTURES
} from "./kseal-validation-fixtures"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

const validate = createPackValidator("k-seal-pouch")

VALID_KSEAL_FIXTURES.forEach(fixture => {
  const result = validate(fixture.spec)
  assert(
    result.errors.length === 0,
    `Expected fixture "${fixture.name}" to be valid, got: ${result.errors.join("; ")}`
  )
})

INVALID_KSEAL_FIXTURES.forEach(fixture => {
  const result = validate(fixture.spec)
  assert(
    result.errors.some(error => error.includes(fixture.expectedError)),
    `Expected fixture "${fixture.name}" to contain error "${fixture.expectedError}", got: ${result.errors.join("; ")}`
  )
})

const baseKSeal = cloneValidKSealFixture("base-default")
const baseGeometry = resolveKSealPouchGeometry(baseKSeal)
const expectedRenderedWidth =
  baseGeometry.pouchHeight * 2 +
  baseGeometry.gussetSize * 2 +
  (baseGeometry.trimEnabled ? baseGeometry.trim * 2 : 0)

assert(
  Math.abs(baseGeometry.renderedWidth - expectedRenderedWidth) < 0.0001,
  "K-seal rendered width includes bottom seals within the entered gusset."
)
assert(
  baseGeometry.renderedHeight === baseGeometry.pouchWidth,
  "K-seal rendered height must equal finished pouch width."
)
assert(
  baseGeometry.sideSeal >= 5 && baseGeometry.sideSeal <= 20,
  "K-seal default side seal must stay in the 5-20mm range."
)
assert(
  Math.abs(baseGeometry.centerX - baseGeometry.width / 2) < 0.0001,
  "K-seal centre line must stay centred."
)
assert(
  Math.abs(baseGeometry.centerX - baseGeometry.leftFoldX - baseGeometry.gussetSize) < 0.0001 &&
    Math.abs(baseGeometry.rightFoldX - baseGeometry.centerX - baseGeometry.gussetSize) < 0.0001,
  "K-seal gusset must resolve symmetrically around centre."
)
assert(
  baseGeometry.armLines.length === 8,
  "K-seal must resolve eight mirrored support arms."
)
assert(
  baseGeometry.armLines.filter(arm => arm.position === "inner").length === 4 &&
    baseGeometry.armLines.filter(arm => arm.position === "outer").length === 4,
  "K-seal must keep four inner gusset arms and add four outer pouch-height arms."
)
assert(
  baseGeometry.pouchHeight === 200 &&
    baseGeometry.pouchWidth === 190 &&
    baseGeometry.trim === 15 &&
    !baseGeometry.trimEnabled &&
    baseGeometry.sideSeal === 7.5 &&
    baseGeometry.bottomSeal === 7.5 &&
    baseGeometry.gussetSize === 40 &&
    baseGeometry.armWidth === 7.5 &&
    baseGeometry.armDegree === 45,
  "K-seal must start with trim off and the approved 200x190, 15mm optional trim, 7.5mm seals/arms, 40mm gusset and 45 degree arm default."
)
assert(
  baseGeometry.leftBottomSealX ===
    baseGeometry.leftPanelX + baseGeometry.pouchHeight - baseGeometry.bottomSeal &&
    baseGeometry.rightBottomSealX ===
      baseGeometry.rightFoldX - baseGeometry.bottomSeal,
  "K-seal bottom seals straddle the gusset midpoint boundaries."
)
assert(
  baseGeometry.leftBottomSealX > baseGeometry.trimWidth &&
    baseGeometry.rightBottomSealX + baseGeometry.bottomSealAreaWidth <
      baseGeometry.width - baseGeometry.trimWidth,
  "K-seal bottom seal zones must not render as far-left/far-right edge strips."
)
assert(
  baseGeometry.gussetX === baseGeometry.leftFoldX + baseGeometry.bottomSeal &&
    baseGeometry.leftBottomSealX + baseGeometry.bottomSeal === baseGeometry.leftFoldX &&
    baseGeometry.rightBottomSealX + baseGeometry.bottomSeal === baseGeometry.rightFoldX &&
    baseGeometry.rightPanelX === baseGeometry.rightFoldX,
  "K-seal gusset size must include the inner bottom-seal halves."
)
baseGeometry.armLines.forEach(arm => {
  const startsInSideSeal =
    arm.side.startsWith("top")
      ? arm.startY === 0
      : arm.startY === baseGeometry.height
  const expectedBottomSealMinX = arm.side.endsWith("left")
    ? baseGeometry.leftBottomSealX
    : baseGeometry.rightBottomSealX
  const expectedBottomSealMaxX =
    expectedBottomSealMinX + baseGeometry.bottomSealAreaWidth
  const expectedBottomSealGuideX =
    expectedBottomSealMinX + baseGeometry.bottomSealAreaWidth / 2
  assert(
    startsInSideSeal &&
      arm.endX >= expectedBottomSealMinX &&
      arm.endX <= expectedBottomSealMaxX &&
      Math.abs(arm.endX - expectedBottomSealGuideX) < 0.0001 &&
      arm.endY >= baseGeometry.sideSeal &&
      arm.endY <= baseGeometry.height - baseGeometry.sideSeal,
    `K-seal support arm "${arm.side}" must connect to the centred bottom seal guide.`
  )
})

baseGeometry.armLines
  .filter(arm => arm.position === "inner")
  .forEach(arm => {
    assert(
      Math.abs(arm.startX - baseGeometry.centerX) < 0.0001,
      `K-seal inner support arm "${arm.side}" centre path must start on the centre line.`
    )
  })

baseGeometry.armLines
  .filter(arm => arm.position === "outer")
  .forEach(arm => {
    const armRun = Math.abs(arm.endX - arm.startX)
    const expectedRun = Math.min(
      Math.abs(baseGeometry.centerX - arm.endX),
      arm.side.endsWith("left")
        ? arm.endX - baseGeometry.leftPanelX
        : baseGeometry.width - baseGeometry.rightTrimWidth - arm.endX
    )
    assert(
      Math.abs(armRun - expectedRun) < 0.0001 &&
        arm.startX >= baseGeometry.trimWidth &&
        arm.startX <= baseGeometry.width - baseGeometry.trimWidth &&
        Math.abs(
          Math.abs(arm.endY - arm.startY) -
            Math.tan((baseGeometry.armDegree * Math.PI) / 180) * armRun
        ) < 0.0001,
      `K-seal outer support arm "${arm.side}" must stay short, angled and inside the usable pouch area.`
    )
  })

const baseLayout = resolveKSealLayout(baseKSeal)
assert(
  baseLayout.seals.left === baseGeometry.trimWidth &&
    baseLayout.seals.right === baseGeometry.trimWidth,
  "K-seal layout must not expose old generic left/right edge seal bands."
)

assert(
  baseLayout.topMeasureSegments
    .map(segment => segment.label)
    .join("|") === "200mm|200mm",
  "K-seal top sub-measures must show the true cutter-edge to bottom-seal-centre pack heights."
)

const guideAlignmentSpec = cloneValidKSealFixture("base-default")
guideAlignmentSpec.kSealPouch = {
  ...guideAlignmentSpec.kSealPouch!,
  pouchHeight: 173.5,
  pouchWidth: 205,
  sideSeal: 5,
  bottomSeal: 7.5,
  gussetSize: 40,
  trimEnabled: true,
  trim: 10,
  customArmDegreeEnabled: true,
  armDegree: 30,
  armWidth: 10
}
const guideAlignmentGeometry = resolveKSealPouchGeometry(guideAlignmentSpec)
const asymmetricDimensions = resolveKSealDimensionSemantics(guideAlignmentSpec)
assert(
  asymmetricDimensions.finishedWidthMm === 205 &&
    asymmetricDimensions.finishedHeightMm === 173.5,
  "Asymmetric K-Seal Pack dimensions must preserve finished width and finished height independently."
)
assert(
  asymmetricDimensions.flatWidthMm === 447 &&
    asymmetricDimensions.flatHeightMm === 205,
  "Asymmetric K-Seal Cutter dimensions must expose the resolved flat width and flat height independently."
)
const betaDimensionSpec = cloneValidKSealFixture("base-default")
betaDimensionSpec.kSealPouch = {
  ...betaDimensionSpec.kSealPouch!,
  pouchHeight: 300,
  pouchWidth: 190,
  gussetSize: 40,
  trimEnabled: true,
  trim: 10
}
const betaDimensions = resolveKSealDimensionSemantics(betaDimensionSpec)
assert(
  betaDimensions.finishedWidthMm === 190 &&
    betaDimensions.finishedHeightMm === 300 &&
    betaDimensions.flatWidthMm === 700 &&
    betaDimensions.flatHeightMm === 190,
  "The beta K-Seal fixture must keep 300 x 190mm finished dimensions distinct from its 700 x 190mm flat Cutter dimensions."
)
assert(
  Math.abs(guideAlignmentGeometry.renderedWidth - 447) < 0.0001 &&
    guideAlignmentGeometry.bottomSealAreaWidth === 15 &&
    guideAlignmentGeometry.armWidth === 10,
  "K-seal guide-alignment test must keep rendered width, doubled bottom seal band and explicit arm width."
)
guideAlignmentGeometry.armLines.forEach(arm => {
  const bottomSealMinX = arm.side.endsWith("left")
    ? guideAlignmentGeometry.leftBottomSealX
    : guideAlignmentGeometry.rightBottomSealX
  const expectedGuideX =
    bottomSealMinX + guideAlignmentGeometry.bottomSealAreaWidth / 2
  const expectedStartY = arm.side.startsWith("top")
    ? 0
    : guideAlignmentGeometry.height
  assert(
    Math.abs(arm.endX - expectedGuideX) < 0.0001 &&
      Math.abs(arm.startY - expectedStartY) < 0.0001,
    `K-seal guide-alignment arm "${arm.side}" must run between centred side and bottom seal guides.`
  )
})

const fittedSmallBottomLabel = fitKSealSubMeasureLabel("8mm", 7.5)
assert(
  fittedSmallBottomLabel.label === "8",
  "K-seal tight bottom sub-measures must compact 8mm to 8 when the suffix does not fit."
)
const fittedRoomyBottomLabel = fitKSealSubMeasureLabel("34mm", 34)
assert(
  fittedRoomyBottomLabel.label === "34mm",
  "K-seal roomy bottom sub-measures must keep the mm suffix."
)

const bottomSealCoupledSpec = cloneValidKSealFixture("base-default")
bottomSealCoupledSpec.kSealPouch = {
  ...bottomSealCoupledSpec.kSealPouch!,
  bottomSeal: 5,
  armWidth: 12
}
const bottomSealCoupledGeometry = resolveKSealPouchGeometry(bottomSealCoupledSpec)
assert(
  bottomSealCoupledGeometry.armWidth === 12 &&
    bottomSealCoupledGeometry.bottomSealAreaWidth === 10,
  "K-seal geometry must honour explicit arm width without using the doubled bottom seal band."
)

const bottomSealSyncedDefaults = createKSealDefaults({ bottomSeal: 5 })
assert(
  bottomSealSyncedDefaults.bottomSeal === 5 &&
    bottomSealSyncedDefaults.armWidth === 7.5,
  "K-seal defaults must keep arm width independent when bottom seal changes."
)

const bottomSealDerivedGeometrySpec = cloneValidKSealFixture("base-default")
bottomSealDerivedGeometrySpec.kSealPouch = {
  ...bottomSealDerivedGeometrySpec.kSealPouch!,
  bottomSeal: 5,
  armWidth: undefined
}
const bottomSealDerivedGeometry = resolveKSealPouchGeometry(
  bottomSealDerivedGeometrySpec
)
assert(
  bottomSealDerivedGeometry.armWidth === 7.5 &&
    bottomSealDerivedGeometry.bottomSealAreaWidth === 10,
  "K-seal geometry must use the independent arm-width default when arm width is absent."
)
assert(
  baseLayout.heightMeasureSegments.map(segment => segment.label).join("|") ===
    "7.5mm|175mm|7.5mm",
  "K-seal height sub-measures must show top seal, clear height and bottom seal."
)
assert(
  baseLayout.heightMeasureSegments.every(
    segment => segment.x > baseLayout.originX + baseLayout.width
  ),
  "K-seal height sub-measures must sit outside the right cutter edge."
)

const singleEyemarkDefaults = createKSealEyemarkDefaults(1, baseGeometry.trimWidth)
assert(
  singleEyemarkDefaults.width === 15 && singleEyemarkDefaults.height === 5,
  "K-seal single-eyemark defaults must remain 15mm by 5mm."
)

const validTwoEyemark = cloneValidKSealFixture("base-default")
validTwoEyemark.kSealPouch = { ...validTwoEyemark.kSealPouch!, trimEnabled: true }
validTwoEyemark.eyeMarks = {
  count: 2,
  position: "centre",
  width: 10,
  height: 7,
  width2: 10,
  height2: 7,
  color: "black"
}
assert(
  validate(validTwoEyemark).errors.length === 0,
  "K-seal validation must accept centered 10x7mm eyemarks with 1.5mm trim clearance."
)
const validTwoGeometry = resolveKSealPouchGeometry(validTwoEyemark)
const validTwoRects = buildKSealEyeMarkRects(validTwoEyemark, validTwoGeometry)
assert(
  validTwoRects.length === 2 &&
    validTwoRects.every(rect => rect.y === (validTwoGeometry.pouchWidth - 7) / 2) &&
    validTwoRects[0].x >= 1.5 &&
    validTwoGeometry.trimWidth - validTwoRects[0].x - validTwoRects[0].width >= 1.5,
  "K-seal two-eyemark geometry must center marks to pouch width and keep both trim-edge clearances."
)
const oversizedDualEyemark = {
  ...validTwoEyemark,
  eyeMarks: {
    ...validTwoEyemark.eyeMarks!,
    width: 15,
    width2: 13,
    offsetX: 1,
    offsetX2: -1
  }
}
const sizeFixedDual = applyCutterValidationFix(
  oversizedDualEyemark,
  "kseal-eyemark-size"
)
assert(
  sizeFixedDual.eyeMarks?.width === 12 &&
    sizeFixedDual.eyeMarks.width2 === 12,
  "K-seal eyemark size quick fix must fit width to trim minus 3 mm while preserving a valid independent height."
)
const centredDual = applyCutterValidationFix(
  oversizedDualEyemark,
  "kseal-eyemark-centre"
)
assert(
  centredDual.eyeMarks?.width === 12 &&
    centredDual.eyeMarks.width2 === 12 &&
    centredDual.eyeMarks.offsetX === 0 &&
    centredDual.eyeMarks.offsetX2 === 0,
  "K-seal eyemark centre quick fix must minimally shrink when needed, then centre."
)

const armWidthOverrideDefaults = createKSealDefaults({ armWidth: 12 })
assert(
  armWidthOverrideDefaults.bottomSeal === 7.5 &&
    armWidthOverrideDefaults.armWidth === 12,
  "K-seal defaults must preserve explicit arm width without changing bottom seal."
)

;[30, 45, 60].forEach(armDegree => {
  const customArmDegreeSpec = cloneValidKSealFixture("base-default")
  customArmDegreeSpec.kSealPouch = {
    ...customArmDegreeSpec.kSealPouch!,
    customArmDegreeEnabled: true,
    armDegree
  }
  const customArmDegreeGeometry =
    resolveKSealPouchGeometry(customArmDegreeSpec)
  customArmDegreeGeometry.armLines.forEach(arm => {
    const run = Math.abs(arm.endX - arm.startX)
    const rise = Math.abs(arm.endY - arm.startY)
    assert(
      Math.abs(rise - Math.tan((armDegree * Math.PI) / 180) * run) < 0.0001,
      `K-seal support arm "${arm.position}-${arm.side}" must use ${armDegree} degrees.`
    )
  })
})

const formulaReferenceSpec = cloneValidKSealFixture("base-default")
formulaReferenceSpec.kSealPouch = {
  ...formulaReferenceSpec.kSealPouch!,
  pouchHeight: 220,
  gussetSize: 50,
  trimEnabled: true,
  trim: 10,
  bottomSeal: 7.5
}
const formulaReferenceGeometry = resolveKSealPouchGeometry(formulaReferenceSpec)
assert(
  formulaReferenceGeometry.renderedWidth === 560,
  "K-seal rendered width must be 560mm for pouchHeight 220, gusset 50 including its bottom seals, and trim 10."
)
formulaReferenceSpec.kSealPouch = {
  ...formulaReferenceSpec.kSealPouch,
  trimEnabled: false
}
const trimOffFormulaReferenceGeometry =
  resolveKSealPouchGeometry(formulaReferenceSpec)
assert(
  trimOffFormulaReferenceGeometry.renderedWidth === 540,
  "K-seal rendered width must be 540mm for pouchHeight 220, gusset 50 including its bottom seals, and trim off."
)

const bottomMeasureSpec = cloneValidKSealFixture("base-default")
bottomMeasureSpec.kSealPouch = {
  ...bottomMeasureSpec.kSealPouch!,
  pouchHeight: 220,
  gussetSize: 40,
  trimEnabled: true,
  trim: 10,
  bottomSeal: 5
}
const bottomMeasureLayout = resolveKSealLayout(bottomMeasureSpec)
const bottomBreakdown = bottomMeasureLayout.featureMeasureSegments
  .filter(segment => segment.row === "bottom")
  .map(segment => segment.label)
  .join("|")
assert(
  bottomBreakdown.startsWith("40mm|40mm|5|5|5|5|") && bottomBreakdown.split("|").length === 8,
  "K-seal gusset sub-measures must retain the entered size, bottom seal bands and two arm-tip spans."
)

const trimReferenceSpec = cloneValidKSealFixture("base-default")
trimReferenceSpec.kSealPouch = { ...trimReferenceSpec.kSealPouch!, trimEnabled: true }
trimReferenceSpec.doyPouch = {
  ...trimReferenceSpec.doyPouch!,
  sideBleed: 45,
  showGripSeal: true,
  showTearNotch: true,
  showZipper: true,
  tearNotch: { ...trimReferenceSpec.doyPouch!.tearNotch, offsetX: 35 },
  zipper: { ...trimReferenceSpec.doyPouch!.zipper, offsetX: 60 }
}
const trimReferenceLabels = resolveKSealLayout(trimReferenceSpec)
  .featureMeasureSegments
  .filter(segment => segment.row === "feature")
  .map(segment => segment.label)
assert(
  !trimReferenceLabels.includes("30mm") &&
    trimReferenceLabels.includes("20mm") &&
    trimReferenceLabels.includes("45mm"),
  "Legacy duplicate openings keep only zip measures; tear-notch and zip offsets use the inner trim edge."
)

const trimOffGeometrySpec = cloneValidKSealFixture("base-default")
trimOffGeometrySpec.kSealPouch = {
  ...trimOffGeometrySpec.kSealPouch!,
  trimEnabled: false
}
const trimOffGeometry = resolveKSealPouchGeometry(trimOffGeometrySpec)
assert(
  trimOffGeometry.trimWidth === 0,
  "K-seal trim off must remove trim from resolved geometry."
)
assert(
  trimOffGeometry.renderedWidth ===
    trimOffGeometry.pouchHeight * 2 +
      trimOffGeometry.gussetSize * 2,
  "K-seal trim off must exclude trim and include bottom seals within the gusset."
)

const trimOffTwoEyemark = cloneValidKSealFixture("base-default")
trimOffTwoEyemark.eyeMarks = {
  count: 2,
  position: "centre",
  width: 10,
  height: 7,
  width2: 10,
  height2: 7,
  color: "black"
}
trimOffTwoEyemark.kSealPouch = {
  ...trimOffTwoEyemark.kSealPouch!,
  trimEnabled: false
}
const trimOffTwoEyemarkResult = validate(trimOffTwoEyemark)
assert(
  trimOffTwoEyemarkResult.errors.some(error =>
    error.includes("K-seal trim must be enabled to use two eyemarks.")
  ),
  "K-seal validation must reject two eyemarks when trim is disabled."
)

const invalidSideSeal = cloneValidKSealFixture("base-default")
invalidSideSeal.kSealPouch = {
  ...invalidSideSeal.kSealPouch!,
  sideSeal: 25
}
assert(
  validate(invalidSideSeal).errors.some(error =>
    error.includes("K-seal side seals must be between 5mm and 20mm.")
  ),
  "K-seal side seal validation must enforce the 5-20mm range."
)

const invalidTrim = cloneValidKSealFixture("base-default")
invalidTrim.kSealPouch = {
  ...invalidTrim.kSealPouch!,
  trim: 3
}
assert(
  validate(invalidTrim).errors.some(error =>
    error.includes("K-seal trim must be between 5mm and 25mm.")
  ),
  "K-seal trim validation must enforce the 5-25mm range."
)

const invalidCustomArm = cloneValidKSealFixture("base-default")
invalidCustomArm.kSealPouch = {
  ...invalidCustomArm.kSealPouch!,
  customArmDegreeEnabled: true,
  armDegree: 61
}
assert(
  validate(invalidCustomArm).errors.some(error =>
    error.includes("K-seal custom arm degree must be between 30 and 60 degrees.")
  ),
  "K-seal custom arm validation must enforce the 30-60 degree range."
)

const tacSpec = cloneValidKSealFixture("base-default")
tacSpec.hangerSlots = [{
  id: "tac-1",
  type: "hanger-slot",
  subtype: "round-hole",
  purpose: "tac-hole",
  diameter: 6,
  centerX: 0,
  centerY: 20,
  mirrored: true
}]
assert(
  getKSealTacBaseWidth(tacSpec) === 40 &&
    getKSealTacTolerance(40, 6) === 8.5 &&
    getKSealTacCentreY(6) === 4.5,
  "K-seal TAC tolerance must be (base width - hole size) / 4."
)
const tacBounds = getKSealTacMovementBounds(tacSpec, 6)
const constrainedTac = clampKSealTacHole(tacSpec, {
  ...tacSpec.hangerSlots![0],
  centerX: 999,
  centerY: 999
})
assert(
  getKSealTacCentreX(tacSpec, 6) >= tacBounds.minX &&
    getKSealTacCentreX(tacSpec, 6) <= tacBounds.maxX &&
    constrainedTac.centerX + constrainedTac.diameter / 2 <=
      tacBounds.innerBoundaryX &&
    constrainedTac.centerY <=
      getKSealTacMovementBounds(tacSpec, 6, constrainedTac.centerX).maxY,
  "K-seal TAC bounds must keep the full hole inside the outer arm base and before the inner guide."
)
const fixedTacSpec = applyCutterValidationFix(tacSpec, "kseal-tac-centre")
assert(
  fixedTacSpec.hangerSlots?.[0].centerX === getKSealTacCentreX(tacSpec, 6) &&
    fixedTacSpec.hangerSlots[0].centerY <=
      getKSealTacMovementBounds(
        tacSpec,
        6,
        fixedTacSpec.hangerSlots[0].centerX
      ).maxY,
  "K-seal TAC quick fix must centre and constrain the hole to the K-arm base."
)

const invalidArmWidth = cloneValidKSealFixture("base-default")
invalidArmWidth.kSealPouch = {
  ...invalidArmWidth.kSealPouch!,
  armWidth: 3
}
assert(
  validate(invalidArmWidth).errors.some(error =>
    error.includes("K-seal arm width must be between 5mm and 20mm.")
  ),
  "K-seal arm-width validation must enforce the 5-20mm range."
)

console.log("K-seal validation tests passed.")
