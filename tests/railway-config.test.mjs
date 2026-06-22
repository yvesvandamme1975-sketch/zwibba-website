import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const configPath = fileURLToPath(new URL("../railway.json", import.meta.url));

test("railway website config is deploy-only and health-checked", () => {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  assert.equal(config.deploy.healthcheckPath, "/");
  assert.equal(config.deploy.restartPolicyType, "ON_FAILURE");
  assert.equal("build" in config, false);
});
