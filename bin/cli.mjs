#!/usr/bin/env node
// cyber-course-sync: sync a Cyber Courses content repo's structure to CyberBackend.
//
//   npx github:Cyber-Courses/cyber-course-sync sync [--dry-run] [path/to/course.json]
//
// Auth (one of):
//   - CYBERAUTH_CLIENT_ID + CYBERAUTH_CLIENT_SECRET (machine client, for CI)
//   - CYBERAUTH_ACCESS_TOKEN (a token you already hold)
//   - `cyber-course-sync login` (interactive, for local authoring)  [coming soon]
import { runSync } from "../lib/sync.mjs";

const [cmd, ...rest] = process.argv.slice(2);

function usage() {
  console.log(`cyber-course-sync <command>

Commands:
  sync [--dry-run] [course.json]   Push this content repo's structure to CyberBackend.
  login                            Authenticate for local authoring (device flow).
  help                             Show this help.

Env: CYBERBACKEND_URL (default https://cyberbackend.com),
     CYBERAUTH_CLIENT_ID + CYBERAUTH_CLIENT_SECRET, or CYBERAUTH_ACCESS_TOKEN.`);
}

try {
  if (cmd === "sync") {
    const dryRun = rest.includes("--dry-run");
    const manifestPath = rest.find((a) => !a.startsWith("-")) ?? "course.json";
    await runSync({ manifestPath, dryRun });
  } else if (cmd === "login") {
    // Device Authorization Grant against Cyber Auth, so authors never handle a
    // machine secret locally. Pending backend device-flow support; until then use
    // CYBERAUTH_CLIENT_ID/SECRET or CYBERAUTH_ACCESS_TOKEN.
    console.error("`login` is not available yet. Set CYBERAUTH_CLIENT_ID/CYBERAUTH_CLIENT_SECRET (or CYBERAUTH_ACCESS_TOKEN) for now.");
    process.exit(1);
  } else {
    usage();
    process.exit(cmd && cmd !== "help" ? 1 : 0);
  }
} catch (e) {
  console.error("error:", e.message);
  process.exit(1);
}
