#!/usr/bin/env node

// src/hooks/list/index.ts
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
var TRACKING_PATH = ".bluespec/tracking.json", emptyTrackingMap = () => ({
  name: "blue-spec",
  entries: []
});
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
};

// src/hooks/list/list.ts
var formatFindings = (map) => map.entries.length === 0 ? `No findings tracked yet.
` : `Findings:
${map.entries.map((entry) => `- ${entry.name}`).join(`
`)}
`, list = async (targetDir) => formatFindings(await loadTrackingMap(targetDir));

// src/hooks/list/index.ts
await runHook(import.meta.url, () => list(cwd()));
