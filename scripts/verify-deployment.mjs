import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const url = process.env.EXISTING_DATA_URL || "https://gennnnnnnnn.github.io/a1esports/data/rift-lab.json";
const expected = JSON.parse(await readFile(new URL("../data/rift-lab.json", import.meta.url), "utf8"));
const digest = (data) => createHash("sha256").update(JSON.stringify(data)).digest("hex");
const expectedDigest = digest(expected);
let lastError;

for (let attempt = 1; attempt <= 9; attempt += 1) {
  try {
    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}verify=${Date.now()}-${attempt}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Accept: "application/json" },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const actual = await response.json();
    if (digest(actual) !== expectedDigest) {
      throw new Error(`Published data is stale or different: expected ${expected.updatedAt}, received ${actual.updatedAt}`);
    }
    console.log(`Verified public data: ${actual.updatedAt}, ${actual.matches?.length || 0} match records.`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.warn(`Publication verification ${attempt}/9: ${error.message}`);
    if (attempt < 9) await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}

throw new Error(`Pages did not publish the generated data: ${lastError.message}`);
