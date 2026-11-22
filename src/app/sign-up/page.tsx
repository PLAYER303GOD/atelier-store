import type { Metadata } from "next";

import { AuthPage } from "@/components/account/auth-page";

export const metadata: Metadata = { title: "Create an account — Atelier Store", robots: { index: false } };

export default function Page({ searchParams }: PageProps<"/sign-up">) {
  return <AuthPage mode="sign-up" searchParams={searchParams} />;
}
