import { MODAL_TYPE } from "@/utils/enums";
import { openModal } from "@/utils/utility";
import SearchItems from "../UI/SearchItems";
import MainSlider from "../sliders/MainSlider";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
const OrganizationHeader = ({ organizationsArray, setDisplayedOrganizations }) => {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const orgIdFromUrl = useMemo(() => {
    const parts = pathname.split("?")[0].split("/");
    return parts[1] === "org" ? parts[2] : null;
  }, [pathname]);

  const currentOrgId = useCustomSelector((state) => state.orgReducer?.currentOrgId);

  const orgId = currentOrgId || orgIdFromUrl; // ✅ MOVE UP

  const { userdetails, organizations } = useCustomSelector((state) => ({
    userdetails: state.userDetailsReducer.userDetails,
    organizations: state.userDetailsReducer.organizations,
    currrentOrgDetail: state?.userDetailsReducer?.organizations?.[orgId],
  }));
  const orgName = useMemo(() => organizations?.[orgId]?.name || "Organization", [organizations, orgId]);
  const sliderWrapperRef = useRef(null);

  const getInitials = (name = "") => {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0]?.toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sliderWrapperRef.current && !sliderWrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative flex flex-col gap-3">
      <div className="flex flex-row justify-between items-center">
        <h2 className="text-2xl font-semibold text-base-content">Existing Workspaces</h2>
      </div>

      {/* Search and Create Button Row */}
      {organizationsArray?.length > 5 && (
        <div className="flex flex-row gap-3 items-center justify-between">
          <div className="flex flex-row gap-2">
            <div className="w-[300px]">
              <SearchItems
                data={organizationsArray}
                setFilterItems={setDisplayedOrganizations}
                item="Workspaces"
                style="input input-sm input-bordered w-full border-base-300 bg-base-200/80 text-base-content placeholder-base-content/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none px-4 transition-all duration-150 shadow-sm rounded-lg"
              />
            </div>
            <button
              id="org-header-create-workspace-button"
              onClick={() => openModal(MODAL_TYPE.CREATE_ORG_MODAL)}
              className="btn btn-primary btn-sm whitespace-nowrap"
            >
              + Create New Workspace
            </button>
          </div>

          <div
            id="org-header-user-menu-button"
            className="shrink-0 w-9 h-9 bg-primary rounded-sm flex items-center justify-center cursor-pointer"
          >
            <span onClick={() => setOpen(true)} className="text-primary-content font-semibold text-sm">
              {getInitials(userdetails?.name || orgName)}
            </span>
          </div>
        </div>
      )}

      {/* Show button alone when no search is needed */}
      {(!organizationsArray || organizationsArray?.length <= 5) && (
        <div className="flex flex-row justify-between items-center">
          <div className="flex justify-start">
            <button
              id="org-header-create-workspace-button-alt"
              onClick={() => openModal(MODAL_TYPE.CREATE_ORG_MODAL)}
              className="btn btn-primary btn-sm"
            >
              + Create New Workspace
            </button>
          </div>
          <div
            id="org-header-user-menu-button-alt"
            className="shrink-0 w-9 h-9 bg-primary rounded-sm flex items-center justify-center cursor-pointer"
          >
            <span onClick={() => setOpen(true)} className="text-primary-content font-semibold text-sm">
              {getInitials(userdetails?.name || orgName)}
            </span>
          </div>
        </div>
      )}
      <div ref={sliderWrapperRef} className="absolute top-[84px] right-[-6px]">
        {open && <MainSlider openDetails={true} userdetailsfromOrg={userdetails} orgIdFromHeader={orgId} />}
      </div>
    </div>
  );
};

export default OrganizationHeader;
