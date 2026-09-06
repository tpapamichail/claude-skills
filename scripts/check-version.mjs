#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { ALL_VERSION_FILES, versionFieldsOf } from "./manifests.mjs";

export async function checkVersions(root) {
  const version = JSON.parse(await readFile(join(root, "package.json"), "utf8")).version;
  const mismatches = [];
  for (const file of ALL_VERSION_FILES) {
    const json = JSON.parse(await readFile(join(root, file), "utf8"));
    for (const actual of versionFieldsOf(file, json)) {
      if (actual !== version) mismatches.push({ file, actual, expected: version });
    }
  }
  return { version, mismatches };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const { version, mismatches } = await checkVersions(root);
  if (mismatches.length > 0) {
    console.error(`Version drift detected (package.json expects ${version}):`);
    for (const { file, actual } of mismatches) {
      console.error(`  ${file}: ${actual ?? "missing"}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`All version fields agree on ${version}.`);
  }
}
