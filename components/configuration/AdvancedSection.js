import { memo } from "react";

import AdvancedConfiguration from "./configurationComponent/AdvancedConfiguration";
import { useCustomSelector } from "@/customHooks/customSelector";

const AdvancedSection = memo(({ params, searchParams, isEmbedUser, isPublished }) => {
  const { hideAdvancedConfigurations, bridgeType, modelType } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];

    return {
      hideAdvancedConfigurations: state.appInfoReducer.embedUserDetails.hideAdvancedConfigurations,
      bridgeType: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.bridgeType?.trim()?.toLowerCase() || "api",
      modelType: isPublished
        ? bridgeDataFromState?.configuration?.type?.toLowerCase()
        : versionData?.configuration?.type?.toLowerCase(),
    };
  });

  return (
    <>
      {((isEmbedUser && !hideAdvancedConfigurations) || !isEmbedUser) && (
        <AdvancedConfiguration
          params={params}
          searchParams={searchParams}
          bridgeType={bridgeType}
          modelType={modelType}
          isEmbedUser={isEmbedUser}
        />
      )}
    </>
  );
});

AdvancedSection.displayName = "AdvancedSection";

export default AdvancedSection;
