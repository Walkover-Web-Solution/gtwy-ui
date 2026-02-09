import { memo } from "react";

import AdvancedConfiguration from "./configurationComponent/AdvancedConfiguration";
import { useConfigurationContext } from "./ConfigurationContext";

const AdvancedSection = memo(() => {
  const { params, searchParams, isEmbedUser, hideAdvancedConfigurations, bridgeType, modelType } =
    useConfigurationContext();

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
