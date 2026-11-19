import { connection } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";

type AuthMethod = "GET" | "POST";

async function handleAuthRequest(request: Request, method: AuthMethod) {
  await connection();

  const { auth } = await import("@/lib/auth");
  return toNextJsHandler(auth)[method](request);
}

export function GET(request: Request) {
  return handleAuthRequest(request, "GET");
}

export function POST(request: Request) {
  return handleAuthRequest(request, "POST");
}
