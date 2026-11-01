import { useEffect, useState } from "react"
import { packModules } from "../../packs"
import { getPackGenFieldPolicy } from "../../packGen/packGenFieldPolicy"
import { createOrUpdateCutterFromPackGen, connectStandalonePackGenToProject, createStandalonePackGenDraft, setPackGenField } from "../../packGen/packGenProjectService"
import { createProjectSubmissionId, PROJECT_CREATION_FIELD_LIMITS } from "../../project/projectCreationService"
import "./quickProjectModal.css"

type Props = { open: boolean; onClose: () => void }
type Substrate = "clear" | "white" | "paper"

export function QuickProjectModal({ open, onClose }: Props) {
  const [name, setName] = useState("")
  const [packId, setPackId] = useState("")
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [eyemarks, setEyemarks] = useState<0 | 1 | 2>(0)
  const [substrate, setSubstrate] = useState<Substrate>("clear")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    setName(""); setPackId(""); setWidth(0); setHeight(0); setEyemarks(0); setSubstrate("clear"); setBusy(false); setError("")
  }, [open])

  if (!open) return null

  const pouch = packId === "2-side-seal-pouch" || packId === "3-side-seal-pouch"
  const choosePack = (id: string) => {
    setPackId(id)
    setError("")
    if (id === "sandbox") {
      setWidth(540); setHeight(250); setEyemarks(0); setSubstrate("clear")
      return
    }
    const defaults = getPackGenFieldPolicy(id).deterministicDefaults
    setWidth(Number(defaults.finishedWidthMm ?? 0))
    setHeight(Number(defaults.finishedHeightMm ?? 0))
    setEyemarks((defaults.eyemarkCount ?? 0) as 0 | 1 | 2)
    setSubstrate((defaults.materialNotes ?? "clear") as Substrate)
  }

  const chooseEyemarks = (count: 0 | 1 | 2) => {
    if (pouch && count === 2 && eyemarks !== 2 && !window.confirm("Add 15 mm trim to both pouch edges and place one eyemark in each trim?")) return
    setEyemarks(count)
  }

  const create = async () => {
    if (busy) return
    if (!name.trim()) { setError("Enter a Project name."); return }
    if (!packId) { setError("Choose a pack type."); return }
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) { setError("Enter a width and height greater than 0 mm."); return }
    setBusy(true)
    setError("")
    if (packId === "sandbox") {
      const params = new URLSearchParams({ studio: "sandbox", name: name.trim(), width: String(width), height: String(height), substrate })
      window.location.assign(`/cutter?${params.toString()}`)
      return
    }
    try {
      let draft = createStandalonePackGenDraft()
      draft = setPackGenField(draft, "packType", packId)
      draft = setPackGenField(draft, "finishedWidthMm", width)
      draft = setPackGenField(draft, "finishedHeightMm", height)
      draft = setPackGenField(draft, "eyemarkCount", eyemarks)
      draft = setPackGenField(draft, "materialNotes", substrate)
      const connected = connectStandalonePackGenToProject(draft, {
        projectId: createProjectSubmissionId(), projectName: name.trim(), createCutter: true,
      })
      if (connected.ok === false) { setError(connected.errors[0] ?? "The Project could not be created."); setBusy(false); return }
      const result = createOrUpdateCutterFromPackGen(connected.project.id, connected.draft, connected.project.revision)
      if (result.ok === false) { setError(result.errors[0] ?? "The Cutter could not be created."); setBusy(false); return }
      window.location.assign(result.destinationUrl)
    } catch {
      setError("The Project could not be created. Your entries are still here.")
      setBusy(false)
    }
  }

  return <div className="quick-project-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section className="quick-project-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-project-title" onKeyDown={event => { if (event.key === "Escape" && !busy) onClose() }}>
      <header><div><span className="kyza-eyebrow">NEW PROJECT</span><h2 id="quick-project-title">Start a cutter</h2><p>Set the essentials, then refine the cutter in Studio.</p></div><button type="button" onClick={onClose} aria-label="Close new Project" disabled={busy}>×</button></header>
      <div className="quick-project-fields">
        <label>Project name<input autoFocus value={name} maxLength={PROJECT_CREATION_FIELD_LIMITS.projectName} onChange={event => setName(event.target.value)} /></label>
        <label>Pack type<select value={packId} onChange={event => choosePack(event.target.value)}><option value="">Select a pack type</option>{packModules.map(pack => <option key={pack.id} value={pack.id}>{pack.name}</option>)}<option value="sandbox">Sandbox</option></select></label>
        <label>{pouch ? "Pouch width (mm)" : "Starting width (mm)"}<input type="number" min="0.1" step="0.1" value={width || ""} onChange={event => setWidth(Number(event.target.value))} /></label>
        <label>{pouch ? "Pouch height (mm)" : "Starting height (mm)"}<input type="number" min="0.1" step="0.1" value={height || ""} onChange={event => setHeight(Number(event.target.value))} /></label>
        <fieldset><legend>Eyemarks</legend><div className="quick-project-eyemarks">{([0, 1, 2] as const).map(count => <button key={count} type="button" aria-pressed={eyemarks === count} onClick={() => chooseEyemarks(count)}>{count}</button>)}</div></fieldset>
        <label>Substrate<select value={substrate} onChange={event => setSubstrate(event.target.value as Substrate)}><option value="clear">Clear</option><option value="white">White</option><option value="paper">Paper</option></select></label>
      </div>
      {pouch && eyemarks === 2 ? <p className="quick-project-note">Two 15 mm trims and one 10 × 6 mm eyemark in each trim are included.</p> : null}
      <p className="quick-project-error" role="alert">{error}</p>
      <footer><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button type="button" onClick={create} disabled={busy}>{busy ? "Creating…" : "Create Project"}</button></footer>
    </section>
  </div>
}
