// A small ZIP32 writer for the fixed beta-review bundle; entries are stored losslessly.
export function createReviewZip(files: Array<{ name: string; bytes: Uint8Array }>): Blob {
  const encoder = new TextEncoder()
  const local: Uint8Array[] = [], central: Uint8Array[] = []
  let offset = 0
  const crc32 = (bytes: Uint8Array) => {
    let crc = 0xffffffff
    for (const byte of bytes) {
      crc ^= byte
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
    return (crc ^ 0xffffffff) >>> 0
  }
  for (const file of files) {
    if (!/^[a-z0-9.-]+$/i.test(file.name)) throw new Error("Invalid review bundle entry name.")
    const name = encoder.encode(file.name), crc = crc32(file.bytes)
    const header = new Uint8Array(30 + name.length), h = new DataView(header.buffer)
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true)
    h.setUint32(14, crc, true); h.setUint32(18, file.bytes.length, true); h.setUint32(22, file.bytes.length, true)
    h.setUint16(26, name.length, true); header.set(name, 30)
    local.push(header, file.bytes)
    const index = new Uint8Array(46 + name.length), c = new DataView(index.buffer)
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true)
    c.setUint32(16, crc, true); c.setUint32(20, file.bytes.length, true); c.setUint32(24, file.bytes.length, true)
    c.setUint16(28, name.length, true); c.setUint32(42, offset, true); index.set(name, 46); central.push(index)
    offset += header.length + file.bytes.length
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer)
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true)
  e.setUint32(12, central.reduce((size, part) => size + part.length, 0), true); e.setUint32(16, offset, true)
  return new Blob([...local, ...central, end].map(bytes => new Uint8Array(bytes)), { type: "application/zip" })
}
