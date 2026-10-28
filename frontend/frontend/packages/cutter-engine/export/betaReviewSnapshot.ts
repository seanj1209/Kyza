import { getPackModule } from "../../../apps/web/src/packs"
import { getRuleRegistryEntriesForPack } from "../../../apps/web/src/core/registries"
import { BETA_CUTTER_VALIDATION_RULES } from "../validation"
import { hasCutterDocument, type CutNFlowProjectV1 } from "../project"
import { BETA_CUTTER_RULESET_VERSION, getEffectiveValidationStatus, validationRunToLegacyResult, type ValidationRun, type CutterExportAuthorizationAudit } from "../validation"
import { createExportRecordId } from "./preExportValidation"
import { buildExportSvgDocument, type CutterExportSvgSource } from "./cutterExportService"
import { createRasterPreviewPdfFromSvg } from "./rasterPreviewPdf"
import { createReviewZip } from "./reviewZip"

export const BETA_REVIEW_SNAPSHOT_VERSION = "klyro-beta-review-1" as const
export const BETA_REVIEW_NOTICE = "UNAPPROVED BETA REVIEW — NOT FOR PRODUCTION"
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const ids = (values: readonly string[]) => [...new Set(values)].sort()
const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!)

export function createBetaReviewSnapshot(input: {
  project: CutNFlowProjectV1; run: ValidationRun; reviewer: string; reason: string; acknowledgedIssueIds: string[]; now?: string
}) {
  const { project, run } = input
  const status = getEffectiveValidationStatus(run, project.revision)
  if (!hasCutterDocument(project)) throw new Error("A cutter document is required for a beta review snapshot.")
  if (run.projectId !== project.id || String(run.projectRevision) !== String(project.revision)) throw new Error("Review must match the current Project revision.")
  if (run.trigger !== "pre_export" || run.rulesetVersion !== BETA_CUTTER_RULESET_VERSION || !["passed", "failed"].includes(status)) throw new Error("Complete current pre-export validation before creating a beta review snapshot.")
  const requiredIds = ids(run.issues.filter(issue => issue.severity !== "advisory").map(issue => issue.id))
  if (JSON.stringify(ids(input.acknowledgedIssueIds)) !== JSON.stringify(requiredIds)) throw new Error("Acknowledge every current critical and warning finding.")
  const reason = input.reason.trim(), reviewer = input.reviewer.trim()
  if (!reason || reason.length > 1000 || !reviewer || reviewer.length > 100) throw new Error("A reviewer name and a reason of up to 1000 characters are required.")
  const capturedAt = input.now ?? new Date().toISOString()
  if (!Number.isFinite(Date.parse(capturedAt))) throw new Error("Snapshot timestamp is invalid.")
  // Keep evidence bounded: prior exports/runs remain in the Project, not nested inside every snapshot.
  const { exportAuditRecords: _exports, validationRuns: _runs, validationAcknowledgements: _acks, ...design } = project
  return clone({
    schemaVersion: BETA_REVIEW_SNAPSHOT_VERSION, id: createExportRecordId(project.id), capturedAt,
    purpose: "unapproved-beta-review" as const, productionApproved: false as const, notice: BETA_REVIEW_NOTICE,
    decision: { reviewer, reviewerIdentityVerified: false, reason, acknowledgedIssueIds: requiredIds, criticalOverride: run.summary.criticalCount > 0 },
    project: design, validationRun: run,
    ruleContext: {
      packType: project.cutter.packType, packModuleVersion: getPackModule(project.cutter.packType)?.version ?? null,
      configuredPackDefaults: getPackModule(project.cutter.packType)?.getDefaults() ?? null,
      registeredBetaChecks: BETA_CUTTER_VALIDATION_RULES.map(rule => ({ id: rule.id, description: rule.description })),
      packRuleRegistry: getRuleRegistryEntriesForPack(project.cutter.packType).map(rule => ({ id: rule.id, status: rule.status, implementedBy: rule.implementedBy ?? [] })),
      note: "Registry entries describe available implementation, not proof that every check was run or an industry standard was met. See this validation run for actual findings."
    },
    scope: { rulesetVersion: run.rulesetVersion, units: "mm", industryComplianceCertified: false,
      limitations: ["Beta cutter checks are not a complete manufacturing or industry-compliance assessment.", "Artwork, press, substrate and customer-specific requirements require separate evidence.", "This review decision does not turn failed validation into a pass."] }
  })
}
export type BetaReviewSnapshot = ReturnType<typeof createBetaReviewSnapshot>

export function betaReviewAudit(snapshot: BetaReviewSnapshot): CutterExportAuthorizationAudit {
  const run = snapshot.validationRun
  const severityIds = (severity: string) => ids(run.issues.filter(issue => issue.severity === severity).map(issue => issue.id))
  return {
    id: snapshot.id, projectId: snapshot.project.id, projectRevision: snapshot.project.revision,
    validationRunId: run.id, rulesetVersion: run.rulesetVersion, validationStatus: run.status,
    criticalCount: run.summary.criticalCount, warningCount: run.summary.warningCount, advisoryCount: run.summary.advisoryCount,
    criticalIssueIds: severityIds("critical"), warningIssueIds: severityIds("warning"), advisoryIssueIds: severityIds("advisory"),
    acknowledgedWarningIssueIds: severityIds("warning"), exportedAt: snapshot.capturedAt, exportFormat: "beta-review-snapshot",
    betaReview: { purpose: snapshot.purpose, productionApproved: false, reviewer: snapshot.decision.reviewer,
      reason: snapshot.decision.reason, acknowledgedIssueIds: snapshot.decision.acknowledgedIssueIds, snapshotVersion: snapshot.schemaVersion }
  }
}

