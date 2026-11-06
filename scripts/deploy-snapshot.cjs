module.exports = async ({ github, context, core }) => {
  const sha = process.env.SNAPSHOT_SHA;
  if (!/^[a-f0-9]{40}$/.test(sha || "")) throw new Error("Missing publication snapshot commit.");
  const artifactId = Number(process.env.PAGES_ARTIFACT_ID);
  if (!Number.isSafeInteger(artifactId) || artifactId <= 0) throw new Error("Missing Pages artifact ID.");
  const parameters = { owner: context.repo.owner, repo: context.repo.repo };
  const { data } = await github.request("POST /repos/{owner}/{repo}/pages/deployments", {
    ...parameters,
    artifact_id: artifactId,
    pages_build_version: sha,
    oidc_token: await core.getIDToken()
  });
  core.info(`Deploying snapshot ${sha}, Pages deployment ${data.id}.`);
  const deadline = Date.now() + 600000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const { data: deployment } = await github.request("GET /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}", {
      ...parameters, pages_deployment_id: data.id
    });
    core.info(`Pages publication: ${deployment.status}`);
    if (["succeed", "built"].includes(deployment.status)) {
      core.setOutput("page_url", data.page_url);
      return;
    }
    if (["deployment_failed", "deployment_content_failed", "deployment_perms_error", "deployment_cancelled", "deployment_lost"].includes(deployment.status)) {
      throw new Error(`Pages publication failed: ${deployment.status}`);
    }
  }
  throw new Error(`Pages publication timed out for snapshot ${sha}.`);
};
