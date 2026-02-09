"use client";
import MainLayout from "@/components/layoutComponents/MainLayout";
import PageHeader from "@/components/Pageheader";
import { useCustomSelector } from "@/customHooks/customSelector";
import React, { useState, use } from "react";
import { useDispatch } from "react-redux";
import { createAuth } from "@/store/action/authAction";
import CustomTable from "@/components/customTable/CustomTable";
import { openModal } from "@/utils/utility";
import { AUTH_COLUMNS, MODAL_TYPE } from "@/utils/enums";
import AuthDataModal from "@/components/modals/AuthDataModal";

export const runtime = "edge";

const Page = ({ params }) => {
  const resolvedParams = use(params);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const dispatch = useDispatch();
  const { authData } = useCustomSelector((state) => ({
    authData: state?.authReducer?.authenticationData?.[resolvedParams?.org_id] || [],
  }));

  const validateUrl = (value) => {
    try {
      const urlRegex = /^https?:\/\/.*\..*/;
      if (!urlRegex.test(value)) throw new Error("Invalid URL");
      new URL(value);
      setUrlError("");
      return true;
    } catch {
      setUrlError("Please enter a valid URL");
      return false;
    }
  };

  const handleUrlChange = (e) => {
    const value = e.target.value;
    setUrl(value);
    if (value) {
      validateUrl(value);
    } else {
      setUrlError("");
    }
  };

  const handleSubmit = () => {
    if (!name) {
      return;
    }
    if (!url || !validateUrl(url)) {
      return;
    }
    const dataToSend = {
      name,
      redirection_url: url,
    };
    dispatch(createAuth(dataToSend, resolvedParams?.org_id));
  };

  const handleRowClick = () => {
    openModal(MODAL_TYPE?.AUTH_DATA_MODAL);
  };

  return (
    <div className="w-full">
      <MainLayout>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between w-full mb-4 px-2 pt-4">
          <PageHeader
            title="Authentication"
            description="Add authentication routes to enable OAuth 2.0 flows for your application."
            docLink="https://gtwy.ai/blogs/features/-oauth2.o-1"
          />
        </div>
      </MainLayout>

      {authData && authData?.length > 0 && (
        <div className="p-6">
          <div className="bg-base-100 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Existing Auth Routes</h2>
            <CustomTable
              data={authData || []}
              columnsToShow={AUTH_COLUMNS}
              sorting
              sortingColumns={["name"]}
              keysToWrap={["redirection_url"]}
              handleRowClick={handleRowClick}
            />
          </div>
        </div>
      )}

      {(!authData || authData?.length === 0) && (
        <div className="p-6">
          <div className="max-w-md mx-auto bg-base-100 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add Authentication Route</h2>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Auth Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter Auth name"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Auth Redirect URL</span>
                </label>
                <input
                  type="url"
                  className={`input input-bordered w-full ${urlError ? "input-error" : ""}`}
                  value={url}
                  onChange={handleUrlChange}
                  placeholder="https://example.com/oauth/callback"
                />
                {urlError && (
                  <label className="label">
                    <span className="label-text-alt text-error">{urlError}</span>
                  </label>
                )}
              </div>

              <button
                onClick={handleSubmit}
                className="btn btn-sm btn-primary w-full"
                disabled={!name || !url || urlError}
              >
                Add OAuth Route
              </button>
            </div>
          </div>
        </div>
      )}
      <AuthDataModal data={authData[0]} />
    </div>
  );
};

export default Page;
