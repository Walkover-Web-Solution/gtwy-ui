"use client";

function FeedbackPage() {
  return (
    <div className="w-full h-screen">
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 w-full p-4">
          <div className="w-full h-full bg-base-100 rounded-lg shadow-lg overflow-hidden">
            <iframe
              title="Feedback Widget"
              src={process.env.NEXT_PUBLIC_FRILLURL}
              sandbox="allow-same-origin allow-scripts allow-top-navigation allow-popups allow-forms allow-popups-to-escape-sandbox"
              style={{ border: "0px", outline: "0px", width: "100%", height: "100%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeedbackPage;
