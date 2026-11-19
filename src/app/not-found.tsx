import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-prose flex flex-col items-center py-section text-center">
      <p className="text-caption text-muted uppercase">Error 404</p>
      <h1 className="mt-3 text-display-sm">This page could not be found</h1>
      <p className="mt-4 text-body text-muted">
        The page may have moved, or it isn&rsquo;t available yet.
      </p>
      <Link href="/" className={`${buttonStyles({ variant: "secondary" })} mt-8`}>
        Back to home
      </Link>
    </div>
  );
}
