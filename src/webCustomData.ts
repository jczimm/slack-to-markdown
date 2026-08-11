/**
 * Chromium-based apps (Slack's desktop app, Slack in Chrome) don't put custom
 * clipboard MIME types on the pasteboard as types of their own. Everything set
 * via `clipboardData.setData(...)` is packed into a single blob under
 * `org.chromium.web-custom-data`, serialized as a base::Pickle:
 *
 *   uint32   payload size (header, skipped)
 *   uint32   entry count
 *   repeated: uint32 length in UTF-16 code units, then that many code units,
 *             padded out to a 4-byte boundary — once for the MIME type, once
 *             for its data.
 */
export function parseWebCustomData(buf: Buffer): Map<string, string> {
  const entries = new Map<string, string>();
  let offset = 4;

  const readUint32 = (): number => {
    const value = buf.readUInt32LE(offset);
    offset += 4;
    return value;
  };

  const readString16 = (): string => {
    const units = readUint32();
    const end = offset + units * 2;
    if (end > buf.length) {
      throw new Error("truncated web-custom-data entry");
    }
    const value = buf.subarray(offset, end).toString("utf16le");
    offset = end + ((4 - (end % 4)) % 4);
    return value;
  };

  const count = readUint32();
  for (let i = 0; i < count; i++) {
    const type = readString16();
    entries.set(type, readString16());
  }
  return entries;
}
