declare const require: (id: string) => any
declare const process: {
  env: Record<string, string | undefined>
  cwd(): string
}

const { existsSync } = require("fs")
const { resolve } = require("path")
import { buildLayoutSnapshotModel, readFixtureSnapshot, writeFixtureSnapshot } from "./helpers/layoutSnapshot"
import { stableStringify } from "./helpers/stableJson"
import { LAYOUT_FIXTURES } from "./layout-model-fixtures"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

const updateFixtures = process.env.UPDATE_LAYOUT_FIXTURES === "1"

LAYOUT_FIXTURES.forEach(fixture => {
  const model = buildLayoutSnapshotModel(fixture.packId, fixture.spec)
  if (fixture.packId === "doy-pouch" && fixture.name === "base-default") {
    const doy = (model.layout as { doyLayout: { arcLeftX: number; arcRightX: number; arcInsetDepth: number; centerLeft: number; centerRight: number } }).doyLayout
    const leftTip = doy.arcLeftX + 0.75 * doy.arcInsetDepth
    const rightTip = doy.arcRightX - 0.75 * doy.arcInsetDepth
    assert(Math.abs(doy.centerLeft - leftTip - 7.5) < 0.001, "DOY left arc tip must be 7.5 mm from the bottom seal centre")
    assert(Math.abs(rightTip - doy.centerRight - 7.5) < 0.001, "DOY right arc tip must be 7.5 mm from the bottom seal centre")
  }
  const current = stableStringify(model)
  const absoluteFixturePath = resolve(process.cwd(), "tests", fixture.fixturePath)

  if (updateFixtures || !existsSync(absoluteFixturePath)) {
    writeFixtureSnapshot(fixture.fixturePath, model)
    return
  }

  const saved = readFixtureSnapshot(fixture.fixturePath)
  assert(
    saved === current,
    `Layout regression for ${fixture.packId}/${fixture.name}\nExpected fixture: ${fixture.fixturePath}`
  )
})

console.log(
  updateFixtures
    ? `Updated ${LAYOUT_FIXTURES.length} layout fixtures.`
    : `Verified ${LAYOUT_FIXTURES.length} layout fixtures.`
)
