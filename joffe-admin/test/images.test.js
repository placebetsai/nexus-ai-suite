import test from "node:test";
import assert from "node:assert/strict";
import { imageSize, humanBytes } from "../lib/images.js";

function png(width, height) {
  const buf = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(13, 8);
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function gif(width, height) {
  const buf = Buffer.alloc(10);
  buf.write("GIF89a", 0, "ascii");
  buf.writeUInt16LE(width, 6);
  buf.writeUInt16LE(height, 8);
  return buf;
}

function jpeg(width, height) {
  const buf = Buffer.alloc(4 + 17);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  buf[3] = 0xc0;
  buf.writeUInt16BE(17, 4);
  buf[6] = 8;
  buf.writeUInt16BE(height, 7);
  buf.writeUInt16BE(width, 9);
  return buf;
}

function webpVp8x(width, height) {
  const buf = Buffer.alloc(30);
  buf.write("RIFF", 0, "ascii");
  buf.write("WEBP", 8, "ascii");
  buf.write("VP8X", 12, "ascii");
  buf.writeUIntLE(width - 1, 24, 3);
  buf.writeUIntLE(height - 1, 27, 3);
  return buf;
}

test("reads PNG dimensions", () => {
  assert.deepEqual(imageSize(png(1200, 630)), { width: 1200, height: 630 });
});

test("reads GIF dimensions", () => {
  assert.deepEqual(imageSize(gif(320, 240)), { width: 320, height: 240 });
});

test("reads JPEG dimensions from the SOF segment", () => {
  assert.deepEqual(imageSize(jpeg(800, 600)), { width: 800, height: 600 });
});

test("reads extended WebP dimensions", () => {
  assert.deepEqual(imageSize(webpVp8x(1080, 1283)), { width: 1080, height: 1283 });
});

test("unknown and empty buffers do not pretend to have dimensions", () => {
  assert.equal(imageSize(Buffer.from("not an image")), null);
  assert.equal(imageSize(Buffer.alloc(0)), null);
});

test("humanBytes is stable at the usual breakpoints", () => {
  assert.equal(humanBytes(900), "900 B");
  assert.equal(humanBytes(1024), "1 KB");
  assert.equal(humanBytes(1024 * 1024), "1 MB");
});
