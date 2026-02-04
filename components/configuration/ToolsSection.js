import { memo } from "react";
import { AlertIcon } from "@/components/Icons";
import EmbedList from "./configurationComponent/EmbedList";
import ConnectedAgentList from "./configurationComponent/ConnectedAgentList";
import KnowledgebaseList from "./configurationComponent/KnowledgebaseList";
import { useConfigurationContext } from "./ConfigurationContext";

const ToolsSection = memo(({ isPublished }) => {
  const { params, searchParams, shouldToolsShow, isEditor } = useConfigurationContext();
  if (!shouldToolsShow) {
    return (
      <div id="tools-section-no-tools-alert" className="flex items-center gap-2 mt-3 mb-3">
        <AlertIcon size={18} className="text-warning" />
        <h2 className="text-center">This model does not support tools</h2>
      </div>
    );
  }

  return (
    <div id="tools-section-container" className="flex mt-4 gap-4 flex-col">
      <EmbedList params={params} searchParams={searchParams} isPublished={isPublished} isEditor={isEditor} />
      <ConnectedAgentList params={params} searchParams={searchParams} isPublished={isPublished} isEditor={isEditor} />
      <KnowledgebaseList params={params} searchParams={searchParams} isPublished={isPublished} isEditor={isEditor} />
    </div>
  );
});

ToolsSection.displayName = "ToolsSection";

export default ToolsSection;
