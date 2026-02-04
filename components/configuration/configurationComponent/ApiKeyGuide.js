import { CloseIcon } from "@/components/Icons";
import { useCustomSelector } from "@/customHooks/customSelector";
import { toggleSidebar } from "@/utils/utility";
import React, { useState, useMemo, useEffect } from "react";

// Configuration object for better maintainability

// Reusable components
const Section = ({ title, caption, children }) => (
  <div className="flex items-start flex-col justify-center mb-6">
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-base-content block mb-4">{caption}</p>
    {children}
  </div>
);

const StepCard = ({ stepNumber, title, children }) => (
  <div className="bg-base-200 p-5 rounded-lg mb-4 border-l-4 border-primary">
    <h4 className="font-semibold text-base text-primary mb-3 flex items-center">
      <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">
        {stepNumber}
      </span>
      {title}
    </h4>
    {children}
  </div>
);

const CodeBlock = ({ children }) => (
  <div className="bg-base-200 rounded-lg p-4 mt-3 mb-3 font-mono text-sm overflow-x-auto">
    <div className="flex items-center">
      <span className="text-green-400 mr-2">$</span>
      <code className="text-yellow-300">{children}</code>
    </div>
  </div>
);

const Link = ({ href, children }) => (
  <a
    id="api-key-guide-provider-link"
    href={href}
    className="text-blue-600 hover:underline font-medium"
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
);

function ApiKeyGuideSlider() {
  const { API_PROVIDERS } = useCustomSelector((state) => ({
    API_PROVIDERS: state.flowDataReducer?.flowData?.apiKeyGuideData || [],
  }));

  // Memoize the model tabs to prevent unnecessary re-renders
  const modelTabs = useMemo(
    () =>
      API_PROVIDERS.map((provider) => ({
        id: provider.key,
        name: provider.name,
        color: "bg-primary",
      })),
    [API_PROVIDERS]
  );
  const [selectedModel, setSelectedModel] = useState();

  useEffect(() => {
    if (modelTabs.length > 0 && !selectedModel) {
      setSelectedModel(modelTabs[0].id);
    }
  }, [modelTabs, selectedModel]);

  // Memoize the guide content to prevent unnecessary re-renders
  const guideContent = useMemo(() => {
    const provider = API_PROVIDERS.find((p) => p.key === selectedModel);
    if (!provider) return null;
    return (
      <div className="flex w-full flex-col gap-4 bg-base-100 shadow p-8">
        <Section title={provider.title} caption={provider.caption}>
          {provider.steps.map((step, index) => (
            <StepCard key={index} stepNumber={index + 1} title={step.title}>
              {step.content.map((paragraph, pIndex) => {
                // Check if this paragraph mentions key format and next step should show the format
                const shouldShowKeyFormat =
                  paragraph.toLowerCase().includes("format:") || paragraph.toLowerCase().includes("look like this:");

                if (shouldShowKeyFormat) {
                  return (
                    <div key={pIndex}>
                      <p className="text-sm text-base-content mb-3">{paragraph}</p>
                      <CodeBlock>{provider.keyFormat}</CodeBlock>
                    </div>
                  );
                }

                // Handle URL mentions
                if (provider.url && paragraph.includes(provider.url.replace("https://", ""))) {
                  const urlText = provider.url.replace("https://", "");
                  const parts = paragraph.split(urlText);
                  return (
                    <p key={pIndex} className="text-sm text-base-content mb-3">
                      {parts[0]}
                      <Link href={provider.url}>{urlText}</Link>
                      {parts[1]}
                    </p>
                  );
                }

                // Regular paragraph
                return (
                  <p key={pIndex} className="text-sm text-base-content mb-2">
                    {paragraph}
                  </p>
                );
              })}
            </StepCard>
          ))}
        </Section>
      </div>
    );
  }, [selectedModel, API_PROVIDERS]);

  return (
    <aside
      id="Api-Keys-guide-slider"
      className="fixed inset-y-0 right-0 border-l-2 bg-base-100 shadow-2xl rounded-md w-full md:w-1/2 lg:w-1/2 
               overflow-y-auto bg-gradient-to-br from-base-200 to-base-100 transition-all duration-300 ease-in-out z-medium
               translate-x-full"
      aria-label="Api Keys guide slider"
    >
      <div>
        <button
          id="api-key-guide-close-button"
          onClick={() => toggleSidebar("Api-Keys-guide-slider", "right")}
          className="absolute top-4 right-4 p-2 rounded-full hover:text-error transition-colors z-10"
          aria-label="Close guide"
        >
          <CloseIcon />
        </button>

        {/* Header */}
        <div className="sticky top-0 bg-base-100 p-6 border-b border-base-300">
          <h2 className="text-xl font-bold mb-4">API Key Setup Guide</h2>

          {/* Model Selection Tabs */}
          <div id="api-key-guide-tabs" className="flex flex-wrap gap-2">
            {modelTabs.map((model) => (
              <button
                id={`api-key-guide-tab-${model.id}`}
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedModel === model.id
                    ? `${model.color} text-white shadow-lg`
                    : "bg-base-200 text-base-content hover:bg-base-300"
                }`}
                aria-pressed={selectedModel === model.id}
              >
                {model.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">{guideContent}</div>
      </div>
    </aside>
  );
}

export default ApiKeyGuideSlider;
