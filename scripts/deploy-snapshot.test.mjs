import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const deploy = createRequire(import.meta.url)("./deploy-snapshot.cjs");

test("Pages deploys the stored snapshot revision and checks its terminal status", async () => {
  const before = { sha: process.env.SNAPSHOT_SHA, artifact: process.env.PAGES_ARTIFACT_ID, timer: global.setTimeout };
  process.env.SNAPSHOT_SHA = "1".repeat(40);
  process.env.PAGES_ARTIFACT_ID = "123";
  global.setTimeout = (callback) => before.timer(callback, 0);
  try {
    for (const status of ["succeed", "built", "deployment_failed"]) {
      const requests = [];
      const outputs = {};
      const github = { request: async (route, body) => {
        requests.push({ route, body });
        return route.startsWith("POST")
          ? { data: { id: "deployment", page_url: "https://example.invalid/" } }
          : { data: { status } };
      } };
      const core = { info() {}, getIDToken: async () => "test-oidc-token", setOutput: (key, value) => { outputs[key] = value; } };
      const work = deploy({ github, core, context: { sha: "2".repeat(40), repo: { owner: "owner", repo: "repo" } } });
      if (["succeed", "built"].includes(status)) {
        await work;
        assert.equal(outputs.page_url, "https://example.invalid/");
      } else {
        await assert.rejects(work, /deployment_failed/);
        assert.equal(outputs.page_url, undefined);
      }
      assert.equal(requests[0].body.pages_build_version, "1".repeat(40));
      assert.equal(requests[0].body.artifact_id, 123);
      assert.equal(requests[1].body.pages_deployment_id, "deployment");
    }
  } finally {
    global.setTimeout = before.timer;
    if (before.sha === undefined) delete process.env.SNAPSHOT_SHA; else process.env.SNAPSHOT_SHA = before.sha;
    if (before.artifact === undefined) delete process.env.PAGES_ARTIFACT_ID; else process.env.PAGES_ARTIFACT_ID = before.artifact;
  }
});
