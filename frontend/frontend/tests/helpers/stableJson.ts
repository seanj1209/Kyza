function normalizeArray(value: unknown[]) {
  return value.map(item => normalizeForSnapshot(item))
}

function normalizeObject(value: Record<string, unknown>) {
  const normalizedEntries = Object.keys(value)
    .sort()
    .flatMap(key => {
      const normalizedValue = normalizeForSnapshot(value[key])
      return normalizedValue === undefined ? [] : [[key, normalizedValue] as const]
    })
  return Object.fromEntries(normalizedEntries)
}

export function normalizeForSnapshot<T>(value: T): T {
  if (value === undefined) {
    return undefined as T
  }
  if (value === null) {
    return value
  }
  if (Array.isArray(value)) {
    return normalizeArray(value) as T
  }
  if (typeof value === "object") {
    return normalizeObject(value as Record<string, unknown>) as T
  }
  return value
}

export function stableStringify(value: unknown) {
  return `${JSON.stringify(normalizeForSnapshot(value), null, 2)}\n`
}
