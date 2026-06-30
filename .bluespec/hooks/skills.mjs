#!/usr/bin/env node

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

// src/hooks/skills/catalog.ts
var SKILLS_CATALOG = [
  {
    name: "regex",
    tags: ["RegExp", "Regular Expression"]
  },
  {
    name: "javascript",
    tags: ["JavaScript", "Node.js", "Deno", "Bun", "TypeScript", "Workers"]
  },
  {
    name: "browser",
    tags: ["Browser", "DOM", "Navigator"]
  }
];

// src/hooks/skills/skills.ts
var list = (catalog) => catalog.length === 0 ? `No sub-skills available.
` : `${catalog.map(
  (entry) => `${entry.name}: ${entry.tags.join(", ")}`
).join(`
`)}
`;

// src/hooks/skills/index.ts
await runHook(import.meta.url, () => list(SKILLS_CATALOG));
