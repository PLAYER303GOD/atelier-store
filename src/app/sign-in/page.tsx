import type { Metadata } from "next";

import { AuthPage } from "@/components/account/auth-page";

export const metadata: Metadata = { title: "Sign in — Atelier Store", robots: { index: false } };

export default function Page({ searchParams }: PageProps<"/sign-in">) {
  return <AuthPage mode="sign-in" searchParams={searchParams} />;
}
