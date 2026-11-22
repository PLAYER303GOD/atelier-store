import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "@/lib/auth";

// Same-origin by default; set baseURL only if the auth server lives elsewhere.
// inferAdditionalFields types `user.role` (a type-only import: no server code reaches the client).
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
