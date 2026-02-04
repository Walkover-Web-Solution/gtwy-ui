"use client";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateOrgTimeZone } from "@/store/action/orgAction";
import timezoneData from "@/utils/timezoneData";
import { PencilIcon, GlobeIcon, MailIcon, BuildingIcon } from "@/components/Icons";
import React, { useMemo, useState, useCallback, use } from "react";
import { useDispatch } from "react-redux";

export const runtime = "edge";

export default function SettingsPage({ params }) {
  const resolvedParams = use(params);
  const dispatch = useDispatch();
  const userDetails = useCustomSelector((state) => state?.userDetailsReducer?.organizations?.[resolvedParams.org_id]);

  const [isContentOpen, setIsContentOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTimezone, setSelectedTimezone] = useState(() =>
    timezoneData.find((tz) => tz.identifier === userDetails?.meta?.identifier)
  );

  const filteredTimezones = useMemo(() => {
    return timezoneData.filter((timezone) => timezone.identifier.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  const handleContentOpen = useCallback(() => {
    setIsContentOpen(true);
  }, []);

  const handleTimezoneChange = useCallback((timezone) => {
    setSelectedTimezone(timezone);
  }, []);

  const handleSave = useCallback(async () => {
    const updatedOrgDetails = {
      ...userDetails,
      meta: selectedTimezone,
      timezone: selectedTimezone?.offSet,
    };
    try {
      await dispatch(updateOrgTimeZone(resolvedParams.org_id, updatedOrgDetails));
      setIsContentOpen(false);
    } catch (error) {
      console.error("Failed to update timezone:", error);
    }
  }, [dispatch, resolvedParams.org_id, selectedTimezone, userDetails]);

  const handleCancel = useCallback(() => {
    setSelectedTimezone(timezoneData.find((tz) => tz.identifier === userDetails?.meta?.identifier));
    setIsContentOpen(false);
  }, [userDetails?.meta?.identifier]);

  return (
    <main className="max-w-4xl mx-auto p-4 my-20">
      <div className="bg-base-100 rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <BuildingIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Workspace Settings</h1>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-base-100 rounded">
              <div className="flex items-center gap-2">
                <GlobeIcon className="h-4 w-4 text-primary" />
                <span className="text-sm text-gray-500">Domain</span>
              </div>
              <p className="mt-1">{userDetails?.domain || "gtwy.ai"}</p>
            </div>

            <div className="p-3 bg-base-100 rounded">
              <div className="flex items-center gap-2">
                <BuildingIcon className="h-4 w-4 text-primary" />
                <span className="text-sm text-gray-500">Organization Name</span>
              </div>
              <p className="mt-1">{userDetails?.name || "N/A"}</p>
            </div>

            <div className="p-3 bg-base-100 rounded">
              <div className="flex items-center gap-2">
                <MailIcon className="h-4 w-4 text-primary" />
                <span className="text-sm text-gray-500">Email Address</span>
              </div>
              <p className="mt-1">{userDetails?.email || "N/A"}</p>
            </div>

            <div className="p-3 bg-base-100 rounded cursor-pointer" onClick={handleContentOpen}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GlobeIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm text-gray-500">Timezone</span>
                </div>
                <PencilIcon size={14} className="text-primary" />
              </div>
              <p className="mt-1">
                {selectedTimezone?.identifier} ({selectedTimezone?.offSet})
              </p>
            </div>
          </div>

          {isContentOpen && (
            <div className="mt-4 border border-base-300 rounded-lg p-4">
              <input
                type="text"
                placeholder="Search timezone..."
                className="w-full p-2 border border-base-300 rounded mb-3 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="h-48 overflow-y-auto border border-base-300 rounded">
                {filteredTimezones.map((timezone) => (
                  <div
                    key={timezone.identifier}
                    onClick={() => handleTimezoneChange(timezone)}
                    className={`p-2 text-sm cursor-pointer ${
                      timezone.identifier === selectedTimezone?.identifier
                        ? "bg-primary text-white"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {timezone.identifier} {timezone.offSet ? `(${timezone.offSet})` : ""}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button className="px-3 py-1.5 text-sm rounded bg-base-100 hover:bg-base-200" onClick={handleCancel}>
                  Cancel
                </button>
                <button
                  className="px-3 py-1.5 text-sm rounded bg-primary text-base-content hover:bg-primary-dark"
                  onClick={handleSave}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
