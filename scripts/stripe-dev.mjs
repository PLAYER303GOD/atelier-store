// Local Stripe webhook helpers (dev only). Needs the Stripe CLI, logged in (`stripe login`).
//
//   pnpm stripe:listen            forward Checkout events to the dev server, saying clearly what
//                                 happened to each one; checks the setup first
//   pnpm stripe:replay <evt_id>   resend one event Stripe already has, signed like `stripe listen`
//                                 (for an event that wasn't delivered)
//
// The webhook's own outcome per event ("AT-… paid", "ignored: …") is logged by the dev server
// (src/app/api/stripe/webhook/route.ts), in the `pnpm dev` terminal.

import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";

import Stripe from "stripe";

// .env.local is optional here (APP_URL / BETTER_AUTH_URL); loaded in-process so any Node with
// process.loadEnvFile (20.12+) works, without the newer --env-file-if-exists flag.
try {
  process.loadEnvFile?.(".env.local");
} catch {
  // no .env.local: fall back to the default URL below
}

/** Exactly the events the webhook handles (HANDLED_EVENTS in src/lib/stripe-webhook.ts). */
const EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
];
/** Bounds a whole delivery, response body included. */
const DELIVERY_TIMEOUT_MS = 15_000;

const color = (code) => (text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
const green = color(32);
const red = color(31);
const dim = color(2);
const bold = color(1);
const time = () => new Date().toLocaleTimeString();
const say = (line) => console.log(`${dim(time())}  ${line}`);

/**
 * Where events go. Signed payloads must not travel in clear text: HTTPS, except plain HTTP to this
 * machine for local development. Checked before anything is sent.
 */
function webhookUrl() {
  const raw = process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3001";
  let url;
  try {
    url = new URL("/api/stripe/webhook", raw);
  } catch {
    throw new Error(`APP_URL / BETTER_AUTH_URL isn't a valid URL: ${raw}`);
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error(`Refusing to send signed webhooks to ${url.origin}: use https (plain http only for localhost).`);
  }
  return url.toString();
}

/**
 * The Stripe CLI as an executable we can run with separate arguments and no shell, so arguments
 * keep their boundaries and stopping the child stops Stripe itself. On Windows the npm install is
 * a .cmd shim around a native stripe.exe, which we locate instead.
 */
function stripeExecutable() {
  if (process.platform !== "win32") return "stripe";
  let found = [];
  try {
    found = execFileSync("where.exe", ["stripe"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    // not on PATH
  }
  const exe = found.find((path) => path.toLowerCase().endsWith(".exe"));
  if (exe) return exe;
  for (const shim of found) {
    for (const arch of ["x64", "arm64", "ia32"]) {
      const pkg = join("@stripe", `cli-win32-${arch}`, "bin", "stripe.exe");
      for (const candidate of [
        join(dirname(shim), "node_modules", "@stripe", "cli", "node_modules", pkg),
        join(dirname(shim), "node_modules", pkg),
      ]) {
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  throw new Error("Couldn't find the Stripe CLI executable. Install it (npm i -g @stripe/cli) and run: stripe login");
}

/** Runs the Stripe CLI and returns its output (it prints banner lines before JSON). */
function stripeCli(exe, args) {
  return execFileSync(exe, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: plainEnv() });
}

/** Ask the CLI for plain text: no colours or terminal hyperlinks in what we parse. */
const plainEnv = () => ({ ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", TERM: "dumb" });

/** Strips ANSI colours and OSC 8 hyperlinks, in case the CLI emits them anyway. */
const plain = (text) =>
  text
    .replace(/\x1b\]8;[^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");

/** The signing secret this machine's `stripe listen` uses (stable per device and account). */
function listenSecret(exe) {
  let out;
  try {
    out = stripeCli(exe, ["listen", "--print-secret"]);
  } catch (error) {
    throw new Error(`The Stripe CLI couldn't give a webhook secret. Is it logged in? Run: stripe login\n${error.stderr ?? ""}`);
  }
  const secret = plain(out).match(/whsec_[A-Za-z0-9]+/)?.[0];
  if (!secret) throw new Error("No whsec_ secret in `stripe listen --print-secret` output. Run: stripe login");
  return secret;
}

/**
 * POSTs a payload to the webhook, signed exactly as Stripe signs it. Never follows a redirect (a
 * signed event must only count as delivered by the configured endpoint itself), and the deadline
 * covers reading the response body too.
 */
async function deliver(url, payload, secret) {
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": signature },
      body: payload,
      redirect: "manual",
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    });
    return { kind: "answered", status: res.status, body: await res.text() };
  } catch (error) {
    if (error?.name === "TimeoutError") return { kind: "timeout" };
    return { kind: "unreachable" };
  }
}

/** What a delivery result most likely means, and what to do. */
function explain(result, url) {
  if (result.kind === "timeout") {
    return `No answer from ${url} within ${DELIVERY_TIMEOUT_MS / 1000}s. The dev server may be busy compiling; check the \`pnpm dev\` terminal.`;
  }
  if (result.kind === "unreachable") return `Can't reach ${url}. Start the app with \`pnpm dev\`.`;
  const { status, body } = result;
  if (status === 400 && body.includes("Invalid signature")) {
    return "STRIPE_WEBHOOK_SECRET in .env.local doesn't match this listener. Run `stripe listen --print-secret`, copy the full whsec_… value into .env.local as STRIPE_WEBHOOK_SECRET, then restart `pnpm dev`.";
  }
  if (status === 500 && body.includes("not configured")) {
    return "The dev server has no STRIPE_WEBHOOK_SECRET / STRIPE_SECRET_KEY. Add them to .env.local and restart `pnpm dev`.";
  }
  if (status >= 300 && status < 400) return `The endpoint redirected (${status}) instead of answering. Check APP_URL / BETTER_AUTH_URL.`;
  if (status >= 500) return "The webhook failed. See the error in the `pnpm dev` terminal (it may also have been recompiling).";
  if (status === 404) return `Nothing at ${url}. Is APP_URL / BETTER_AUTH_URL right?`;
  return `Unexpected answer ${status}: ${body.slice(0, 120)}`;
}

/** One signed, harmless event (a type the webhook ignores) to prove reachability and the secret. */
async function preflight(url, secret) {
  const payload = JSON.stringify({ id: `evt_preflight_${Date.now()}`, object: "event", type: "atelier.preflight", data: { object: {} } });
  const result = await deliver(url, payload, secret);
  if (result.kind === "answered" && result.status === 200) {
    say(green("✓ Webhook reachable and its signing secret matches this listener."));
    return;
  }
  say(red(`✗ Setup problem: ${explain(result, url)} Events received meanwhile will fail.`));
}

async function listen() {
  const url = webhookUrl();
  const exe = stripeExecutable();
  const secret = listenSecret(exe);
  console.log(bold("Stripe → local webhook"));
  say(`Forwarding ${EVENTS.length} Checkout events to ${url}`);
  // Only a prefix: the full secret stays out of logs (`stripe listen --print-secret` shows it).
  say(dim(`Listener secret: ${secret.slice(0, 11)}…  (STRIPE_WEBHOOK_SECRET in .env.local must be this)`));
  await preflight(url, secret);

  // The executable itself, arguments kept separate, no shell: stopping the child stops Stripe.
  const child = spawn(exe, ["listen", "--forward-to", url, "--events", EVENTS.join(",")], {
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: plainEnv(),
  });
  let delivered = 0;
  let failed = 0;

  const onLine = (raw) => {
    const line = plain(raw).trim();
    if (!line || line.includes("claude-code-hint")) return;
    const received = line.match(/-->\s+(\S+)\s+\[(evt_\w+)\]/);
    const answered = line.match(/<--\s+\[(\d{3})\]\s+\S+\s+\S+\s+\[(evt_\w+)\]/);
    if (received) {
      say(`→ ${bold(received[1])} ${dim(received[2])}`);
    } else if (answered) {
      const [, code, evt] = answered;
      if (code.startsWith("2")) {
        delivered++;
        say(green(`  ✓ delivered (${code}) ${dim(evt)}  → outcome in the \`pnpm dev\` terminal`));
      } else {
        failed++;
        say(red(`  ✗ The webhook answered ${code} for ${evt}. Check the \`pnpm dev\` terminal for what happened.`));
        say(red(`    If the order wasn't updated, fix the cause, then resend: ${bold(`pnpm stripe:replay ${evt}`)}`));
      }
    } else if (/Ready!/.test(line)) {
      say(green("✓ Listening. Make a test payment; each event shows up here."));
    } else if (/error|failed/i.test(line)) {
      failed++;
      say(red(`✗ ${line}`));
      if (/connect|refused|dial tcp|timeout/i.test(line)) say(red(`    The dev server didn't answer at ${url}. Is \`pnpm dev\` running?`));
      // Only name an event when this very line does; concurrent deliveries make "the last one" a guess.
      const evt = line.match(/\b(evt_\w+)\b/)?.[1];
      say(
        red(
          evt
            ? `    Once fixed, resend: ${bold(`pnpm stripe:replay ${evt}`)}`
            : `    Once fixed, find the failed event (${bold("stripe events list --limit 5")}) and resend it with ${bold("pnpm stripe:replay <evt_id>")}`,
        ),
      );
    } else {
      say(dim(line));
    }
  };
  const readers = [createInterface({ input: child.stdout }), createInterface({ input: child.stderr })];
  for (const reader of readers) reader.on("line", onLine);

  const stop = () => child.kill();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("error", (error) => {
    say(red(`✗ Couldn't start the Stripe CLI: ${error.message}`));
    process.exitCode = 1;
  });
  // `close` fires after the child's output streams have ended, so every line above is printed first.
  child.on("close", (code, signal) => {
    say(`Listener stopped (${code ?? signal ?? "signal"}). Delivered ${delivered}, failed ${failed}.`);
    process.exitCode = code ?? 0;
  });
}

async function replay(eventId) {
  if (!/^evt_\w+$/.test(eventId ?? "")) throw new Error("Usage: pnpm stripe:replay evt_…");
  const url = webhookUrl();
  const exe = stripeExecutable();
  const secret = listenSecret(exe);
  let out;
  try {
    out = plain(stripeCli(exe, ["events", "retrieve", eventId]));
  } catch (error) {
    throw new Error(`Stripe couldn't find ${eventId} in the account the CLI is logged into.\n${error.stderr ?? ""}`);
  }
  const payload = out.slice(out.indexOf("{")).trim();
  const event = JSON.parse(payload);
  if (event.error) throw new Error(`Stripe: ${event.error.message}`);
  const order = event.data?.object?.metadata?.order_reference;
  say(`Resending ${bold(event.type)} ${dim(event.id)}${order ? ` for order ${bold(order)}` : ""} to ${url}`);
  const result = await deliver(url, payload, secret);
  if (result.kind === "answered" && result.status === 200) {
    say(green(result.body.includes("duplicate") ? "✓ Already processed earlier; nothing changed." : "✓ Delivered. See the `pnpm dev` terminal for what it did to the order."));
  } else {
    say(red(`✗ Not delivered. ${explain(result, url)}`));
    process.exitCode = 1;
  }
}

const [command, arg] = process.argv.slice(2);
try {
  if (command === "listen") await listen();
  else if (command === "replay") await replay(arg);
  else throw new Error("Usage: node scripts/stripe-dev.mjs listen | replay <evt_id>");
} catch (error) {
  console.error(red(`✗ ${error.message}`));
  process.exitCode = 1;
}
