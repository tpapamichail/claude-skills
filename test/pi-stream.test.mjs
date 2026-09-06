import assert from "node:assert/strict";
import test from "node:test";

import { OUTPUT_ACCUMULATION_CAP_BYTES, createPiOutputParser } from "../src/pi-routing.mjs";
const messageEnd = (message) => `${JSON.stringify({ type: "message_end", message })}\n`;

test("the parser extracts assistant text from message_end events", () => {
  const parser = createPiOutputParser();
  parser.push(
    messageEnd({
      role: "assistant",
      content: [
        { type: "text", text: "alpha" },
        { type: "text", text: "beta" },
      ],
    }),
  );
  assert.equal(parser.finalOutput, "alpha\nbeta");
  assert.equal(parser.plainOutput, "");
});

test("the parser keeps only assistant messages as final output", () => {
  const parser = createPiOutputParser();
  parser.push(messageEnd({ role: "user", content: [{ type: "text", text: "not the answer" }] }));
  assert.equal(parser.finalOutput, "");
});

test("the parser keeps the previous final output when a message_end carries no text", () => {
  const parser = createPiOutputParser();
  parser.push(messageEnd({ role: "assistant", content: [{ type: "text", text: "keep" }] }));
  parser.push(messageEnd({ role: "assistant", content: [] }));
  assert.equal(parser.finalOutput, "keep");
});

test("the parser accumulates non-JSON lines verbatim", () => {
  const parser = createPiOutputParser();
  parser.push("plain line\n");
  parser.push("another plain line\n");
  assert.equal(parser.plainOutput, "plain line\nanother plain line\n");
  assert.equal(parser.finalOutput, "");
});

test("the parser buffers partial lines until a newline or flush", () => {
  const parser = createPiOutputParser();
  const event = JSON.stringify({
    type: "message_end",
    message: { role: "assistant", content: [{ type: "text", text: "end" }] },
  });
  parser.push(event.slice(0, 20));
  assert.equal(parser.finalOutput, "");
  parser.push(event.slice(20));
  assert.equal(parser.finalOutput, "", "a trailing partial line waits for the flush");
  parser.flush();
  assert.equal(parser.finalOutput, "end");
});

test("the parser ignores blank lines", () => {
  const parser = createPiOutputParser();
  parser.push("\n\n");
  parser.flush();
  assert.equal(parser.plainOutput, "");
  assert.equal(parser.finalOutput, "");
});

test("the parser reports no truncation under the byte cap", () => {
  const parser = createPiOutputParser();
  parser.push("small\n");
  assert.equal(parser.truncated, false);
});

test("the parser stops accumulating plain output beyond the byte cap", () => {
  const parser = createPiOutputParser();
  const line = "x".repeat(64 * 1024);
  const lines = Math.ceil((OUTPUT_ACCUMULATION_CAP_BYTES * 2) / (line.length + 1));
  for (let i = 0; i < lines; i++) parser.push(`${line}\n`);
  assert.equal(parser.truncated, true);
  assert.ok(Buffer.byteLength(parser.plainOutput, "utf8") <= OUTPUT_ACCUMULATION_CAP_BYTES);
});

test("an oversized unterminated push is dropped and reported as truncated", () => {
  const parser = createPiOutputParser();
  parser.push("y".repeat(OUTPUT_ACCUMULATION_CAP_BYTES + 1));
  assert.equal(parser.truncated, true);
  assert.equal(parser.plainOutput, "");
});

test("an oversized single JSON line cannot exceed the cap in finalOutput", () => {
  const parser = createPiOutputParser();
  const huge = JSON.stringify({
    type: "message_end",
    message: { role: "assistant", content: [{ type: "text", text: "z".repeat(OUTPUT_ACCUMULATION_CAP_BYTES * 2) }] },
  });
  parser.push(`${huge}\n`);
  assert.ok(
    Buffer.byteLength(parser.finalOutput, "utf8") <= OUTPUT_ACCUMULATION_CAP_BYTES,
    "finalOutput grew past the accumulation cap",
  );
  assert.equal(parser.truncated, true);
});
