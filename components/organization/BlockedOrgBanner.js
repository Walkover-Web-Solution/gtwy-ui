"use client";

function BlockedOrgBanner({ className = "" }) {
  return (
    <div
      className={`alert alert-error rounded-none border-0 py-2 px-4 justify-center ${className}`}
      data-testid="blocked-org-banner"
    >
      <span className="text-sm font-medium">
        Your org is blocked. You cannot create agents, API keys, or knowledge bases until it is unblocked. Please
        contact{" "}
        <a href="mailto:support@gtwy.ai" className="underline font-semibold">
          support@gtwy.ai
        </a>{" "}
        for assistance.
      </span>
    </div>
  );
}

export default BlockedOrgBanner;
