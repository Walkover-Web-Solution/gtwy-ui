import { MODAL_TYPE } from "@/utils/enums";
import { openModal } from "@/utils/utility";
import { MessageCircleMoreIcon } from "./Icons";
import PageHeader from "./Pageheader";
import CreateNewBridge from "./CreateNewBridge";
import { useCustomSelector } from "@/customHooks/customSelector";
import Protected from "./Protected";

const AgentEmptyState = ({ orgid, isEmbedUser, defaultBridgeType = "api" }) => {
  const { tutorialData } = useCustomSelector((state) => ({
    tutorialData: state.flowDataReducer?.flowData?.tutorialData || [],
  }));
  const agentCreationTutorial = tutorialData?.find((item) => item.title === "Agent Creation");
  const embedAgentCreationTutorial = tutorialData?.find((item) => item.title === "Agent Creation Video: Embed");
  const agentCreationvideoUrl = agentCreationTutorial?.videoUrl || "";
  const embedAgentCreationvideoUrl = embedAgentCreationTutorial?.videoUrl || "";
  return (
    <div className=" mt-8 px-4">
      <div className=" mx-2 ">
        {/* Header Section with Overlapping Layout */}
        <div className="relative w-full">
          {/* Full Width - Heading and Description */}
          {!isEmbedUser ? (
            <PageHeader
              title="Welcome To GTWY AI"
              description="Build and manage AI agents for your workflows. Agents help automate tasks, answer queries, and deliver intelligent assistance."
              docLink="https://gtwy.ai/blogs/features/bridge"
            />
          ) : (
            <PageHeader
              title="Agents"
              description={
                "Build and manage AI agents for your workflows. Agents help automate tasks, answer queries, and deliver intelligent assistance."
              }
              docLink="https://gtwy.ai/blogs/features/bridge"
              isEmbedUser={isEmbedUser}
            />
          )}

          {/* Floating Right - Create Agent Buttons */}
          <div className="absolute top-0 right-0">
            <div className="text-center flex flex-row gap-2">
              <button
                id="agent-empty-create-agent-button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  openModal(MODAL_TYPE.CREATE_BRIDGE_MODAL);
                }}
              >
                + Create New Agent
              </button>

              {!isEmbedUser ? (
                <button
                  id="agent-empty-speak-to-us-button"
                  data-cal-namespace="30min"
                  data-cal-link="team/gtwy.ai/ai-consultation"
                  data-cal-origin="https://cal.id"
                  data-cal-config='{"layout":"month_view"}'
                  className="btn btn-primary btn-sm gap-1"
                >
                  <MessageCircleMoreIcon size={12} />
                  <span className="text-sm">Speak To Us</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Video Section */}
        <div className="flex justify-center">
          <div className=" rounded-2xl p-6 border border-base-300/50">
            <div className="text-center mb-3">
              <h2 className="text-lg mb-4 font-bold text-base-content">Watch How to Create Your First Agent</h2>
            </div>
            <div className=" h-[70vh] w-[80vw] rounded-xl flex justify-center items-center overflow-hidden">
              <iframe
                src={
                  isEmbedUser
                    ? embedAgentCreationvideoUrl
                    : agentCreationvideoUrl || "https://app.supademo.com/embed/cm9shc2ek0gt6dtm7tmez2orj?embed_v=2"
                }
                height={!isEmbedUser ? "100%" : "80%"}
                width={!isEmbedUser ? "70%" : "100%"}
                style={{ border: "none" }}
                allowFullScreen
                title="How to Create an Agent"
              />
            </div>
          </div>
        </div>

        {/* Features Section */}

        <CreateNewBridge orgid={orgid} isEmbedUser={isEmbedUser} defaultBridgeType={defaultBridgeType} />
      </div>
    </div>
  );
};

export default Protected(AgentEmptyState);
