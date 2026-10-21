// Pure image metadata readers. The admin is deliberately dependency-free, so
// this understands just enough of JPEG, PNG, GIF, WebP and AVIF to write real
// width/height attributes into <img>. Missing dimensions are what make an image
// gallery jump while it loads; the browser cannot reserve space without them.

function be16(buf, at) {
  return (buf[at] << 8) | buf[at + 1];
}

function le16(buf, at) {
  return buf[at] | (buf[at + 1] << 8);
}

function be24(buf, at) {
  return (buf[at] << 16) | (buf[at + 1] << 8) | buf[at + 2];
}

function le24(buf, at) {
  return buf[at] | (buf[at + 1] << 8) | (buf[at + 2] << 16);
}

function safeSize(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0 || width > 100_000 || height > 100_000) return null;
  return { width, height };
}

function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let at = 2;
  while (at + 9 < buf.length) {
    if (buf[at] !== 0xff) {
      at += 1;
      continue;
    }
    let marker = buf[at + 1];
    while (marker === 0xff && at + 2 < buf.length) {
      at += 1;
      marker = buf[at + 1];
    }
    at += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (at + 1 >= buf.length) break;
    const length = be16(buf, at);
    if (length < 2 || at + length > buf.length) break;
    // SOF0–SOF3, SOF5–SOF7, SOF9–SOF11, SOF13–SOF15
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (at + 7 < buf.length) return safeSize(be16(buf, at + 5), be16(buf, at + 3));
      return null;
    }
    at += length;
  }
  return null;
}

function pngSize(buf) {
  if (buf.length < 24) return null;
  if (buf[0] !== 0x89 || buf.toString("ascii", 1, 4) !== "PNG") return null;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return safeSize(buf.readUInt32BE(16), buf.readUInt32BE(20));
}

function gifSize(buf) {
  if (buf.length < 10) return null;
  const sig = buf.toString("ascii", 0, 6);
  if (sig !== "GIF87a" && sig !== "GIF89a") return null;
  return safeSize(le16(buf, 6), le16(buf, 8));
}

function webpSize(buf) {
  if (buf.length < 30) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return safeSize(1 + le24(buf, 24), 1 + le24(buf, 27));
  }
  if (chunk === "VP8L") {
    if (buf[20] !== 0x2f) return null;
    const b = buf;
    const width = 1 + (((b[22] & 0x3f) << 8) | b[21]);
    const height = 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6));
    return safeSize(width, height);
  }
  if (chunk === "VP8 ") {
    // Lossy WebP: a 3-byte frame tag, then the 9d 01 2a start code.
    const start = buf.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
    if (start === -1 || start + 7 >= buf.length) return null;
    const width = le16(buf, start + 3) & 0x3fff;
    const height = le16(buf, start + 5) & 0x3fff;
    return safeSize(width, height);
  }
  return null;
}

function avifSize(buf) {
  if (buf.length < 32 || buf.toString("ascii", 4, 8) !== "ftyp") return null;
  const at = buf.indexOf(Buffer.from("ispe"));
  if (at === -1 || at + 16 > buf.length) return null;
  // ispe is a FullBox: 4 bytes version/flags, then width and height.
  return safeSize(buf.readUInt32BE(at + 8), buf.readUInt32BE(at + 12));
}

export function imageSize(buf) {
  if (!Buffer.isBuffer(buf) || !buf.length) return null;
  return pngSize(buf) || jpegSize(buf) || gifSize(buf) || webpSize(buf) || avifSize(buf);
}

export function humanBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 102.4) / 10} KB`;
  return `${Math.round(n / (1024 * 102.4)) / 10} MB`;
}
