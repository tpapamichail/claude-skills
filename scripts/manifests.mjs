// Single source of truth for every file carrying a release version.
export const MANIFEST_FILES = [
  "plugin.json",
  ".claude-plugin/marketplace.json",
  ".omp-plugin/marketplace.json",
  "adapters/claude/.claude-plugin/plugin.json",
  "adapters/omp/.claude-plugin/plugin.json",
];

export const ALL_VERSION_FILES = ["package.json", "package-lock.json", ...MANIFEST_FILES];

// Returns every version field a given file contributes.
export function versionFieldsOf(file, json) {
  if (file === "package-lock.json") return [json.version, json.packages?.[""]?.version];
  if (file.endsWith("marketplace.json")) return json.plugins.map((plugin) => plugin.version);
  return [json.version];
}
