#!/usr/bin/env node

// src/hooks/repair/index.ts
import { cwd } from "node:process";

// src/cli/run-hook.ts
import process, { argv, stderr, stdout } from "node:process";
import { pathToFileURL } from "node:url";
var runHook = async (moduleUrl, handler) => {
  if (moduleUrl === pathToFileURL(argv[1]).href)
    try {
      stdout.write(await handler(argv.slice(2)));
    } catch (error) {
      stderr.write(`${error instanceof Error ? error.message : String(error)}
`), process.exitCode = 1;
    }
};

// src/core/tracking.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// src/core/fs-actions.ts
import { mkdir, writeFile } from "node:fs/promises";
var ensureDir = async (dir) => {
  await mkdir(dir, { recursive: !0 });
};
var writeFileOverwrite = async (filePath, contents) => {
  await writeFile(filePath, contents, "utf8");
};

// src/core/tracking.ts
var TRACKING_DIR = ".bluespec", TRACKING_PATH = ".bluespec/tracking.json", emptyTrackingMap = () => ({
  name: "blue-spec",
  entries: []
}), samePaths = (left, right) => {
  if (left.length !== right.length) return !1;
  let sortedRight = right.toSorted();
  return left.toSorted().every((path, index) => path === sortedRight[index]);
}, matchItem = (observed, map) => {
  let existing = map.entries.find((entry) => entry.name === observed.name);
  if (existing) {
    let classification = samePaths(
      existing.paths,
      observed.paths
    ) ? "unchanged" : "moved";
    return {
      entry: { name: existing.name, paths: [...observed.paths] },
      classification: { name: existing.name, classification }
    };
  }
  return {
    entry: { name: observed.name, paths: [...observed.paths] },
    classification: { name: observed.name, classification: "new" }
  };
}, upsert = (entries, next) => entries.some((entry) => entry.name === next.name) ? entries.map((entry) => entry.name === next.name ? next : entry) : [...entries, next], foldEntries = (map, observed) => observed.reduce(
  (state, item) => {
    let match = matchItem(item, state.map);
    return {
      map: {
        name: "blue-spec",
        entries: upsert(state.map.entries, match.entry)
      },
      classifications: [...state.classifications, match.classification]
    };
  },
  { map, classifications: [] }
);
var isObservedEntry = (value) => typeof value == "object" && value !== null && typeof value.name == "string" && Array.isArray(value.paths) && value.paths.every((path) => typeof path == "string"), toObservedEntries = (value) => Array.isArray(value) ? value.filter(isObservedEntry).map((entry) => ({ name: entry.name, paths: [...entry.paths] })) : [], parseObservedPayload = (raw) => {
  let parsed = JSON.parse(raw);
  return toObservedEntries(parsed.entries);
};
var normalizeEntry = (value) => {
  if (typeof value != "object" || value === null) return;
  let candidate = value, { name } = candidate, paths = Array.isArray(candidate.paths) ? candidate.paths.filter((path) => typeof path == "string") : [];
  if (typeof name == "string")
    return { name, paths };
}, parseTrackingMap = (raw) => {
  let parsed = JSON.parse(raw);
  return typeof parsed != "object" || parsed === null || !Array.isArray(parsed.entries) ? emptyTrackingMap() : { name: "blue-spec", entries: parsed.entries.map(normalizeEntry).filter((entry) => entry !== void 0) };
}, loadTrackingMap = async (targetDir) => {
  try {
    let raw = await readFile(join(targetDir, TRACKING_PATH), "utf8");
    return parseTrackingMap(raw);
  } catch {
    return emptyTrackingMap();
  }
}, serializeTrackingMap = (map) => `${JSON.stringify(map, null, 2)}
`, writeTrackingMap = async (targetDir, map) => {
  await ensureDir(join(targetDir, TRACKING_DIR)), await writeFileOverwrite(
    join(targetDir, TRACKING_PATH),
    serializeTrackingMap(map)
  );
};

// src/hooks/repair/repair.ts
var orphanReason = (entry, observed) => observed.some(
  (item) => item.name !== entry.name && samePaths(item.paths, entry.paths)
) ? "renamed-candidate" : "orphan", repairEntries = (map, observed) => {
  let folded = foldEntries(map, observed), observedNames = new Set(observed.map((item) => item.name)), unresolved = map.entries.filter((entry) => !observedNames.has(entry.name)).map((entry) => ({
    name: entry.name,
    paths: [...entry.paths],
    reason: orphanReason(entry, observed)
  }));
  return {
    updatedMap: folded.map,
    classifications: folded.classifications,
    unresolved
  };
}, repair = async (targetDir, payload) => {
  let entries = parseObservedPayload(payload);
  if (entries.length === 0)
    throw new Error(
      "repair input needs `entries`, each an item with `name` and `paths`"
    );
  let map = await loadTrackingMap(targetDir), result = repairEntries(map, entries);
  return serializeTrackingMap(map) !== serializeTrackingMap(result.updatedMap) && await writeTrackingMap(targetDir, result.updatedMap), `${JSON.stringify(
    {
      classifications: result.classifications,
      unresolved: result.unresolved
    },
    null,
    2
  )}
`;
};

// src/hooks/repair/index.ts
await runHook(import.meta.url, (args) => repair(cwd(), args[0] ?? ""));
