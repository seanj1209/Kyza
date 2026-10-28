export type ControlSpecSynchroniser<T, TReason extends string> = {
  syncFromProject: (value: T) => T
  emitUserChange: (value: T, reason: TReason) => T
}

const cloneJson = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T

export const createControlSpecSynchroniser = <T, TReason extends string>(
  onUserChange: (value: T, reason: TReason) => void
): ControlSpecSynchroniser<T, TReason> => ({
  syncFromProject(value) {
    return cloneJson(value)
  },
  emitUserChange(value, reason) {
    const snapshot = cloneJson(value)
    onUserChange(snapshot, reason)
    return snapshot
  }
})
