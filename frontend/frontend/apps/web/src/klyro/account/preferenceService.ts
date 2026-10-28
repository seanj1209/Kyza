export const KLYRO_PREFERENCES_KEY = "klyro.preferences.v2"
export const FIELD_LIMIT = 120
export type NudgeIncrementMm = 0.25 | 0.5 | 1
export type ZoomStepPercent = 10 | 25 | 50 | 100
export type LiddingGrowthBehavior = "ask" | "keep" | "scale"
export type Preferences = { version: 2; accountName: string; name: string; email: string; phone: string; company: string; units: "mm" | "in"; quickExport: "svg" | "ai-svg" | "pdf"; nudgeIncrementMm: NudgeIncrementMm; moveIncrementMm: NudgeIncrementMm; zoomStepPercent: ZoomStepPercent; liddingGrowthBehavior: LiddingGrowthBehavior }
export type PreferenceStorage = Pick<Storage, "getItem" | "setItem">
export const DEFAULT_PREFERENCES: Preferences = { version: 2, accountName: "", name: "", email: "", phone: "", company: "", units: "mm", quickExport: "svg", nudgeIncrementMm: 0.5, moveIncrementMm: 0.25, zoomStepPercent: 50, liddingGrowthBehavior: "ask" }
const validNudges = [0.25, 0.5, 1]
export function loadPreferences(s: PreferenceStorage | null) {
  try {
    const raw = s?.getItem(KLYRO_PREFERENCES_KEY)
    // Preserve a choice made in the earlier stacked review preview.
    const legacy = s?.getItem("klyro.preferences.pack-types.lidding.scaling")
    const liddingGrowthBehavior = legacy === "keep" || legacy === "scale" ? legacy : "ask"
    const v = { ...DEFAULT_PREFERENCES, liddingGrowthBehavior, ...(raw ? JSON.parse(raw) : {}) } as Preferences
    if (v.version !== 2 || !(["mm", "in"] as string[]).includes(v.units) || !(["svg", "ai-svg", "pdf"] as string[]).includes(v.quickExport) || !validNudges.includes(v.nudgeIncrementMm) || !validNudges.includes(v.moveIncrementMm) || ![10, 25, 50, 100].includes(v.zoomStepPercent) || !["ask", "keep", "scale"].includes(v.liddingGrowthBehavior)) throw 0
    return { ok: true as const, value: v }
  } catch {
    return { ok: false as const, value: DEFAULT_PREFERENCES, message: "Stored account preferences could not be read safely." }
  }
}
export function savePreferences(v: Preferences, s: PreferenceStorage | null) { if (!s) return { ok: false as const, message: "Local preference storage is unavailable." }; if (!validNudges.includes(v.nudgeIncrementMm)) return { ok: false as const, message: "Choose a nudge increment of 0.25, 0.5 or 1mm." }; if (!validNudges.includes(v.moveIncrementMm)) return { ok: false as const, message: "Choose a mouse movement step of 0.25, 0.5 or 1mm." }; if (![10, 25, 50, 100].includes(v.zoomStepPercent)) return { ok: false as const, message: "Choose a zoom step of 10, 25, 50 or 100%." }; if (!["ask", "keep", "scale"].includes(v.liddingGrowthBehavior)) return { ok: false as const, message: "Choose Ask, Keep or Scale for lidding growth." }; if ([v.accountName, v.name, v.email, v.phone, v.company].some(x => x.length > FIELD_LIMIT)) return { ok: false as const, message: `Fields must be ${FIELD_LIMIT} characters or fewer.` }; try { const value = { ...v }; s.setItem(KLYRO_PREFERENCES_KEY, JSON.stringify(value)); return { ok: true as const, value } } catch { return { ok: false as const, message: "Account preferences could not be saved in this browser session." } } }
export const loadLiddingGrowthBehavior = (storage: PreferenceStorage | null = typeof window === "undefined" ? null : window.localStorage): LiddingGrowthBehavior => loadPreferences(storage).value.liddingGrowthBehavior
export const saveLiddingGrowthBehavior = (behavior: LiddingGrowthBehavior, storage: PreferenceStorage | null = typeof window === "undefined" ? null : window.localStorage) =>
  savePreferences({ ...loadPreferences(storage).value, liddingGrowthBehavior: behavior }, storage)
/** AMENDS 6.1: grid that mouse-moved objects/elements snap to (default 0.25mm). Keyboard nudge keeps its own setting. */
export function loadMoveIncrementMm(storage: PreferenceStorage | null = typeof window === "undefined" ? null : window.localStorage): NudgeIncrementMm {
  return loadPreferences(storage).value.moveIncrementMm
}
export function loadZoomStepPercent(storage: PreferenceStorage | null = typeof window === "undefined" ? null : window.localStorage): ZoomStepPercent {
  return loadPreferences(storage).value.zoomStepPercent
}
