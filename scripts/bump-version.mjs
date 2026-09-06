#!/usr/bin/env node

// Rewrites the six manifest files to package.json's version after
// `npm version <new> --no-git-tag-version`. package-lock.json is owned by
// npm itself and is deliberately left untouched.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { MANIFEST_FILES, versionFieldsOf } from "./manifests.mjs";

export async function bumpManifests(root) {
  const next = JSON.parse(await readFile(join(root, "package.json"), "utf8")).version;

  const texts = new Map();
  const currents = new Set();
  for (const file of MANIFEST_FILES) {
    const text = await readFile(join(root, file), "utf8");
    texts.set(file, text);
    for (const current of versionFieldsOf(file, JSON.parse(text))) currents.add(current);
  }
  if (currents.size !== 1) {
    throw new Error(
      `Manifest versions disagree (${[...currents].join(", ")}); resolve with npm run check:version before bumping.`,
    );
  }
  const [current] = currents;

  for (const file of MANIFEST_FILES) {
    const text = texts.get(file);
    const needle = `"version": "${current}"`;
    if (!text.includes(needle)) {
      throw new Error(`Expected "${needle}" in ${file}; refusing a partial rewrite.`);
    }
    await writeFile(join(root, file), text.split(needle).join(`"version": "${next}"`));
  }
  return [...MANIFEST_FILES];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const files = await bumpManifests(root);
  console.log(`Bumped ${files.length} manifests to ${await readFile(join(root, "package.json"), "utf8").then((t) => JSON.parse(t).version)}.`);
}
