import { createAuthClient } from "better-auth/react";

// Same-origin by default; set baseURL only if the auth server lives elsewhere.
export const authClient = createAuthClient();
