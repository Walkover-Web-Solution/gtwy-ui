"use client";
import { useCustomSelector } from "@/customHooks/customSelector";
import { renderedOrganizations, setInCookies } from "@/utils/utility";
import React, { useState, useCallback, useEffect } from "react";
import Protected from "@/components/Protected";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Search, Building2, Shield, CheckCircle, Lock, User, Database, AlertCircle, ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { getClientInfo, switchOrg, verifyAuth, switchUser } from "@/config/index";
import { BuildingIcon } from "@/components/Icons";

const Page = () => {
  const [formState, setFormState] = useState({
    searchQuery: "",
    selectedOrg: null,
    isLoading: false,
    clientId: "",
    redirectionUrl: "",
    state: "",
    client_name: "",
    isClientVerified: false,
  });
  const [missingParams, setMissingParams] = useState({
    clientId: false,
    redirectionUrl: false,
  });

  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchClientInfo = async () => {
      const clientId = searchParams.get("client_id");
      const redirectionUrl = searchParams.get("redirection_url");
      const state = searchParams.get("state");

      setMissingParams({
        clientId: !clientId,
        redirectionUrl: !redirectionUrl,
      });

      if (clientId || redirectionUrl || state) {
        if (clientId) {
          try {
            const res = await getClientInfo(clientId);
            updateFormState({
              client_name: res?.result?.name,
              isClientVerified: true,
            });
          } catch (error) {
            console.error("Failed to fetch client info", error);
            updateFormState({
              isClientVerified: false,
            });
          }
        }
        updateFormState({
          clientId: clientId || "",
          redirectionUrl: redirectionUrl || "",
          state: state || "",
        });
      }
    };

    fetchClientInfo();
  }, [searchParams]);

  const { organizations } = useCustomSelector((state) => ({
    organizations: state.userDetailsReducer.organizations,
  }));

  const updateFormState = useCallback((updates) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleChange = useCallback(
    (field) => (e) => {
      updateFormState({ [field]: e.target.value });
    },
    [updateFormState]
  );

  const handleSwitchOrg = useCallback(async (id, name) => {
    try {
      await switchOrg(id);
      const localToken = await switchUser({ orgId: id, orgName: name });
      setInCookies("local_token", localToken.token);
    } catch (_error) {
      console.error("Error switching workspace", _error);
    }
  }, []);

  const handleSelectOrg = useCallback(
    (orgId, orgName) => {
      handleSwitchOrg(orgId, orgName);
      updateFormState({ selectedOrg: { id: orgId, name: orgName } });
    },
    [updateFormState]
  );

  const handleVerify = useCallback(async () => {
    if (!formState.selectedOrg || !formState.isClientVerified) return;

    updateFormState({ isLoading: true });
    const data = {
      client_id: formState?.clientId,
      redirection_url: formState?.redirectionUrl,
      state: formState?.state,
    };
    await verifyAuth(data);
    updateFormState({ isLoading: false });
  }, [formState.selectedOrg, formState.isClientVerified, updateFormState]);

  if (formState.isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex min-h-screen bg-base-200 p-6 gap-6">
      {/* Workspaces List */}
      <div className="w-[35rem] bg-base-100 rounded-xl shadow-sm p-6 h-[calc(100vh-3rem)]">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="text-primary" size={24} />
          <h2 className="text-xl font-bold text-base-content">Workspaces</h2>
        </div>

        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search workspaces by name"
              value={formState.searchQuery}
              onChange={handleChange("searchQuery")}
              className="input input-bordered w-full pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50" size={20} />
          </div>
        </div>

        <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {renderedOrganizations.length > 0 ? (
            renderedOrganizations(organizations, formState, handleSelectOrg)
          ) : (
            <div className="text-center py-8 text-base-content/70">
              <BuildingIcon size={48} className="mx-auto mb-2 opacity-50" />
              <p>No workspaces found</p>
            </div>
          )}
        </div>
      </div>

      {/* Authentication Verification Section */}
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 w-full">
        <div className="w-full max-w-md">
          <div className="bg-base-100 rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 text-white p-6 text-center">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-base-100/20 rounded-full">
                  <Shield size={24} />
                </div>
              </div>
              <h1 className="text-xl font-bold">Authorization Request</h1>
              <p className="text-blue-100 text-sm mt-1">OAuth 2.0 Authorization Flow</p>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Request Details */}
              <div className="mb-6 bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-blue-900 font-medium mb-4">
                  <AlertCircle size={20} />
                  <span>Authorization Request Details</span>
                </div>
                {!formState.isClientVerified && (
                  <div className="ml-2 flex items-center gap-2 text-sm text-error mt-4">
                    <AlertCircle size={16} />
                    <span>Client verification failed. Please try Again</span>
                  </div>
                )}

                {formState.isClientVerified && (
                  <div className="flex items-center gap-2 text-sm text-blue-800 mt-4">
                    <User size={16} />
                    <span>
                      <strong>{formState.client_name}</strong> wants to access your Gateway workspace
                    </span>
                  </div>
                )}
              </div>

              {/* OAuth Info */}
              <div className="mb-6 border-l-4 border-blue-600 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">What you're authorizing:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Database size={16} className="text-blue-600" />
                    <span>Access to workspace data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock size={16} className="text-blue-600" />
                    <span>Secure API access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight size={16} className="text-blue-600" />
                    <span>Integration capabilities</span>
                  </li>
                </ul>
              </div>

              {/* Workspace Selection */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600">Select a workspace to grant access to</p>
                {formState.client_name && <div className="mt-2 text-blue-600 font-medium">{formState.client_name}</div>}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50">
                  Deny Access
                </button>
                <button
                  onClick={handleVerify}
                  disabled={
                    !formState.selectedOrg ||
                    !formState.isClientVerified ||
                    missingParams.clientId ||
                    missingParams.redirectionUrl
                  }
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {formState.isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Authorizing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Grant Access
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Protected(Page);
