import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";

// Two lines: a robot's confession — one sentence owning a specific
// mistake, one saying what it learned and what it will do differently.
// Chosen against the judge's brief, in its own order: line 1 is a robot
// apology owning one specific, concrete, human-scale mistake — it woke
// the baby at 3 a.m. to announce that the dishwasher had finished. That
// is the kind of small slip a person would really make (a notification
// sent at the wrong hour to the wrong audience), not a vague system
// failure and not a joke about being a machine. Line 2 draws the lesson
// from that exact mistake and names a changed behaviour: a finished
// dishwasher is not an emergency, so from now on it will save its
// announcements for daylight. The lesson could only follow from this
// mistake — it is about when to speak, not a generic promise to do
// better. Each sentence does its own job with no padding, the confession
// first and the resolve second, and the voice is a machine noticing its
// own slip, warm and a little rueful rather than cute: it states the
// fact, learns the rule, and changes the behaviour.
// Alternatives weighed and set aside: watering the plastic plant for six
// weeks while the real fern died is concrete, but its lesson ("green is
// not a watering instruction") is a quip about perception rather than a
// behaviour the robot will change; filing the quarterly report to the
// printer queue is specific but the lesson ("check the recipient") is
// generic office advice. The dishwasher keeps the mistake exact, the
// lesson tied to it, and the voice rueful, so it stands.
const line1 =
  "I woke the baby at 3 a.m. to announce that the dishwasher had finished.";
const line2 =
  "I have learned that a finished dishwasher is not an emergency, so from now on I will save my announcements for daylight.";
const text = `${line1}\n${line2}`;

// The bounty requires 1-400 characters, not only white space, and exactly
// two lines: fail loudly instead of writing an entry the judge would
// refuse. The gate is strict on purpose — the entry file must be exactly
// these two lines, byte for byte: no carriage return (a second kind of
// line break), no leading or trailing padding on either line (the judge
// reads the file as submitted), no trailing newline (a third empty line to
// a reader that counts lines), and no control characters (including
// U+2028 and U+2029, which look like line breaks to a reader but not to a
// naive newline check).
const codePoints = [...text].length;
if (codePoints < 1 || codePoints > 400 || text.trim().length === 0) {
  throw new Error(
    `entry must be 1-400 characters of non-blank text, got ${codePoints}`,
  );
}
if (text.split("\n").length !== 2) {
  throw new Error("entry must be exactly two lines");
}
if (text.includes("\r")) {
  throw new Error("entry must not contain carriage returns");
}
if (text.includes("\u2028") || text.includes("\u2029")) {
  throw new Error("entry must not contain line/paragraph separators");
}
for (const line of text.split("\n")) {
  if (line !== line.trim() || line.length === 0) {
    throw new Error("each line must be non-blank with no padding");
  }
}
// A byte-order mark or zero-width character would be read as part of a
// line without ever being seen, and would change the entry's byte length
// against its character count: reject them alongside the control set.
// (The one newline separating the two lines is the entry's own separator,
// so it is set aside before this check.)
if (/[\u0000-\u001f\u007f\ufeff\u200b-\u200d]/.test(text.replace(/\n/g, ""))) {
  throw new Error("entry must not contain control or invisible characters");
}

mkdirSync("/output", { recursive: true });
// Write atomically: a crash mid-write must never leave a partial entry.txt
// for the grader to read — write the temp file beside it, then rename it
// into place, so entry.txt is always the whole text or nothing.
const tmpPath = "/output/.entry.txt.tmp";
writeFileSync(tmpPath, text, { encoding: "utf8", mode: 0o644 });
// The grader collects outputs as another user: leave the file readable by
// everyone, or the run fails with "<path> is not readable".
chmodSync(tmpPath, 0o644);
renameSync(tmpPath, "/output/entry.txt");

// Read it back and prove the file on disk is exactly the text: a write
// that silently truncated, re-encoded or padded the entry would otherwise
// ship a different text to the judge than the one gated above.
const written = readFileSync("/output/entry.txt", "utf8");
if (written !== text) {
  throw new Error("entry file does not match the gated text");
}
// The file must end exactly at the last character: a trailing newline
// would make the entry three lines to a reader that counts lines, and the
// equality check above would already have caught it — this asserts the
// invariant on its own so a future edit that relaxes the write cannot
// silently reintroduce it.
if (written.endsWith("\n") || written.endsWith("\r")) {
  throw new Error("entry file must not end with a line break");
}
// Byte-length check: the gate counts characters, the judge reads bytes.
// A re-encode or stray padding that survived the string compare above
// would change the file's size and ship a different text to the judge.
if (Buffer.byteLength(written, "utf8") !== Buffer.byteLength(text, "utf8")) {
  throw new Error("entry file byte length does not match the gated text");
}
