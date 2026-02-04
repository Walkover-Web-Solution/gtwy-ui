import { useEffect, useMemo, useState, useRef } from "react";
import { formatDate, formatRelativeTime } from "@/utils/utility";

const OrganizationGrid = ({ displayedOrganizations = [], handleSwitchOrg, currentUserId }) => {
  const [loadingOrgId, setLoadingOrgId] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tableBodyRef = useRef(null);
  const rowRef = useRef([]);
  const formattedOrganizations = useMemo(() => {
    return displayedOrganizations
      .slice()
      .reverse()
      .map((org) => ({
        id: org?.id,
        name: org?.name || "Unnamed Workspace",
        createdAt: formatRelativeTime(org?.created_at),
        createdAtRaw: formatDate(org?.created_at),
        role: org?.role_name,
      }));
  }, [displayedOrganizations, currentUserId]);

  useEffect(() => {
    if (!formattedOrganizations.length) {
      setSelectedIndex(-1);
      return;
    }

    setSelectedIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= formattedOrganizations.length) return formattedOrganizations.length - 1;
      return prev;
    });
  }, [formattedOrganizations.length]);

  useEffect(() => {
    if (rowRef.current[selectedIndex]) {
      if (selectedIndex === 0) {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } else if (selectedIndex === formattedOrganizations.length - 1) {
        // When at the last row, scroll to the bottom of the page
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      } else {
        rowRef.current[selectedIndex].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    }
  }, [selectedIndex]);
  useEffect(() => {
    return () => {
      rowRef.current = []; // Cleanup refs on unmount
    };
  }, []);
  const handleOrgClick = async (orgId, orgName) => {
    if (!orgId) return;

    setLoadingOrgId(orgId);
    try {
      await handleSwitchOrg(orgId, orgName);
    } catch (error) {
      console.error("Error switching organization:", error);
    }
  };

  const handleKeyDown = (event) => {
    if (!formattedOrganizations.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, formattedOrganizations.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const selectedOrg = formattedOrganizations[selectedIndex];
      if (selectedOrg) {
        handleOrgClick(selectedOrg.id, selectedOrg.name);
      }
    }
  };

  useEffect(() => {
    const handleWindowKeyDown = (event) => {
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");

      if (isEditableTarget) {
        const allowOrgNav = target instanceof HTMLElement && target.dataset.allowOrgNav === "true";
        if (!allowOrgNav) return;
      }
      handleKeyDown(event);
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [formattedOrganizations.length, selectedIndex]);

  return (
    <div className="mb-8">
      <div className="overflow-x-auto rounded-lg shadow-lg border border-base-300 bg-base-100">
        <table
          id="organization-grid-table"
          className="table bg-base-100 shadow-md overflow-visible relative z-50 border-collapse focus:outline-none focus:ring-2 focus:ring-primary/40"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <thead className="bg-gradient-to-r from-base-200 to-base-300 text-base-content">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs uppercase tracking-wide text-base-content">
                Workspace
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs uppercase tracking-wide text-base-content">
                Created At
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs uppercase tracking-wide text-base-content">
                Role
              </th>
            </tr>
          </thead>
          <tbody ref={tableBodyRef} className="bg-base-100 divide-y divide-base-200">
            {formattedOrganizations.length ? (
              formattedOrganizations.map((org, index) => {
                const isLoading = loadingOrgId === org.id;
                const isSelected = index === selectedIndex;
                return (
                  <tr
                    id={`organization-grid-row-${org.id}`}
                    key={org.id ?? index}
                    ref={(el) => (rowRef.current[index] = el)}
                    onClick={() => {
                      setSelectedIndex(index);
                      handleOrgClick(org.id, org.name);
                    }}
                    className={`cursor-pointer transition-colors hover:bg-base-200 group ${
                      isLoading ? "opacity-60 cursor-wait" : ""
                    } ${isSelected ? "bg-base-200" : ""}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isLoading && <span className="loading loading-spinner loading-sm"></span>}
                        <span className="font-medium text-base-content">{org.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base-content" title={org.createdAtRaw}>
                      <div className="w-40">
                        <span className="group-hover:hidden block">{org.createdAt}</span>
                        <span className="hidden group-hover:block">{org.createdAtRaw}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base-content">{org.role}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="3" className="px-6 py-10 text-center text-base-content">
                  No workspaces found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrganizationGrid;
