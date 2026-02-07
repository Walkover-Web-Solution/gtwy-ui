"use client";

import OrgPageGuard from "@/components/OrgPageGuard";

export default function OrgLayout({ children }) {
  return <OrgPageGuard>{children}</OrgPageGuard>;
}
