// Local Stripe webhook helpers (dev only). Needs the Stripe CLI, logged in (`stripe login`).
//
//   pnpm stripe:listen            forward Checkout events to the dev server, saying clearly what
//                                 happened to each one; checks the setup first
//   pnpm stripe:replay <evt_id>   resend one event Stripe already has, signed like `stripe listen`
//                                 (for an event that wasn't delivered)
//
// The webhook's own outcome per event ("AT-… paid", "ignored: …") is logged by the dev server
// (src/app/api/stripe/webhook/route.ts), in the `pnpm dev` terminal.

import { execSync, spawn } from "node:child_process";
import { createInterface } from "node:readline";

import Stripe from "stripe";

const BASE = (process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3001").replace(/\/+$/, "");
const WEBHOOK_URL = `${BASE}/api/stripe/webhook`;
/** Exactly the events the webhook handles (HANDLED_EVENTS in src/lib/stripe-webhook.ts). */
const EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
];

const color = (code) => (text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
const green = color(32);
const red = color(31);
const dim = color(2);
const bold = color(1);
const time = () => new Date().toLocaleTimeString();
const say = (line) => console.log(`${dim(time())}  ${line}`);

/** Runs a Stripe CLI command and returns its output (the CLI prints banner lines before JSON). */
function stripeCli(args) {
  return execSync(`stripe ${args}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** The signing secret this machine's `stripe listen` uses (stable per device and account). */
function listenSecret() {
  let out;
  try {
    out = stripeCli("listen --print-secret");
  } catch (error) {
    throw new Error(`The Stripe CLI couldn't give a webhook secret. Is it installed and logged in? Run: stripe login\n${error.stderr ?? ""}`);
  }
  const secret = out.match(/whsec_[A-Za-z0-9]+/)?.[0];
  if (!secret) throw new Error("No whsec_ secret in `stripe listen --print-secret` output. Run: stripe login");
  return secret;
}

/** POSTs a payload to the webhook, signed with `secret` exactly as Stripe signs it. */
async function deliver(payload, secret) {
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body: payload,
  });
  return { status: res.status, body: await res.text() };
}

/** What a failed delivery most likely means, and what to do. */
function explain(status, body) {
  if (status === 400 && body.includes("Invalid signature")) {
    return "STRIPE_WEBHOOK_SECRET in .env.local doesn't match this listener. Set it to the secret shown above, then restart `pnpm dev`.";
  }
  if (status === 500 && body.includes("not configured")) {
    return "The dev server has no STRIPE_WEBHOOK_SECRET / STRIPE_SECRET_KEY. Add them to .env.local and restart `pnpm dev`.";
  }
  if (status >= 500) return "The webhook failed. See the error in the `pnpm dev` terminal (it may also have been recompiling).";
  if (status === 404) return `Nothing at ${WEBHOOK_URL}. Is APP_URL / BETTER_AUTH_URL right?`;
  return `Unexpected answer ${status}: ${body.slice(0, 120)}`;
}

/** One signed, harmless event (a type the webhook ignores) to prove reachability and the secret. */
async function preflight(secret) {
  const payload = JSON.stringify({ id: `evt_preflight_${Date.now()}`, object: "event", type: "atelier.preflight", data: { object: {} } });
  try {
    const { status, body } = await deliver(payload, secret);
    if (status === 200) {
      say(green("✓ Webhook reachable and its signing secret matches this listener."));
      return true;
    }
    say(red(`✗ Setup problem: ${explain(status, body)}`));
  } catch {
    say(red(`✗ Can't reach ${WEBHOOK_URL}. Start the app with \`pnpm dev\` (port 3001). Events received meanwhile will fail.`));
  }
  return false;
}

async function listen() {
  const secret = listenSecret();
  console.log(bold("Stripe → local webhook"));
  say(`Forwarding ${EVENTS.length} Checkout events to ${WEBHOOK_URL}`);
  say(dim(`Listener secret: ${secret.slice(0, 11)}…  (STRIPE_WEBHOOK_SECRET in .env.local must be this)`));
  await preflight(secret);

  // One command string (fixed values only): the CLI is a shell shim on Windows, and Node deprecates
  // passing an args array together with `shell`.
  const child = spawn(`stripe listen --forward-to ${WEBHOOK_URL} --events ${EVENTS.join(",")}`, {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let lastEvent = null;
  let delivered = 0;
  let failed = 0;

  const onLine = (raw) => {
    const line = raw.trim();
    if (!line || line.includes("claude-code-hint")) return;
    const received = line.match(/-->\s+(\S+)\s+\[(evt_\w+)\]/);
    const answered = line.match(/<--\s+\[(\d{3})\]\s+\S+\s+\S+\s+\[(evt_\w+)\]/);
    if (received) {
      lastEvent = received[2];
      say(`→ ${bold(received[1])} ${dim(received[2])}`);
    } else if (answered) {
      const [, code, evt] = answered;
      if (code.startsWith("2")) {
        delivered++;
        say(green(`  ✓ delivered (${code}) ${dim(evt)}  → outcome in the \`pnpm dev\` terminal`));
      } else {
        failed++;
        say(red(`  ✗ NOT delivered (${code}) ${evt}`));
        say(red(`    The order was not updated. Fix the cause, then resend: ${bold(`pnpm stripe:replay ${evt}`)}`));
      }
    } else if (/Ready!/.test(line)) {
      say(green("✓ Listening. Make a test payment; each event shows up here."));
    } else if (/error|failed/i.test(line)) {
      failed++;
      say(red(`✗ ${line}`));
      const unreachable = /connect|refused|dial tcp|timeout/i.test(line);
      if (unreachable) say(red(`    The dev server didn't answer at ${WEBHOOK_URL}. Is \`pnpm dev\` running?`));
      if (lastEvent) say(red(`    Once fixed, resend: ${bold(`pnpm stripe:replay ${lastEvent}`)}`));
    } else {
      say(dim(line));
    }
  };
  createInterface({ input: child.stdout }).on("line", onLine);
  createInterface({ input: child.stderr }).on("line", onLine);

  const stop = () => child.kill();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("exit", (code) => {
    say(`Listener stopped (${code ?? "signal"}). Delivered ${delivered}, failed ${failed}.`);
    process.exit(code ?? 0);
  });
}

async function replay(eventId) {
  if (!/^evt_\w+$/.test(eventId ?? "")) throw new Error("Usage: pnpm stripe:replay evt_…");
  const secret = listenSecret();
  let out;
  try {
    out = stripeCli(`events retrieve ${eventId}`);
  } catch (error) {
    throw new Error(`Stripe couldn't find ${eventId} in the account the CLI is logged into.\n${error.stderr ?? ""}`);
  }
  const payload = out.slice(out.indexOf("{")).trim();
  const event = JSON.parse(payload);
  if (event.error) throw new Error(`Stripe: ${event.error.message}`);
  const order = event.data?.object?.metadata?.order_reference;
  say(`Resending ${bold(event.type)} ${dim(event.id)}${order ? ` for order ${bold(order)}` : ""} to ${WEBHOOK_URL}`);
  let result;
  try {
    result = await deliver(payload, secret);
  } catch {
    throw new Error(`Can't reach ${WEBHOOK_URL}. Start the app with \`pnpm dev\`.`);
  }
  const { status, body } = result;
  if (status === 200) {
    say(green(body.includes("duplicate") ? "✓ Already processed earlier; nothing changed." : "✓ Delivered. See the `pnpm dev` terminal for what it did to the order."));
  } else {
    say(red(`✗ Not delivered (${status}). ${explain(status, body)}`));
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
  process.exit(1);
}
