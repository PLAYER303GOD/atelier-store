// Fails if any admin entry point could run without checking the admin role on the server.
//   pnpm check:admin            (optionally: node scripts/check-admin-guards.mjs <srcDir>)
//
// Rules (hiding links protects nothing: pages are URLs and Server Actions are public POSTs):
//   1. Every page under src/app/admin calls requireAdmin(…).
//   2. Every route handler under src/app/admin or src/app/api/admin calls getAdminForAction() in
//      each exported HTTP method before anything else.
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

/** Body of each `export (async) function name(…) {` → its text up to the matching brace. */
function exportedFunctions(code) {
  const out = [];
  const re = /export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)[^{]*\{/g;
  for (let m; (m = re.exec(code)); ) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < code.length && depth > 0; i++) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") depth--;
    }
    out.push({ name: m[1], body: code.slice(re.lastIndex, i - 1) });
  }
  const arrows = /export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
  for (let m; (m = arrows.exec(code)); ) out.push({ name: m[1], body: null }); // not checkable: forbid
  return out;
}

const GUARD = /^\s*const\s+(\w+)\s*=\s*await\s+getAdminForAction\(\s*\)\s*;\s*if\s*\(\s*!\s*\1\s*\)\s*return\b/;

const files = walk(SRC).filter((f) => /\.(t|j)sx?$/.test(f));
for (const file of files) {
  const path = rel(file);
  const code = stripComments(readFileSync(file, "utf8"));

  if (/\/app\/admin\/(.+\/)?page\.tsx$/.test(path)) {
    pages++;
    if (!/\brequireAdmin\s*\(/.test(code)) problems.push(`${path}: page never calls requireAdmin()`);
  }

  if (/\/app\/(api\/)?admin\/(.+\/)?route\.(t|j)s$/.test(path)) {
    for (const fn of exportedFunctions(code).filter((f) => /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(f.name))) {
      handlers++;
      if (!fn.body || !GUARD.test(fn.body)) problems.push(`${path}: ${fn.name} doesn't start with the getAdminForAction() check`);
    }
  }

  const isServerFile = /^\s*["']use server["']/.test(code);
  if (isServerFile && /admin/i.test(path)) {
    for (const fn of exportedFunctions(code)) {
      actions++;
      if (!fn.body) problems.push(`${path}: ${fn.name} is an exported arrow; write admin actions as \`export async function\` so the guard can be checked`);
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
