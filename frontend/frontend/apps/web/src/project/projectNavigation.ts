export type RequestedProjectId =
  | { status: "absent" }
  | { status: "valid"; projectId: string }
  | { status: "invalid"; message: string }

export type CutterStartupSource = "requested-project" | "existing-handoff" | "default"

const validateProjectId = (value: string) => {
  if (!value || value !== value.trim()) return false
  if (value.length > 256) return false
  return !/[\u0000-\u001f\u007f\ufffd]/.test(value)
}

export function createCutterProjectUrl(projectId: string) {
  if (!validateProjectId(projectId)) {
    throw new Error("A valid canonical Project ID is required.")
  }
  return `/cutter?${new URLSearchParams({ projectId }).toString()}`
}

export function createPackGenProjectUrl(projectId: string) {
  if (!validateProjectId(projectId)) {
    throw new Error("A valid canonical Project ID is required.")
  }
  return `/ai-studio?${new URLSearchParams({ projectId }).toString()}`
}

export function parseRequestedProjectId(searchParams: URLSearchParams | string): RequestedProjectId {
  const params = typeof searchParams === "string" ? new URLSearchParams(searchParams) : searchParams
  const values = params.getAll("projectId")
  if (values.length === 0) return { status: "absent" }
  if (values.length !== 1 || !validateProjectId(values[0])) {
    return { status: "invalid", message: "The requested Project ID is malformed." }
  }
  return { status: "valid", projectId: values[0] }
}

export function chooseCutterStartupSource(
  requestedProject: RequestedProjectId,
  hasApprovedHandoff: boolean,
): CutterStartupSource {
  if (requestedProject.status !== "absent") return "requested-project"
  return hasApprovedHandoff ? "existing-handoff" : "default"
}
