import { createOrgAction } from "@/store/action/orgAction";
import { userDetails } from "@/store/action/userDetailsAction";
import { useRouter } from "next/navigation";
import React, { useCallback, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LoadingSpinner from "./LoadingSpinner";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import timezoneData from "@/utils/timezoneData";
import { ChevronDown } from "lucide-react";

const CreateOrg = ({ handleSwitchOrg }) => {
  const [orgDetails, setOrgDetails] = useState({ name: "", about: "", timezone: "Asia/Kolkata" });
  const [isLoading, setIsLoading] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [filteredTimezones, setFilteredTimezones] = useState(timezoneData);
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const dispatch = useDispatch();
  const route = useRouter();

  useEffect(() => {
    // Filter timezones based on search term (trim whitespace and filter by "starts with")
    const trimmedSearch = timezoneSearch.trim().toLowerCase();
    const filtered = timezoneData.filter(
      (timezone) =>
        timezone.identifier.toLowerCase().startsWith(trimmedSearch) ||
        timezone.offSet.toLowerCase().startsWith(trimmedSearch)
    );
    setFilteredTimezones(filtered);
  }, [timezoneSearch]);

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
      <div className=""></div>
      <dialog id={MODAL_TYPE.CREATE_ORG_MODAL} className="modal" onKeyDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center min-h-screen py-8">
          <form
            id="create-org-form"
            className="modal-box relative p-5 bg-base-100 rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-y-auto"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              createOrgHandler(e);
            }}
          >
            <h3 className="font-bold text-lg mb-2">Create Workspace</h3>
            <label className="label-text mb-1">Workspace Name *</label>
            <input
              id="create-org-name-input"
              type="text"
              name="name"
              value={orgDetails.name}
              onChange={handleChange}
              placeholder="Workspace Name"
              className="input input-bordered w-full mb-4"
              minLength={3}
              maxLength={40}
              required
            />
            <label className="label-text mb-1">Description</label>
            <textarea
              id="message"
              name="about"
              rows="4"
              value={orgDetails.about}
              onChange={handleChange}
              placeholder="About Your Workspace"
              className="p-2.5 w-full text-sm textarea textarea-bordered"
            />
            <label className="label-text mb-1">Timezone *</label>

            <div className={`mb-4 ${showTimezoneDropdown ? "mb-80" : ""}`}>
              <div className="relative">
                <div
                  id="create-org-timezone-trigger"
                  className="relative w-full cursor-pointer border border-base-content/20 rounded-lg p-3 flex items-center justify-between hover:border-base-content/40 transition-colors duration-200 bg-base-100"
                  onClick={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
                >
                  <span className="text-sm">
                    {orgDetails.timezone
                      ? `${orgDetails.timezone} (${timezoneData.find((tz) => tz.identifier === orgDetails.timezone)?.offSet})`
                      : "Select a timezone"}
                  </span>
                  <span className={`transition-transform duration-200 ${showTimezoneDropdown ? "rotate-180" : ""}`}>
                    <ChevronDown size={16} />
                  </span>
                </div>

                {showTimezoneDropdown && (
                  <div
                    id="create-org-timezone-dropdown"
                    className="absolute mt-1 z-30 w-full bg-base-100 border border-base-content/20 rounded-lg shadow-lg max-h-72 overflow-hidden"
                  >
                    <div className="sticky top-0 bg-base-100 p-3 border-b border-base-content/10">
                      <input
                        id="create-org-timezone-search-input"
                        type="text"
                        placeholder="Search timezone"
                        className="input input-sm w-full border-base-content/20 focus:border-primary"
                        value={timezoneSearch}
                        onChange={(e) => setTimezoneSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredTimezones.length === 0 ? (
                        <div className="p-4 text-center text-base-content/50 text-sm">No timezones found</div>
                      ) : (
                        filteredTimezones.map((timezone) => (
                          <div
                            key={timezone.identifier}
                            className={`p-3 hover:bg-base-200 cursor-pointer text-sm transition-colors duration-150 ${
                              orgDetails.timezone === timezone.identifier
                                ? "bg-primary text-primary-content"
                                : "text-base-content"
                            }`}
                            onClick={() => selectTimezone(timezone)}
                          >
                            <div className="font-medium">{timezone.identifier}</div>
                            <div className="text-xs opacity-70">{timezone.offSet}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-action">
              <button
                id="create-org-close-button"
                type="button"
                onClick={() => closeModal(MODAL_TYPE.CREATE_ORG_MODAL)}
                onKeyDown={(e) => e.stopPropagation()}
                className="btn btn-sm"
              >
                Close
              </button>
              <button
                id="create-org-submit-button"
                type="submit"
                onKeyDown={(e) => e.stopPropagation()}
                className="btn btn-sm btn-primary"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
};

export default CreateOrg;
