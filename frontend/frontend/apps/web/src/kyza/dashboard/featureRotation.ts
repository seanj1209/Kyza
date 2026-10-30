export const FEATURE_DURATION = 7000
export const FEATURE_MANUAL_HOLD = 10000

export type FeatureRotationState = { index: number; duration: number; playing: boolean; cycle: number }
type Clock = { now: () => number; set: (callback: () => void, delay: number) => number; clear: (id: number) => void }
type PauseReason = "pointer" | "focus" | "hidden" | "offscreen" | "motion" | "user" | "scroll"

/** Presentation-only timing; never reads or mutates Project/engine data. */
export function createFeatureRotation(count: number, onChange: (state: FeatureRotationState) => void, clock: Clock) {
  let index = 0, duration = FEATURE_DURATION, remaining = duration, cycle = 0
  let timer: number | undefined, startedAt: number | undefined
  let disposed = false
  const blockers = new Set<PauseReason>(["offscreen"])
  const stop = () => {
    if (timer !== undefined) clock.clear(timer)
    if (startedAt !== undefined) remaining = Math.max(0, remaining - (clock.now() - startedAt))
    timer = undefined
    startedAt = undefined
  }
  const schedule = () => {
    if (disposed) return
    stop()
    const playing = blockers.size === 0
    onChange({ index, duration, playing, cycle })
    if (playing) {
      startedAt = clock.now()
      timer = clock.set(() => select(index + 1, false), remaining)
    }
  }
  const select = (position: number, manual = true) => {
    if (disposed) return
    stop()
    index = (position % count + count) % count
    duration = manual ? FEATURE_MANUAL_HOLD : FEATURE_DURATION
    remaining = duration
    cycle += 1
    schedule()
  }
  return {
    select,
    step: (direction: number) => select(index + direction),
    pause: (reason: PauseReason, paused: boolean) => {
      if (disposed || blockers.has(reason) === paused) return
      stop()
      if (paused) blockers.add(reason)
      else blockers.delete(reason)
      schedule()
    },
    dispose: () => { stop(); disposed = true },
  }
}
