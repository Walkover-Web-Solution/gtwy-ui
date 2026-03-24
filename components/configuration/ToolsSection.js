import { memo } from "react";
import EmbedList from "./configurationComponent/EmbedList";
import ConnectedAgentList from "./configurationComponent/ConnectedAgentList";
import KnowledgebaseList from "./configurationComponent/KnowledgebaseList";
import { useConfigurationContext } from "./ConfigurationContext";

const ToolsSection = memo(({ isPublished }) => {
  const { params, searchParams, isEditor } = useConfigurationContext();

  return (
    <div data-testid="tools-section-container" id="tools-section-container" className="flex mt-4 gap-4 flex-col">
      <EmbedList params={params} searchParams={searchParams} isPublished={isPublished} isEditor={isEditor} />
      <ConnectedAgentList params={params} searchParams={searchParams} isPublished={isPublished} isEditor={isEditor} />
      <KnowledgebaseList params={params} searchParams={searchParams} isPublished={isPublished} isEditor={isEditor} />
    </div>
  );
});

ToolsSection.displayName = "ToolsSection";

export default ToolsSection;
