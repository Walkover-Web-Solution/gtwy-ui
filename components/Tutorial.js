import React from "react";

const Tutorial = ({ video, setShowTutorial }) => {
  const handleVideoEnd = async () => {
    setShowTutorial(false);
  };
  return (
    <div
      id="tutorial-modal-overlay"
      className="fixed inset-0 z-very-high bg-black bg-opacity-70 flex items-center justify-center"
    >
      <button
        id="tutorial-close-button"
        onClick={() => handleVideoEnd()}
        className="absolute top-4 right-4 text-white text-4xl hover:text-gray-700 z-low-medium"
        aria-label="Close Tutorial"
      >
        &times;
      </button>

      <div
        className="rounded-xl overflow-hidden"
        style={{
          position: "relative",
          boxSizing: "content-box",
          maxHeight: "76vh",
          width: "160vh",
          aspectRatio: "1.935483870967742",
          padding: "40px 0",
        }}
      >
        <iframe
          id="tutorial-video-iframe"
          src={video}
          loading="lazy"
          title="AI-middleware"
          allow="clipboard-write"
          frameBorder="0"
          webkitallowfullscreen="true"
          mozallowfullscreen="true"
          allowFullScreen
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
          className="rounded-xl"
        />
      </div>
    </div>
  );
};

export default Tutorial;
