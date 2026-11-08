import assert from "node:assert/strict";
import test from "node:test";
import { riotRouting, matchRegionForId } from "./riot-routing.mjs";

test("legacy Vietnam players retain their routes while Japan uses Asia", () => {
  assert.deepEqual(riotRouting(), { platformRegion: "vn2", matchRegion: "sea" });
  assert.deepEqual(riotRouting({ platformRegion: "JP1" }), { platformRegion: "jp1", matchRegion: "asia" });
  assert.equal(matchRegionForId("VN2_123"), "sea");
  assert.equal(matchRegionForId("JP1_123"), "asia");
  assert.equal(matchRegionForId("KR_123"), "asia");
  assert.throws(() => riotRouting({ platformRegion: "unknown" }), /Unsupported/);
});
