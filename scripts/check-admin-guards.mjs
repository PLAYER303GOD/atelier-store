// Fails if any admin entry point could run without checking the admin role on the server.
//   pnpm check:admin            (optionally: node scripts/check-admin-guards.mjs <srcDir>)
//
// Rules (hiding links protects nothing: pages are URLs and Server Actions are public POSTs):
//   1. Every page under src/app/admin awaits requireAdmin(…).
//   2. Every route handler under src/app/admin or src/app/api/admin calls getAdminForAction() in
//      each exported HTTP method before anything else. Handlers it can't inspect (arrows,
//      `export { x as GET }`) are rejected.
//   3. Every "use server" file whose path mentions "admin" starts each exported function with
//        const <name> = await getAdminForAction();
//        if (!<name>) return …;
// Comments are stripped first, so a mention in a comment doesn't count as a check.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SRC = process.argv[2] ?? join(process.cwd(), "src");
const problems = [];
let pages = 0;
let handlers = 0;
let actions = 0;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const rel = (path) => relative(process.cwd(), path).split(sep).join("/");

/**
 * Every value export, whatever its syntax: `{ name, body }` for `export (async) function name() {}`
 * (body = text up to the matching brace), `body: null` for anything whose body can't be inspected
 * reliably: `export const/let/var` (arrows, wrappers), export lists and aliases
 * (`export { handler as GET }`, re-exports) and non-function default exports. Callers reject those.
 */
function exportedFunctions(code) {
  const out = [];
  const declared = /export\s+(?:default\s+)?(?:async\s+)?function\s*\*?\s*(\w+)\s*\([^)]*\)[^{]*\{/g;
  for (let m; (m = declared.exec(code)); ) {
    let depth = 1;
    let i = declared.lastIndex;
    for (; i < code.length && depth > 0; i++) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") depth--;
    }
    out.push({ name: m[1], body: code.slice(declared.lastIndex, i - 1) });
  }
  for (const m of code.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g)) out.push({ name: m[1], body: null });
  // `export { a, b as GET }` / `export { x } from "…"` (but not `export type { … }`).
  for (const m of code.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && !name.startsWith("type ")) out.push({ name, body: null });
    }
  }
  for (const m of code.matchAll(/export\s*\*\s*(?:as\s+(\w+)\s*)?from/g)) out.push({ name: m[1] ?? "*", body: null });
  if (/export\s+default\s+(?!(?:async\s+)?function\b)/.test(code)) out.push({ name: "default", body: null });
  return out;
}

const GUARD = /^\s*const\s+(\w+)\s*=\s*await\s+getAdminForAction\(\s*\)\s*;\s*if\s*\(\s*!\s*\1\s*\)\s*return\b/;

const files = walk(SRC).filter((f) => /\.(t|j)sx?$/.test(f));
for (const file of files) {
  const path = rel(file);
  const code = stripComments(readFileSync(file, "utf8"));

  if (/\/app\/admin\/(.+\/)?page\.tsx$/.test(path)) {
    pages++;
    // Awaited: an unawaited call returns a promise and lets the page render before the check runs.
    if (!/\bawait\s+requireAdmin\s*\(/.test(code)) problems.push(`${path}: page never awaits requireAdmin()`);
  }

  if (/\/app\/(api\/)?admin\/(.+\/)?route\.(t|j)s$/.test(path)) {
    for (const fn of exportedFunctions(code).filter((f) => /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(f.name))) {
      handlers++;
      if (!fn.body) problems.push(`${path}: ${fn.name} can't be checked; write it as \`export async function ${fn.name}(…)\``);
      else if (!GUARD.test(fn.body)) problems.push(`${path}: ${fn.name} doesn't start with the getAdminForAction() check`);
    }
  }

  const isServerFile = /^\s*["']use server["']/.test(code);
  if (isServerFile && /admin/i.test(path)) {
    for (const fn of exportedFunctions(code)) {
      actions++;
      if (!fn.body) problems.push(`${path}: ${fn.name} can't be checked (arrow, alias or re-export); write admin actions as \`export async function\``);
      else if (!GUARD.test(fn.body)) problems.push(`${path}: ${fn.name} doesn't start with \`const admin = await getAdminForAction(); if (!admin) return …\``);
    }
  }
}

if (pages === 0) problems.push(`No admin pages found under ${rel(SRC)}/app/admin (wrong directory?)`);

console.log(`Checked ${pages} admin page(s), ${handlers} admin route handler(s), ${actions} admin action(s).`);
if (problems.length) {
  console.error(`\n✗ ${problems.length} unguarded admin entry point(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("✓ Every admin page, route handler and action checks the admin role on the server.");
