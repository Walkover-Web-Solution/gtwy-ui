import { createOrgAction } from "@/store/action/orgAction";
import { userDetails } from "@/store/action/userDetailsAction";
import { useRouter } from "next/navigation";
import React, { useCallback, useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LoadingSpinner from "./LoadingSpinner";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal, RequiredItem } from "@/utils/utility";
import timezoneData from "@/utils/timezoneData";
import { ChevronDown, Globe } from "lucide-react";
import Modal from "@/components/UI/Modal";

const CreateOrg = ({ handleSwitchOrg }) => {
  const [orgDetails, setOrgDetails] = useState({ name: "", about: "", timezone: "Asia/Kolkata" });
  const [isLoading, setIsLoading] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [filteredTimezones, setFilteredTimezones] = useState(timezoneData);
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const dispatch = useDispatch();
  const route = useRouter();

  useEffect(() => {
    // Filter timezones by search term (substring match so segments after "/" like "Kolkata" match "Asia/Kolkata")
    const trimmedSearch = timezoneSearch.trim().toLowerCase();
    const filtered = timezoneData.filter(
      (timezone) =>
        timezone.identifier.toLowerCase().includes(trimmedSearch) ||
        timezone.offSet.toLowerCase().includes(trimmedSearch)
    );
    setFilteredTimezones(filtered);
  }, [timezoneSearch]);

  // Ref to the Workspace Name input. Focus is driven by <Modal> once it detects the
  // dialog has actually opened (see initialFocusRef below), which is reliable on every open.
  const nameInputRef = useRef(null);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setOrgDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value,
    }));
  }, []);

  const selectTimezone = (timezone) => {
    setOrgDetails((prev) => ({ ...prev, timezone: timezone.identifier }));
    setShowTimezoneDropdown(false);
    setTimezoneSearch(""); // Reset search when selecting
  };

  const createOrgHandler = useCallback(
    async (e) => {
      e.preventDefault();
      const { name, about, timezone } = orgDetails;
      setIsLoading(true);

      const selectedTimezone = timezoneData.find((tz) => tz.identifier === timezone);
      const dataToSend = {
        company: {
          name,
          meta: {
            about,
            identifier: selectedTimezone?.identifier,
            offSet: selectedTimezone?.offSet,
          },
          timezone: selectedTimezone?.offSet,
        },
      };

      dispatch(
        createOrgAction(
          dataToSend,
          // Success callback
          async (data) => {
            dispatch(userDetails());
            await handleSwitchOrg(data.id, data.name);
            toast.success("Workspace created successfully");
            closeModal(MODAL_TYPE.CREATE_ORG_MODAL);
            setIsLoading(false);
            setTimeout(() => {
              route.replace(`/org/${data.id}/agents`);
            }, 100);
          },
          // Error callback
          (error) => {
            closeModal(MODAL_TYPE.CREATE_ORG_MODAL);
            setIsLoading(false);
            console.error("Create org error:", error);
          }
        )
      );
    },
    [orgDetails, dispatch, route, handleSwitchOrg]
  );

  return (
    <div>
      {isLoading && <LoadingSpinner />}
      <Modal
        MODAL_ID={MODAL_TYPE.CREATE_ORG_MODAL}
        title="Create Workspace"
        description="Set up your new workspace details"
        icon={<Globe size={16} className="text-primary" />}
        widthClass="w-[min(480px,92vw)]"
        initialFocusRef={nameInputRef}
        onClose={() => closeModal(MODAL_TYPE.CREATE_ORG_MODAL)}
        footer={
          <>
            <button
              data-testid="create-org-close-button"
              id="create-org-close-button"
              type="button"
              onClick={() => closeModal(MODAL_TYPE.CREATE_ORG_MODAL)}
              className="btn btn-sm btn-outline"
            >
              Close
            </button>
            <button
              data-testid="create-org-submit-button"
              id="create-org-submit-button"
              type="submit"
              form="create-org-form"
              className="btn btn-sm btn-primary"
              disabled={orgDetails.name.trim().length < 3}
            >
              Create
            </button>
          </>
        }
      >
        <form
          data-testid="create-org-form"
          id="create-org-form"
          className="flex flex-col gap-3 text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            createOrgHandler(e);
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-base-content/80">
              Workspace Name <RequiredItem />
            </label>
            <input
              ref={nameInputRef}
              autoComplete="off"
              data-testid="create-org-name-input"
              id="create-org-name-input"
              type="text"
              name="name"
              value={orgDetails.name}
              onChange={handleChange}
              placeholder="Workspace Name"
              className="input input-bordered input-sm text-xs w-full"
              minLength={3}
              maxLength={40}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-base-content/80">Description</label>
            <textarea
              data-testid="create-org-description-input"
              id="message"
              name="about"
              rows="3"
              value={orgDetails.about}
              onChange={handleChange}
              placeholder="About Your Workspace"
              className="textarea textarea-bordered textarea-sm text-xs w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-base-content/80">
              Timezone <RequiredItem />
            </label>
            <div className={`relative w-full ${showTimezoneDropdown ? "mb-64" : ""}`}>
              <div
                data-testid="create-org-timezone-trigger"
                id="create-org-timezone-trigger"
                className="relative w-full h-8 cursor-pointer border border-base-content/20 rounded-lg px-3 py-1 flex items-center justify-between hover:border-base-content/40 transition-colors duration-200 bg-base-100 text-xs"
                onClick={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
              >
                <span>
                  {orgDetails.timezone
                    ? `${orgDetails.timezone} (${timezoneData.find((tz) => tz.identifier === orgDetails.timezone)?.offSet})`
                    : "Select a timezone"}
                </span>
                <span className={`transition-transform duration-200 ${showTimezoneDropdown ? "rotate-180" : ""}`}>
                  <ChevronDown size={14} />
                </span>
              </div>

              {showTimezoneDropdown && (
                <div
                  data-testid="create-org-timezone-dropdown"
                  id="create-org-timezone-dropdown"
                  className="absolute mt-1 z-30 w-full bg-base-100 border border-base-content/20 rounded-lg max-h-56 overflow-hidden flex flex-col"
                >
                  <div className="bg-base-100 p-2 border-b border-base-content/10">
                    <input
                      autoComplete="off"
                      data-testid="create-org-timezone-search-input"
                      id="create-org-timezone-search-input"
                      type="text"
                      placeholder="Search timezone..."
                      className="input input-xs w-full border-base-content/20 focus:border-primary text-xs"
                      value={timezoneSearch}
                      onChange={(e) => setTimezoneSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 max-h-44">
                    {filteredTimezones.length === 0 ? (
                      <div className="p-3 text-center text-base-content/50 text-xs">No timezones found</div>
                    ) : (
                      filteredTimezones.map((timezone) => (
                        <div
                          key={timezone.identifier}
                          className={`p-2.5 hover:bg-base-200 cursor-pointer text-xs transition-colors duration-150 ${
                            orgDetails.timezone === timezone.identifier
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-base-content"
                          }`}
                          onClick={() => selectTimezone(timezone)}
                        >
                          <div className="font-semibold">{timezone.identifier}</div>
                          <div className="text-[10px] opacity-70 mt-0.5">{timezone.offSet}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CreateOrg;
