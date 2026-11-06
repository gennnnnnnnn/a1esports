import { execFileSync } from "node:child_process";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const state = path.join(root, ".publication-state");
const branch = "site-snapshots";
const remoteRef = `refs/remotes/origin/${branch}`;
const git = (args, options = {}) => execFileSync("git", args, {
  cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024,
  stdio: ["pipe", "pipe", "pipe"], ...options
}).trim();

function validate(data) {
  if (!data.updatedAt || !Array.isArray(data.players) || !Array.isArray(data.matches) || !Array.isArray(data.lpHistory)) {
    throw new Error("Snapshot is missing its timestamp, players, matches, or LP history.");
  }
  return data;
}

async function output(name, value) {
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

await mkdir(state, { recursive: true });
if (process.argv[2] === "load") {
  const refs = git(["ls-remote", "--heads", "origin", `refs/heads/${branch}`]);
  let parent = "";
  let data;
  if (refs) {
    git(["fetch", "--depth=1", "--no-tags", "origin", `refs/heads/${branch}:${remoteRef}`]);
    parent = git(["rev-parse", remoteRef]);
    data = validate(JSON.parse(git(["show", `${parent}:data/rift-lab.json`])));
  } else {
    const response = await fetch(process.env.EXISTING_DATA_URL || "https://gennnnnnnnn.github.io/a1esports/data/rift-lab.json", {
      cache: "no-store", signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`Initial snapshot HTTP ${response.status}`);
    data = validate(await response.json());
    console.warn("Bootstrapping snapshot storage from the existing public data.");
  }
  const baseline = path.join(state, "baseline.json");
  await writeFile(baseline, `${JSON.stringify(data, null, 2)}\n`);
  await writeFile(path.join(state, "parent"), parent);
  if (process.env.GITHUB_ENV) await appendFile(process.env.GITHUB_ENV, `BASELINE_DATA_PATH=${baseline}\n`);
  console.log(`Loaded durable baseline ${data.updatedAt}: ${data.matches.length} matches, ${data.lpHistory.length} LP snapshots.`);
} else if (process.argv[2] === "save") {
  const dist = path.join(root, "dist");
  const data = validate(JSON.parse(await readFile(path.join(dist, "data/rift-lab.json"), "utf8")));
  const parent = (await readFile(path.join(state, "parent"), "utf8")).trim();
  const gitDir = git(["rev-parse", "--absolute-git-dir"]);
  const env = {
    ...process.env, GIT_INDEX_FILE: path.join(state, "index"),
    GIT_AUTHOR_NAME: "Rift Lab updater", GIT_AUTHOR_EMAIL: "rift-lab@users.noreply.github.com",
    GIT_COMMITTER_NAME: "Rift Lab updater", GIT_COMMITTER_EMAIL: "rift-lab@users.noreply.github.com"
  };
  git(["read-tree", "--empty"], { env });
  git(["--git-dir", gitDir, "--work-tree", dist, "add", "--all", "--", "."], { cwd: dist, env });
  const tree = git(["write-tree"], { env });
  const run = process.env.GITHUB_RUN_ID || Date.now();
  const sha = git(["commit-tree", tree, ...(parent ? ["-p", parent] : [])], {
    env, input: `Publish ${data.updatedAt} (run ${run}, attempt ${process.env.GITHUB_RUN_ATTEMPT || 1})\n`
  });
  // A normal fast-forward push rejects a competing writer instead of losing its data.
  git(["push", "origin", `${sha}:refs/heads/${branch}`]);
  await output("sha", sha);
  console.log(`Saved immutable publication snapshot ${sha}.`);
} else {
  throw new Error("Usage: node scripts/snapshot-store.mjs load|save");
}
