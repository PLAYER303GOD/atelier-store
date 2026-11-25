import { AdminNav } from "@/components/admin/admin-nav";

/**
 * Admin area frame: navigation beside (lg+) or above (mobile) the page. Static on purpose, like
 * the account layout: it reads no session, so it stays in the prerendered shell. It is NOT the
 * access check. Every page under /admin calls requireAdmin() inside its own <Suspense>, and every
 * admin Server Action / route handler calls getAdminForAction() first (`pnpm check:admin`).
 * src/proxy.ts sends visitors without a session cookie to sign-in before any of this renders.
 *
 * Admin routes stay static: detail views take a query parameter, never a [segment] (an unlisted
 * dynamic param suspends every usePathname() in the site header and this nav, and fails the build).
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="container-page pt-4 pb-section md:pt-6">
      <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-gutter">
        <div className="min-w-0 lg:col-span-3 xl:col-span-2">
          <AdminNav />
        </div>
        <div className="min-w-0 lg:col-span-9 xl:col-span-10">{children}</div>
      </div>
    </div>
  );
}
