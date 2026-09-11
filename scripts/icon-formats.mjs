// Minimal .ico and .icns writers.
//
// Both formats are a small header and a directory of image payloads, so
// there is no need for a packing library — and the libraries resample every
// size down from one big bitmap, while here each size is rendered from the
// vector master by sharp. That matters most at 16px, where the design notes
// Fita is weakest: below about 24px the reels close up.

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function assertPng(bytes, label) {
  if (!Buffer.isBuffer(bytes) || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new TypeError(`${label}: expected PNG bytes`);
  }
}

/**
 * .ico: ICONDIR, one ICONDIRENTRY per image, then the images. PNG payloads
 * are valid at every size from Windows Vista on; 256 is written as 0.
 * @param {{ size: number, png: Buffer }[]} images
 */
export function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach(({ size, png }, i) => {
    assertPng(png, `ico ${size}px`);
    if (!Number.isInteger(size) || size < 1 || size > 256) {
      throw new RangeError(`ico sizes run 1–256, got ${size}`);
    }

    const at = i * 16;
    const edge = size === 256 ? 0 : size;
    directory.writeUInt8(edge, at); // width
    directory.writeUInt8(edge, at + 1); // height
    directory.writeUInt8(0, at + 2); // palette colours
    directory.writeUInt8(0, at + 3); // reserved
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.png)]);
}

/**
 * The icns flavour of PackBits, applied to one colour channel. A control
 * byte below 0x80 is followed by (n + 1) literal bytes; 0x80 and above
 * repeats the next byte (n - 0x80 + 3) times, so runs are 3–130 long.
 * @param {Uint8Array} channel
 */
export function packBits(channel) {
  const out = [];
  let i = 0;

  while (i < channel.length) {
    let run = 1;
    while (i + run < channel.length && channel[i + run] === channel[i] && run < 130) {
      run++;
    }

    if (run >= 3) {
      out.push(0x80 + run - 3, channel[i]);
      i += run;
      continue;
    }

    // A literal stretch, up to 128 bytes, stopping short of the next run
    // worth encoding.
    const start = i;
    while (i < channel.length && i - start < 128) {
      if (i + 2 < channel.length && channel[i] === channel[i + 1] && channel[i] === channel[i + 2]) {
        break;
      }
      i++;
    }
    out.push(i - start - 1, ...channel.subarray(start, i));
  }

  return Buffer.from(out);
}

/**
 * An ic04/ic05 payload: "ARGB", then each channel of the straight
 * (unpremultiplied) pixels packed separately — all alpha, all red, all
 * green, all blue.
 * @param {Buffer} rgba raw RGBA, 4 bytes per pixel
 */
export function argbPayload(rgba) {
  const pixels = rgba.length / 4;
  const planes = [3, 0, 1, 2].map((channel) => {
    const plane = new Uint8Array(pixels);
    for (let p = 0; p < pixels; p++) plane[p] = rgba[p * 4 + channel];
    return packBits(plane);
  });
  return Buffer.concat([Buffer.from("ARGB", "ascii"), ...planes]);
}

/**
 * OSType, pixel size and payload kind — the same set Apple's own
 * `iconutil` writes. 16 and 32 at 1x are raw ARGB (ic04, ic05): PNG stored
 * under the older icp4/icp5 types is read back by iconutil at the right size
 * but decoded as noise. No icp6 either: iconutil reads it back as 48px, and
 * 64px is ic12 (32@2x). The @2x types reuse the next rung up the ladder.
 */
export const ICNS_TYPES = [
  ["ic04", 16, "argb"],
  ["ic05", 32, "argb"],
  ["ic07", 128, "png"],
  ["ic08", 256, "png"],
  ["ic09", 512, "png"],
  ["ic10", 1024, "png"], // 512@2x
  ["ic11", 32, "png"], // 16@2x
  ["ic12", 64, "png"], // 32@2x
  ["ic13", 256, "png"], // 128@2x
  ["ic14", 512, "png"] // 256@2x
];

/**
 * .icns: an "icns" header with the total length, then one
 * (OSType, length, payload) chunk per type. Lengths are big-endian and
 * include their own 8-byte headers.
 * @param {Map<number, { png?: Buffer, rgba?: Buffer }>} imagesBySize
 */
export function packIcns(imagesBySize) {
  const chunks = ICNS_TYPES.map(([type, size, kind]) => {
    const image = imagesBySize.get(size);
    let payload;

    if (kind === "argb") {
      if (!image?.rgba || image.rgba.length !== size * size * 4) {
        throw new Error(`icns needs ${size}x${size} raw RGBA for ${type}`);
      }
      payload = argbPayload(image.rgba);
    } else {
      if (!image?.png) {
        throw new Error(`icns needs a ${size}px PNG for ${type}`);
      }
      assertPng(image.png, `icns ${type}`);
      payload = image.png;
    }

    const head = Buffer.alloc(8);
    head.write(type, 0, "ascii");
    head.writeUInt32BE(8 + payload.length, 4);
    return Buffer.concat([head, payload]);
  });

  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(8);
  head.write("icns", 0, "ascii");
  head.writeUInt32BE(8 + body.length, 4);
  return Buffer.concat([head, body]);
}
