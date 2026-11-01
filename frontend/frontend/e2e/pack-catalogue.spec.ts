import { expect, test } from "./helpers/testState"

test("@beta public pack catalogue preserves the seven mapped Airtable identities", async ({page}) => {
  await page.goto("/")
  const catalogue=await page.evaluate(async()=>{
    const {packModules}=await import("/apps/web/src/packs/index.ts")
    const {PUBLIC_PACK_CATALOGUE}=await import("/apps/web/src/kyza/packCatalogue.ts")
    return {app:packModules.map(pack=>({id:pack.id,name:pack.name})),mapped:PUBLIC_PACK_CATALOGUE}
  })
  expect(catalogue.mapped).toHaveLength(7)
  for (const item of catalogue.mapped) {
    expect(catalogue.app).toContainEqual({id:item.packId,name:item.displayName})
  }
  expect(catalogue.app.map(item=>item.id)).toContain('lidding')
  expect(catalogue.mapped.map(item=>item.packId)).not.toContain('lidding')
  expect(new Set(catalogue.mapped.map(item=>item.airtableRecordId)).size).toBe(7)
  expect(new Set(catalogue.mapped.map(item=>item.airtableCode)).size).toBe(7)
})
