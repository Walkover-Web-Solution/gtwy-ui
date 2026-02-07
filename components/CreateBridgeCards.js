import React from "react";
import { BotIcon, CheckIcon, CircleAlertIcon, ClockTenIcon, WebhookIcon } from "@/components/Icons";
import Modal from "./UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";

const BridgeTypeCards = ({
  selectedBridgeTypeCard,
  handleBridgeTypeSelection,
  validationErrors = { bridgeType: "" },
  isEmbedUser,
  isModal,
}) => {
  return (
    <div
      id="bridge-type-cards-container"
      className={`space-y-2 pb-2 p-2 mt-2 ml-4 text-semi-bold ${isModal ? "bg-base-200 rounded-xl p-6" : ""}`}
    >
      <div className="flex justify-between items-center">
        <label className="text-md  text-base-content">Select Agent Type</label>
        {validationErrors?.bridgeType && <span className="text-red-500 text-sm">{validationErrors.bridgeType}</span>}
      </div>
      <div
        className={`flex flex-col md:flex-row gap-2 justify-center mx-auto overflow-x-auto p-2 ${
          validationErrors?.bridgeType ? "border border-red-500 rounded-xl" : ""
        }`}
      >
        {/* API Card */}
        <div
          id="bridge-type-api-card"
          className={`card bg-base-100 hover:shadow-xl transition-all duration-300 cursor-pointer border border-base-200 rounded-xl border-base-content/30 min-w-[280px] md:min-w-0 ${
            selectedBridgeTypeCard === "api" ? "ring-2 ring-blue-500" : ""
          }`}
          onClick={() => handleBridgeTypeSelection("api")}
        >
          <div className="card-body p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
              <div className="p-2 md:p-3 rounded-lg bg-base-200">
                <WebhookIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                {selectedBridgeTypeCard === "api" && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckIcon className="text-base-100 h-4 w-4" />
                  </div>
                )}
              </div>
              <h2 className="card-title text-lg md:text-xl font-semibold text-base-content">API</h2>
            </div>
            <p className="text-xs md:text-sm text-base-content leading-relaxed">
              Easily integrate AI into your backend using our API. Send prompts, receive intelligent responses, and
              automate tasks—no frontend needed. It's fast, flexible, and works with any backend stack.
            </p>
          </div>
        </div>

        {/* Chatbot Card */}
        {!isModal && (
          <div
            id="bridge-type-chatbot-card"
            className={`card bg-base-100 hover:shadow-xl transition-all duration-300 cursor-pointer border border-base-200 rounded-xl border-base-content/30 min-w-[280px] md:min-w-0 ${
              selectedBridgeTypeCard === "chatbot" ? "ring-2 ring-green-500" : ""
            }`}
            onClick={() => handleBridgeTypeSelection("chatbot")}
          >
            <div className="card-body p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-base-200">
                  <BotIcon className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                  {selectedBridgeTypeCard === "chatbot" && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckIcon className="text-base-100 h-4 w-4" />
                    </div>
                  )}
                </div>
                <h2 className="card-title text-lg md:text-xl font-semibold text-base-content">Chatbot</h2>
              </div>
              <p className="text-xs md:text-sm text-base-content leading-relaxed">
                Quickly embed an AI-powered chatbot into your app or website. It responds in real time, handles user
                queries, and delivers smart, conversational experiences—fully customizable and easy to deploy.
              </p>
            </div>
          </div>
        )}

        {/* Batch API Card */}
        {!isModal && (
          <div
            id="bridge-type-batch-card"
            className={`card bg-base-100 hover:shadow-xl transition-all duration-300 cursor-pointer border border-base-content/30    rounded-xl min-w-[280px] md:min-w-0 ${
              selectedBridgeTypeCard === "batch" ? "ring-2 ring-purple-500" : ""
            }`}
            onClick={() => handleBridgeTypeSelection("batch")}
          >
            <div className="card-body p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-purple-50">
                  <ClockTenIcon className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                  {selectedBridgeTypeCard === "batch" && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <CheckIcon className="text-base-100 h-4 w-4" />
                    </div>
                  )}
                </div>
                <h2 className="card-title text-lg md:text-xl font-semibold text-base-content">Batch API</h2>
              </div>
              <p className="text-xs md:text-sm text-base-content leading-relaxed">
                Process multiple prompts or data inputs in a single request using the Batch API. Ideal for large-scale
                tasks like summarization, generation, or classification—fast, efficient, and built for bulk operations.
              </p>
            </div>
          </div>
        )}

        {/* Triggers Card */}
        {!isEmbedUser && !isModal && (
          <div
            id="bridge-type-trigger-card"
            className={`card bg-base-100 hover:shadow-xl transition-all duration-300 cursor-pointer border border-base-content/30 rounded-xl min-w-[280px] md:min-w-0 ${
              selectedBridgeTypeCard === "trigger" ? "ring-2 ring-amber-500" : ""
            }`}
            onClick={() => handleBridgeTypeSelection("trigger")}
          >
            <div className="card-body p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                <div className="p-2 md:p-3 rounded-lg bg-base-200">
                  <CircleAlertIcon className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
                  {selectedBridgeTypeCard === "trigger" && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <CheckIcon className="text-base-100 h-4 w-4" />
                    </div>
                  )}
                </div>
                <h2 className="card-title text-lg md:text-xl font-semibold text-base-content">Triggers</h2>
              </div>
              <p className="text-xs md:text-sm text-base-content leading-relaxed">
                Automate workflows using Triggers. Set conditions to auto-run actions like sending prompts, generating
                responses, or forwarding data—no manual input required. Perfect for real-time automation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
const CreateBridgeCards = ({
  selectedBridgeTypeCard,
  handleBridgeTypeSelection,
  validationErrors,
  isEmbedUser,
  isModal,
}) => {
  return isModal ? (
    <Modal MODAL_ID={MODAL_TYPE.BRIDGE_TYPE_MODAL}>
      <div id="bridge-type-modal-container" className="modal-box max-w-[80vw]">
        <BridgeTypeCards
          selectedBridgeTypeCard={selectedBridgeTypeCard}
          handleBridgeTypeSelection={handleBridgeTypeSelection}
          validationErrors={validationErrors}
          isEmbedUser={isEmbedUser}
          isModal={isModal}
        />
      </div>
    </Modal>
  ) : (
    <>
      <BridgeTypeCards
        selectedBridgeTypeCard={selectedBridgeTypeCard}
        handleBridgeTypeSelection={handleBridgeTypeSelection}
        validationErrors={validationErrors}
        isEmbedUser={isEmbedUser}
        isModal={isModal}
      />
    </>
  );
};

export default CreateBridgeCards;
