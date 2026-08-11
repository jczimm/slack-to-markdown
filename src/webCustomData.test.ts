import { describe, it } from "node:test";
import assert from "node:assert";
import { parseWebCustomData } from "./webCustomData.ts";

/** Build a base::Pickle the way Chromium writes the web-custom-data blob. */
function pickle(entries: [string, string][]): Buffer {
  const parts: Buffer[] = [];
  const uint32 = (n: number) => {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n);
    return b;
  };
  const string16 = (s: string) => {
    const data = Buffer.from(s, "utf16le");
    const pad = (4 - (data.length % 4)) % 4;
    return Buffer.concat([uint32(s.length), data, Buffer.alloc(pad)]);
  };

  parts.push(uint32(entries.length));
  for (const [type, value] of entries) {
    parts.push(string16(type), string16(value));
  }
  const payload = Buffer.concat(parts);
  return Buffer.concat([uint32(payload.length), payload]);
}

describe("parseWebCustomData", () => {
  it("reads a single entry", () => {
    const parsed = parseWebCustomData(pickle([["slack/texty", '{"ops":[]}']]));
    assert.deepStrictEqual([...parsed], [["slack/texty", '{"ops":[]}']]);
  });

  it("reads multiple entries, keeping alignment across odd-length strings", () => {
    // "slack/html" is 10 code units — 20 bytes — so its entry needs padding.
    const parsed = parseWebCustomData(pickle([
      ["slack/html", "<b>hi</b>"],
      ["slack/texty", '{"ops":[{"insert":"hi"}]}'],
      ["text/plain", "hi"],
    ]));
    assert.deepStrictEqual([...parsed.keys()], ["slack/html", "slack/texty", "text/plain"]);
    assert.strictEqual(parsed.get("slack/texty"), '{"ops":[{"insert":"hi"}]}');
    assert.strictEqual(parsed.get("text/plain"), "hi");
  });

  it("round-trips non-ASCII content", () => {
    const parsed = parseWebCustomData(pickle([["slack/texty", '{"insert":"héllo ✓"}']]));
    assert.strictEqual(parsed.get("slack/texty"), '{"insert":"héllo ✓"}');
  });

  it("returns nothing for an empty entry list", () => {
    assert.strictEqual(parseWebCustomData(pickle([])).size, 0);
  });

  it("throws on a truncated blob rather than returning garbage", () => {
    const full = pickle([["slack/texty", '{"ops":[]}']]);
    assert.throws(() => parseWebCustomData(full.subarray(0, full.length - 8)), /truncated/);
  });
});
