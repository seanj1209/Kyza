/** Explicit public-app ↔ Airtable catalogue identity; neither side is renamed. */
export const PUBLIC_PACK_CATALOGUE = [
  { packId: "flowwrap", displayName: "Flowwrap", airtableRecordId: "recJigDYNympIzn6L", airtableName: "Flow Wrap", airtableCode: "FW" },
  { packId: "paper-strip", displayName: "Strip Laminate", airtableRecordId: "reclcsE9zpl6yw1Cf", airtableName: "Strip Laminate", airtableCode: "WEB" },
  { packId: "pillow-pack", displayName: "Pillow Pack", airtableRecordId: "reczDPD04iOotv2J1", airtableName: "Pillow Pack", airtableCode: "PIL" },
  { packId: "k-seal-pouch", displayName: "K Seal Pouch", airtableRecordId: "recxAyA8NWXg6t4sG", airtableName: "K-Seal Pouch", airtableCode: "KS" },
  { packId: "doy-pouch", displayName: "DOY Pouch", airtableRecordId: "reca8FsvYZVIOPrJK", airtableName: "Doypack / Stand-Up Pouch", airtableCode: "DOY" },
  { packId: "sachet-4-side-seal", displayName: "4-Side Seal Sachet", airtableRecordId: "recpk3sYolsEyCaE0", airtableName: "4-Side Seal Sachet", airtableCode: "4SS" },
  { packId: "sachet-3-side-seal", displayName: "3-Side Seal Sachet", airtableRecordId: "recPkqaVO00Nsl5gf", airtableName: "3-Side Seal Sachet", airtableCode: "3SS" }
] as const

export function getAirtablePackIdentity(packId: string) {
  return PUBLIC_PACK_CATALOGUE.find(item => item.packId === packId) ?? null
}
