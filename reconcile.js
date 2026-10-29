// Reconcile each transaction using only its latest valid attempt.
const fs = require("fs");

const latestByTxnId = new Map();
const lines = fs.readFileSync("payments.jsonl", "utf8").split(/\r?\n/);

for (const line of lines) {
  if (!line.trim()) continue;

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // Ignore malformed export lines.
  }

  if (!event || typeof event.txn_id !== "string" || typeof event.ts !== "string") continue;
  const timestamp = Date.parse(event.ts);
  if (!Number.isFinite(timestamp)) continue;

  const previous = latestByTxnId.get(event.txn_id);
  if (!previous || timestamp > Date.parse(previous.ts)) {
    latestByTxnId.set(event.txn_id, event);
  }
}

let total = 0;
let count = 0;
for (const event of latestByTxnId.values()) {
  if (event.status !== "success") continue;
  const amount = Number(String(event.amount).replace(/,/g, ""));
  if (!Number.isFinite(amount)) continue;
  total += amount;
  count += 1;
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);
if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
