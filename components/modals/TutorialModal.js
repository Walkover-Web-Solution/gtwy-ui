"use client";
import { MODAL_TYPE } from "@/utils/enums";
import React, { useState, useRef, useEffect } from "react";
import {
  PlayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BookIcon,
  BotIcon,
  KeyIcon,
  WrenchIcon,
  SettingsIcon,
} from "@/components/Icons";
import { closeModal } from "@/utils/utility";
import Modal from "../UI/Modal";
import { useCustomSelector } from "@/customHooks/customSelector";

const TutorialVideo = ({ videoUrl, title }) => {
  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      <iframe
        src={videoUrl}
        title={title}
        className="w-full aspect-video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};
const iconMap = {
  bot: BotIcon,
  key: KeyIcon,
  wrench: WrenchIcon,
  settings: SettingsIcon,
  "book-text": BookIcon,
};
const TutorialModal = () => {
  const { tutorialData } = useCustomSelector((state) => ({
    tutorialData: state.flowDataReducer?.flowData?.tutorialData || [],
  }));
  const [activeIndex, setActiveIndex] = useState(null);
  const videoRefs = useRef({});
  const contentAreaRef = useRef(null);
  useEffect(() => {
    return () => {
      setActiveIndex(null);
    };
  }, []);
  const internalClose = () => {
    setActiveIndex(null);
    closeModal(MODAL_TYPE.TUTORIAL_MODAL);
  };
  const toggleTutorial = (index) => {
    const newActiveIndex = index === activeIndex ? null : index;
    setActiveIndex(newActiveIndex);

    // Scroll to video when opened
    if (newActiveIndex !== null) {
      setTimeout(() => {
        const videoElement = videoRefs.current[index];
        if (videoElement && contentAreaRef.current) {
          videoElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }, 150); // Small delay to allow animation to start
    }
  };

  // Set ref for video sections
  const setVideoRef = (index, element) => {
    videoRefs.current[index] = element;
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.TUTORIAL_MODAL} onClose={internalClose}>
      {/* Main Modal */}
      <div
        id="tutorial-modal-container"
        className="relative z-low w-full max-w-5xl bg-base-100 rounded-xl shadow-2xl overflow-hidden border border-base-300"
      >
        {/* Header */}
        <div className=" px-8 py-6 ">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg">
                <BookIcon size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">GTWY AI Tutorials</h2>
                <p className="text-base-content  text-sm mt-1">Learn how to use our platform effectively</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div ref={contentAreaRef} className="p-8 max-h-[75vh] overflow-y-auto scroll-smooth">
          <div className="space-y-3">
            {tutorialData?.map((tutorial, index) => {
              const IconComponent = iconMap[tutorial.icon];
              const isActive = activeIndex === index;

              return (
                <div
                  id={`tutorial-item-${index}`}
                  key={index}
                  className={`border rounded-xl transition-all duration-200 transform hover:scale-[1.01] ${
                    isActive
                      ? "border-base-300 shadow-lg bg-base-100"
                      : "border-base-300 hover:border-base-300 hover:shadow-md bg-base-100 hover:bg-base-100"
                  }`}
                >
                  <div className="p-4 cursor-pointer">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div
                        className={`p-2.5 bg-base-100 rounded-lg border border-base-300 transition-all duration-200 ${
                          isActive ? "bg-base-300 border-base-200" : "group-hover:bg-base-200"
                        }`}
                      >
                        <IconComponent
                          size={20}
                          className={`transition-colors duration-200 ${isActive ? "text-base-content" : "text-base-content"}`}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-base-content mb-1 truncate">{tutorial.title}</h3>
                        <p className="text-base-content text-sm leading-relaxed line-clamp-1">{tutorial.description}</p>
                      </div>

                      {/* Action buttons and indicator */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {!isActive && (
                          <button
                            id={`tutorial-watch-button-${index}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTutorial(index);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-base-300 text-base-content rounded-lg hover:bg-base-200 transition-all duration-200 text-sm font-medium hover:scale-105 shadow-sm hover:shadow-md"
                          >
                            <PlayIcon size={20} />
                            Watch
                          </button>
                        )}

                        <div
                          id={`tutorial-toggle-${index}`}
                          className={`text-slate-400 transition-transform duration-200 cursor-pointer ${
                            isActive ? "rotate-180" : "hover:translate-x-1"
                          }`}
                          onClick={() => toggleTutorial(index)}
                        >
                          {isActive ? <ChevronDownIcon size={20} /> : <ChevronRightIcon size={20} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Section */}
                  {isActive && (
                    <div
                      ref={(el) => setVideoRef(index, el)}
                      className="border-t border-base-300 bg-base-100 animate-in slide-in-from-top-2 duration-300"
                    >
                      <div className="p-6">
                        <TutorialVideo videoUrl={tutorial.videoUrl} title={tutorial.title} />
                        <div className="mt-6 flex justify-between items-center">
                          <div className="text-sm text-base-content flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            You can pause, rewind, or replay the video using the video controls
                          </div>
                          <button
                            id={`tutorial-close-video-button-${index}`}
                            onClick={() => setActiveIndex(null)}
                            className="px-4 py-2 text-base-content hover:text-base-content hover:bg-base-200 rounded-lg transition-all duration-200 text-sm hover:scale-105"
                          >
                            Close Video
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-base-300 bg-base-100 px-8 py-5">
          <div className="flex justify-between items-center">
            <button
              id="tutorial-close-button"
              onClick={internalClose}
              className="px-6 py-2 bg-base-300 text-base-content rounded-lg hover:bg-base-200 transition-all duration-200 font-medium text-sm hover:scale-105 shadow-sm hover:shadow-md ml-auto"
            >
              Close Tutorials
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TutorialModal;
