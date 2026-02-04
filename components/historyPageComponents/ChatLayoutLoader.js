export const ChatLoadingSkeleton = () => {
  return (
    <div className="w-full h-full overflow-y-auto pb-16 px-3 pt-4">
      {[...Array(2)].map((_, index) => (
        <div key={index} className="mb-6 animate-pulse">
          {/* User message skeleton */}
          <div className="chat chat-end mt-9">
            <div className="chat-image avatar">
              <div className="w-10 rounded-full">
                <div className="bg-base-200 w-10 h-10 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="chat-header">
              <div className="bg-base-200 w-16 h-3 rounded animate-pulse mb-1"></div>
              <time className="text-xs opacity-50">
                <div className="bg-base-200 w-20 h-3 rounded animate-pulse"></div>
              </time>
            </div>
            <div className="chat-bubble w-96 chat-bubble-primary opacity-50">
              <div className="bg-base-100 w-full h-2 mb-2 rounded animate-pulse"></div>
              <div className="bg-base-100 w-3/4 h-2 rounded animate-pulse"></div>
            </div>
          </div>

          {/* AI response skeleton */}
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="w-10 rounded-full">
                <div className="bg-base-200 w-10 h-10 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="chat-header">
              <div className="bg-base-200 w-12 h-3 rounded animate-pulse mb-1"></div>
              <time className="text-xs opacity-50">
                <div className="bg-base-200 w-32 h-3 rounded animate-pulse"></div>
              </time>
            </div>
            <div className="chat-bubble w-[96%] bg-base-200">
              {/* Code block skeleton */}
              <div className="bg-base-300 rounded p-3 mb-3 animate-pulse">
                <div className="bg-base-100 w-full h-2 mb-2 rounded animate-pulse"></div>
                <div className="bg-base-100 w-full h-2 mb-2 rounded animate-pulse"></div>
                <div className="bg-base-100 w-4/5 h-2 rounded animate-pulse"></div>
              </div>

              {/* Response text skeleton */}
              <div className="mb-3">
                <div className="bg-base-100 w-full h-2 mb-2 rounded animate-pulse"></div>
                <div className="bg-base-100 w-4/5 h-2 mb-2 rounded animate-pulse"></div>
                <div className="bg-base-100 w-3/4 h-2 mb-2 rounded animate-pulse"></div>
                <div className="bg-base-100 w-5/6 h-2 rounded animate-pulse"></div>
              </div>

              {/* Action buttons skeleton */}
              <div className="flex gap-2 mt-3">
                <div className="bg-base-100 w-12 h-6 rounded animate-pulse"></div>
                <div className="bg-base-100 w-16 h-6 rounded animate-pulse"></div>
                <div className="bg-base-100 w-20 h-6 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
