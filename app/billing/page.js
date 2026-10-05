"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getFromCookies } from "@/utils/utility";
import { peekCheckoutReturnUrl } from "@/utils/billingReturn";

export const runtime = "edge";

// Lago's Stripe integration has a single fixed redirect URL (this page). The plans page
// stashes where it left from before sending the user to Stripe; forward them back there.
export default function BillingPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <BillingRedirect />
    </Suspense>
  );
}

const Spinner = () => (
  <div className="flex h-screen items-center justify-center">
    <span className="loading loading-spinner loading-lg" />
  </div>
);

function BillingRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    const stored = peekCheckoutReturnUrl();
    const orgId = getFromCookies("current_org_id");
    const target = stored ?? (orgId ? `/org/${orgId}/plans` : null);
    router.replace(target ? `${target}${qs ? `?${qs}` : ""}` : "/org");
  }, [router, searchParams]);

  return <Spinner />;
}
