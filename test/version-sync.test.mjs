import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { ALL_VERSION_FILES, MANIFEST_FILES } from "../scripts/manifests.mjs";
import { bumpManifests } from "../scripts/bump-version.mjs";
import { checkVersions } from "../scripts/check-version.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

async function makeFixture(t) {
  const root = await mkdtemp(join(tmpdir(), "version-sync-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const rel of ALL_VERSION_FILES) {
    const dest = join(root, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, await readFile(join(repoRoot, rel), "utf8"));
  }
  return root;
}

async function packageVersion(root) {
  return JSON.parse(await readFile(join(root, "package.json"), "utf8")).version;
}

test("the shipped tree keeps every version field in agreement", async () => {
  const { version, mismatches } = await checkVersions(repoRoot);
  assert.equal(version, await packageVersion(repoRoot));
  assert.deepEqual(mismatches, []);
});

test("a disagreeing manifest is reported with its path and expected version", async (t) => {
  const root = await makeFixture(t);
  const target = join(root, "adapters/claude/.claude-plugin/plugin.json");
  const current = await packageVersion(root);
  await writeFile(target, (await readFile(target, "utf8")).replace(`"version": "${current}"`, '"version": "9.9.9"'));

  const { mismatches } = await checkVersions(root);
  assert.equal(mismatches.length, 1);
  assert.match(mismatches[0].file, /adapters\/claude/);
  assert.equal(mismatches[0].actual, "9.9.9");
  assert.equal(mismatches[0].expected, current);
});

test("bumpManifests rewrites every manifest to the package version and nothing else", async (t) => {
  const root = await makeFixture(t);
  const current = await packageVersion(root);
  const original = new Map();
  for (const rel of ALL_VERSION_FILES) original.set(rel, await readFile(join(root, rel), "utf8"));

  const expectedLock = original
    .get("package-lock.json")
    .split(`"version": "${current}"`)
    .join('"version": "2.0.0"');
  await writeFile(
    join(root, "package.json"),
    original.get("package.json").replace(`"version": "${current}"`, '"version": "2.0.0"'),
  );
  await writeFile(join(root, "package-lock.json"), expectedLock);

  const bumped = await bumpManifests(root);
  assert.deepEqual(bumped, MANIFEST_FILES);

  for (const rel of MANIFEST_FILES) {
    const expected = original.get(rel).split(`"version": "${current}"`).join('"version": "2.0.0"');
    assert.equal(await readFile(join(root, rel), "utf8"), expected, rel);
  }
  assert.equal(await readFile(join(root, "package-lock.json"), "utf8"), expectedLock);
});

test("bumpManifests fails without writing when manifests disagree", async (t) => {
  const root = await makeFixture(t);
  const current = await packageVersion(root);
  const target = join(root, "adapters/omp/.claude-plugin/plugin.json");
  await writeFile(target, (await readFile(target, "utf8")).replace(`"version": "${current}"`, '"version": "9.9.9"'));

  const before = new Map();
  for (const rel of ALL_VERSION_FILES) before.set(rel, await readFile(join(root, rel), "utf8"));

  await assert.rejects(() => bumpManifests(root), /disagree/i);
  for (const rel of ALL_VERSION_FILES) {
    assert.equal(await readFile(join(root, rel), "utf8"), before.get(rel), rel);
  }
});
