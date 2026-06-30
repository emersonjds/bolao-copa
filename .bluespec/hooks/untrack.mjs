#!/usr/bin/env node

// src/hooks/untrack/index.ts
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
});
var removeEntries = (map, names) => {
  let wanted = new Set(names), kept = map.entries.filter((entry) => !wanted.has(entry.name)), removed = map.entries.filter((entry) => wanted.has(entry.name)).map((entry) => entry.name), notFound = names.filter(
    (name) => !map.entries.some((entry) => entry.name === name)
  );
  return {
    updatedMap: { name: "blue-spec", entries: kept },
    removed,
    notFound
  };
};
var toNames = (value) => Array.isArray(value) ? value.filter((name) => typeof name == "string") : [], parseNamePayload = (raw) => {
  let parsed = JSON.parse(raw);
  return toNames(parsed.names);
}, normalizeEntry = (value) => {
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

// src/hooks/untrack/untrack.ts
var untrack = async (targetDir, payload) => {
  let names = parseNamePayload(payload);
  if (names.length === 0)
    throw new Error("untrack input needs `names`, a list of finding names");
  let map = await loadTrackingMap(targetDir), result = removeEntries(map, names);
  return serializeTrackingMap(map) !== serializeTrackingMap(result.updatedMap) && await writeTrackingMap(targetDir, result.updatedMap), `${JSON.stringify(
    { removed: result.removed, notFound: result.notFound },
    null,
    2
  )}
`;
};

// src/hooks/untrack/index.ts
await runHook(import.meta.url, (args) => untrack(cwd(), args[0] ?? ""));
