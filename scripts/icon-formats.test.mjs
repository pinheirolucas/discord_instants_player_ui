import { describe, expect, it } from "vitest";
import { ICNS_TYPES, argbPayload, packBits, packIcns, packIco } from "./icon-formats.mjs";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Stand-in payloads: valid PNG signatures with a distinct tail, so each
// directory entry can be traced to the bytes it points at.
function png(tag) {
  return Buffer.concat([SIGNATURE, Buffer.from(String(tag))]);
}

// The reference decoder for the icns PackBits variant, written from the
// format rather than from the encoder, so a round trip actually checks it.
function unpackBits(bytes, expectedLength) {
  const out = [];
  let i = 0;
  while (out.length < expectedLength) {
    const control = bytes[i++];
    if (control < 0x80) {
      for (let n = 0; n <= control; n++) out.push(bytes[i++]);
    } else {
      const value = bytes[i++];
      for (let n = 0; n < control - 0x80 + 3; n++) out.push(value);
    }
  }
  return { data: Uint8Array.from(out), consumed: i };
}

describe("packIco", () => {
  const images = [16, 48, 256].map((size) => ({ size, png: png(size) }));
  const ico = packIco(images);

  it("writes an icon header with one entry per image", () => {
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
  });

  it("encodes 256 as 0, since the entry has one byte for each edge", () => {
    expect(ico.readUInt8(6 + 0 * 16)).toBe(16);
    expect(ico.readUInt8(6 + 1 * 16)).toBe(48);
    expect(ico.readUInt8(6 + 2 * 16)).toBe(0);
    expect(ico.readUInt8(6 + 2 * 16 + 1)).toBe(0);
  });

  it("points every entry at its own PNG, at the length it declares", () => {
    images.forEach(({ png: bytes }, i) => {
      const entry = 6 + i * 16;
      const length = ico.readUInt32LE(entry + 8);
      const offset = ico.readUInt32LE(entry + 12);
      expect(ico.subarray(offset, offset + length).equals(bytes)).toBe(true);
    });
  });

  it("refuses sizes the format cannot hold, and payloads that are not PNG", () => {
    expect(() => packIco([{ size: 512, png: png(512) }])).toThrow(RangeError);
    expect(() => packIco([{ size: 16, png: Buffer.from("nope") }])).toThrow(TypeError);
  });
});

describe("packBits", () => {
  it.each([
    ["a long run", new Uint8Array(300).fill(7)],
    ["no runs at all", Uint8Array.from({ length: 300 }, (_, i) => i % 251)],
    ["runs of exactly three between literals", Uint8Array.from([1, 2, 5, 5, 5, 3, 4, 9, 9, 9, 9])],
    ["an icon-like mix", Uint8Array.from({ length: 256 }, (_, i) => (i % 16 < 4 ? 0 : i % 16 < 12 ? 200 : i))],
    ["a single byte", Uint8Array.from([42])]
  ])("round-trips %s through the reference decoder", (_label, channel) => {
    const packed = packBits(channel);
    const { data, consumed } = unpackBits(packed, channel.length);

    expect(Array.from(data)).toEqual(Array.from(channel));
    expect(consumed).toBe(packed.length);
  });

  it("never writes a run longer than 130 or a literal longer than 128", () => {
    const packed = packBits(new Uint8Array(1000).fill(3));
    for (let i = 0; i < packed.length; i += 2) {
      expect(packed[i]).toBeLessThanOrEqual(0x80 + 127);
    }
  });
});

describe("argbPayload", () => {
  // Two straight-alpha pixels: opaque enamel blue, then fully transparent.
  const rgba = Buffer.from([0x0d, 0x66, 0xb4, 255, 0, 0, 0, 0]);
  const payload = argbPayload(rgba);

  it("opens with the ARGB tag", () => {
    expect(payload.subarray(0, 4).toString("ascii")).toBe("ARGB");
  });

  it("stores all alpha, then all red, green and blue, each packed on its own", () => {
    let at = 4;
    const planes = [];
    for (let p = 0; p < 4; p++) {
      const { data, consumed } = unpackBits(payload.subarray(at), 2);
      planes.push(Array.from(data));
      at += consumed;
    }
    expect(planes).toEqual([
      [255, 0],
      [0x0d, 0],
      [0x66, 0],
      [0xb4, 0]
    ]);
    expect(at).toBe(payload.length);
  });
});

describe("packIcns", () => {
  const bySize = new Map();
  for (const [, size, kind] of ICNS_TYPES) {
    const image = bySize.get(size) ?? {};
    if (kind === "argb") image.rgba = Buffer.alloc(size * size * 4, 0x80);
    else image.png = png(size);
    bySize.set(size, image);
  }
  const icns = packIcns(bySize);

  it("opens with the icns magic and the file's own total length", () => {
    expect(icns.subarray(0, 4).toString("ascii")).toBe("icns");
    expect(icns.readUInt32BE(4)).toBe(icns.length);
  });

  it("writes every type in order, each length counting its own header", () => {
    let at = 8;
    for (const [type, size, kind] of ICNS_TYPES) {
      expect(icns.subarray(at, at + 4).toString("ascii")).toBe(type);
      const length = icns.readUInt32BE(at + 4);
      const payload = icns.subarray(at + 8, at + length);
      if (kind === "argb") {
        expect(payload.subarray(0, 4).toString("ascii")).toBe("ARGB");
      } else {
        expect(payload.equals(bySize.get(size).png)).toBe(true);
      }
      at += length;
    }
    expect(at).toBe(icns.length);
  });

  // The set Apple's own iconutil writes. PNG under icp4/icp5 reads back at
  // the right size with noise for pixels, and icp6 reads back as 48px.
  it("uses Apple's types: raw ARGB at 16 and 32, PNG above, no icp4–icp6", () => {
    expect(ICNS_TYPES.map(([type]) => type)).toEqual([
      "ic04", "ic05", "ic07", "ic08", "ic09", "ic10", "ic11", "ic12", "ic13", "ic14"
    ]);
    expect(Object.fromEntries(ICNS_TYPES.map(([type, size]) => [type, size]))).toMatchObject({
      ic04: 16,
      ic05: 32,
      ic11: 32, // 16@2x
      ic10: 1024 // 512@2x
    });
  });

  it("refuses to pack with a rung missing or the wrong size of raw pixels", () => {
    const noLargest = new Map(bySize);
    noLargest.delete(1024);
    expect(() => packIcns(noLargest)).toThrow(/1024px/);

    const wrongRaw = new Map(bySize);
    wrongRaw.set(16, { rgba: Buffer.alloc(4) });
    expect(() => packIcns(wrongRaw)).toThrow(/16x16 raw RGBA/);
  });
});
