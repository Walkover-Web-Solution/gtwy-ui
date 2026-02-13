import React from "react";
import { useCustomSelector } from "@/customHooks/customSelector";

const ApiKeysInput = ({ configuration, onChange, orgId }) => {
  const SERVICES = useCustomSelector((state) => state?.serviceReducer?.services);

  const { apikeydata } = useCustomSelector((state) => {
    const apikeys = state?.apiKeysReducer?.apikeys?.[orgId] || [];
    return { apikeydata: apikeys };
  });

  const handleApiKeyChange = (serviceKey, value) => {
    const currentApiKeys = configuration?.apikey_object_id || {};
    onChange("apikey_object_id", {
      ...currentApiKeys,
      [serviceKey]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-base-content mb-3">Configure API Keys for Services</div>

      {Array.isArray(SERVICES)
        ? SERVICES.map(({ value: serviceKey, displayName }) => {
            const selectedId = configuration?.apikey_object_id?.[serviceKey] || "";
            const serviceApiKeys = (apikeydata || []).filter((apiKey) => apiKey?.service === serviceKey);

            return (
              <div key={serviceKey} className="flex items-center gap-3">
                <div className="w-32 text-sm font-medium text-base-content">{displayName}:</div>

                <select
                  id={`api-key-select-${serviceKey}`}
                  className="select select-bordered select-primary w-full select-sm"
                  value={selectedId}
                  onChange={(e) => handleApiKeyChange(serviceKey, e.target.value)}
                >
                  <option value="" disabled>
                    Select API key
                  </option>
                  {serviceApiKeys.map((apiKey) => (
                    <option key={apiKey._id} value={apiKey._id}>
                      {apiKey.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })
        : null}
    </div>
  );
};

export default ApiKeysInput;
