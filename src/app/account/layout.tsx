import { AccountNav } from "@/components/account/account-nav";

/**
 * Account area frame: navigation beside (lg+) or above (mobile) the page. Static on purpose:
 * the session is read by each page inside its own <Suspense> (requireUser), never here, so
 * the frame stays in the prerendered shell and switching sections only streams the content.
 * src/proxy.ts sends visitors without a session cookie to sign-in before any of this renders.
 */
export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="container-page pt-4 pb-section md:pt-6">
      {/* grid-cols-1 (minmax(0,1fr)), not the implicit auto track: otherwise the nav's
          unbroken tab row widens the single mobile column past the screen. */}
      <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-gutter">
        <div className="min-w-0 lg:col-span-3 xl:col-span-2">
          <AccountNav />
        </div>
        <div className="min-w-0 lg:col-span-9 xl:col-span-8 xl:col-start-4">{children}</div>
      </div>
    </div>
  );
}