export async function buildBetaReviewPackage(snapshot: BetaReviewSnapshot, source?: CutterExportSvgSource, pdfGenerator = createRasterPreviewPdfFromSvg) {
  const encoder = new TextEncoder(), files: Array<{ name: string; bytes: Uint8Array }> = []
  const manifest: { visualAvailable: boolean; pdfAvailable: boolean; errors: string[] } = { visualAvailable: false, pdfAvailable: false, errors: [] }
  const addText = (name: string, content: string) => files.push({ name, bytes: encoder.encode(content) })
  let proof = ""
  if (source) {
    try {
      const built = buildExportSvgDocument(snapshot.project, { format: "svg", includeLayers: true, preserveVector: true, marginMm: 80 }, source)
      if (![built.frame.x, built.frame.y, built.frame.widthMm, built.frame.heightMm].every(Number.isFinite) || built.frame.widthMm <= 0 || built.frame.heightMm <= 0) throw new Error("The cutter has no finite preview bounds.")
      const nested = built.svgMarkup.replace(/<svg\b([^>]*)>/, (_, attributes: string) => `<svg${attributes.replace(/\s(?:width|height)=["'][^"']*["']/g, "")} x="10" y="45" width="190" height="185">`)
      proof = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><rect width="210" height="297" fill="white"/><g font-family="Arial,sans-serif" fill="#222"><text x="10" y="12" font-size="4" fill="#9e1316">UNAPPROVED BETA REVIEW - NOT FOR PRODUCTION</text><text x="10" y="22" font-size="5">${escape(snapshot.project.name.slice(0, 60))}</text><text x="10" y="31" font-size="3.5">Revision ${snapshot.project.revision} / ${escape(snapshot.validationRun.status)} / ${escape(snapshot.capturedAt)}</text></g>${nested}<g font-family="Arial,sans-serif" fill="#222" font-size="3.5"><text x="10" y="242">${snapshot.validationRun.summary.criticalCount} critical / ${snapshot.validationRun.summary.warningCount} warnings / ${snapshot.validationRun.summary.advisoryCount} advisories</text><text x="10" y="252">Reviewer: ${escape(snapshot.decision.reviewer.slice(0, 70))}</text><text x="10" y="262">Reason: ${escape(snapshot.decision.reason.slice(0, 85))}</text><text x="10" y="277">Scaled raster review proof. Full specification and findings: snapshot.json / report.html</text><text x="10" y="284">No production approval or industry-compliance certification.</text></g></svg>`
      addText("review.svg", proof); manifest.visualAvailable = true
      try {
        const pdf = await pdfGenerator(proof, 210, 297)
        files.push({ name: "review.pdf", bytes: new Uint8Array(await pdf.arrayBuffer()) }); manifest.pdfAvailable = true
      } catch (error) { manifest.errors.push(error instanceof Error ? error.message : "PDF preview could not be generated.") }
    } catch (error) { manifest.errors.push(error instanceof Error ? error.message : "Cutter preview could not be generated.") }
  } else manifest.errors.push("The cutter could not be rendered. The specification and validation evidence are retained.")
  addText("snapshot.json", JSON.stringify({ ...snapshot, manifest }, null, 2))
  const issues = snapshot.validationRun.issues.map(issue => `<tr><td>${escape(issue.severity)}</td><td>${escape(issue.ruleId)}</td><td>${escape(issue.message)}</td><td>${escape(issue.currentValue === undefined ? "" : JSON.stringify(issue.currentValue))}</td><td>${escape(issue.expectedValue === undefined ? "" : JSON.stringify(issue.expectedValue))}</td></tr>`).join("")
  addText("report.html", `<!doctype html><html lang="en"><meta charset="utf-8"><title>Klyro beta review</title><style>body{font:15px/1.5 Arial,sans-serif;max-width:1100px;margin:30px auto;padding:20px;color:#222}h1{color:#9e1316}table{border-collapse:collapse;width:100%}td,th{padding:10px;border:1px solid #ccc;text-align:left}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f0e8;padding:20px}img{width:100%;max-height:700px}</style><h1>${escape(BETA_REVIEW_NOTICE)}</h1><h2>${escape(snapshot.project.name)} / revision ${snapshot.project.revision}</h2><p>${escape(snapshot.capturedAt)} / ruleset ${escape(snapshot.validationRun.rulesetVersion)}</p><p>Reviewer (self-declared): ${escape(snapshot.decision.reviewer)}</p><p>Reason: ${escape(snapshot.decision.reason)}</p><p>Validation remains ${escape(snapshot.validationRun.status)}. This package is not a production release.</p>${manifest.visualAvailable ? '<img src="review.svg" alt="Unapproved scaled cutter review proof">' : ""}<h2>Validation findings</h2><table><tr><th>Severity</th><th>Rule</th><th>Finding</th><th>Current</th><th>Expected</th></tr>${issues}</table><h2>Specification and design snapshot</h2><pre>${escape(JSON.stringify(snapshot.project, null, 2))}</pre><h2>Scope and generation limitations</h2><p>${escape([...snapshot.scope.limitations, ...manifest.errors].join(" "))}</p></html>`)
  return { blob: createReviewZip(files), filename: `${snapshot.project.name.replace(/[^a-z0-9_-]/gi, "_")}_r${snapshot.project.revision}_UNAPPROVED_BETA.zip`, mimeType: "application/zip", manifest,
    prepared: { capability: { label: "Unapproved beta review snapshot", extensions: [".zip"] } } }
}
