import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("snapshot publication preserves data, uses unique revisions, and rejects stale writers", () => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "rift-snapshot-test-"));
  const remote = path.join(fixture, "remote.git");
  const repo = path.join(fixture, "source");
  const script = fileURLToPath(new URL("snapshot-store.mjs", import.meta.url));
  const run = (args, cwd = repo, options = {}) => execFileSync("git", args, {
    cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...options
  }).trim();
  mkdirSync(remote);
  run(["init", "--bare"], remote);
  run(["clone", remote, repo], fixture);
  run(["config", "user.name", "Snapshot test"]);
  run(["config", "user.email", "test@example.invalid"]);
  mkdirSync(path.join(repo, "data"));
  const first = { updatedAt: "2026-11-07T00:00:00Z", players: [], matches: [{ matchId: "old" }], lpHistory: [{ matchId: "old", score: 100 }] };
  writeFileSync(path.join(repo, "data/rift-lab.json"), JSON.stringify(first));
  run(["add", "."]);
  run(["commit", "-m", "Initial source"]);
  run(["push", "origin", "HEAD:refs/heads/site-snapshots"]);
  const sourceHead = run(["rev-parse", "HEAD"]);
  const env = { ...process.env, GITHUB_ENV: "", GITHUB_OUTPUT: "", EXISTING_DATA_URL: "http://127.0.0.1:1/not-used" };
  const snapshot = (action, id) => execFileSync(process.execPath, [script, action], {
    cwd: repo, env: { ...env, GITHUB_RUN_ID: String(id) }, stdio: "pipe"
  });
  snapshot("load", 1);
  assert.deepEqual(JSON.parse(readFileSync(path.join(repo, ".publication-state/baseline.json"))), first);

  const next = { ...first, updatedAt: "2026-11-07T00:05:00Z", matches: [...first.matches, { matchId: "new" }], lpHistory: [...first.lpHistory, { matchId: "new", score: 120 }] };
  mkdirSync(path.join(repo, "dist/data"), { recursive: true });
  writeFileSync(path.join(repo, "dist/data/rift-lab.json"), JSON.stringify(next));
  writeFileSync(path.join(repo, "dist/index.html"), "Snapshot page");
  snapshot("save", 2);
  const published = run(["ls-remote", "origin", "refs/heads/site-snapshots"]).split(/\s/)[0];
  assert.notEqual(published, sourceHead);
  assert.equal(run(["rev-parse", "HEAD"]), sourceHead);
  assert.equal(run(["diff", "--cached", "--name-only"]), "");
  assert.deepEqual(JSON.parse(run(["show", `${published}:data/rift-lab.json`])), next);
  snapshot("load", 3);
  assert.deepEqual(JSON.parse(readFileSync(path.join(repo, ".publication-state/baseline.json"))), next);
  snapshot("save", 3);
  const second = run(["ls-remote", "origin", "refs/heads/site-snapshots"]).split(/\s/)[0];
  assert.notEqual(second, published);
  assert.equal(run(["rev-parse", `${second}^`]), published);

  snapshot("load", 4);
  const competing = run(["commit-tree", run(["rev-parse", `${second}^{tree}`]), "-p", second], repo, { input: "Competing publisher\n" });
  run(["push", "origin", `${competing}:refs/heads/site-snapshots`]);
  assert.throws(() => snapshot("save", 4));
  assert.equal(run(["ls-remote", "origin", "refs/heads/site-snapshots"]).split(/\s/)[0], competing);
});
