import React from "react";
import { ArrowDown } from "lucide-react";
import { UserIcon, BotIcon } from "@/components/Icons";

export const StatelessChatLoadingSkeleton = () => {
  return (
    <div data-testid="stateless-loading-skeleton" className="w-full h-full overflow-y-auto pb-16 px-3 pt-4">
      <div className="animate-pulse space-y-4 max-w-3xl mx-auto">
        {/* System Prompt Banner Skeleton */}
        <div className="mb-3 px-4">
          <div className="bg-base-200 border border-base-300 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="bg-base-300 w-4 h-4 rounded shrink-0"></div>
              <div className="bg-base-300 w-24 h-3 rounded"></div>
              <div className="bg-base-300 w-48 h-3 rounded ml-2"></div>
            </div>
          </div>
        </div>

        {/* User Query card skeleton */}
        <div className="w-full bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <UserIcon size={13} className="text-primary/40" />
            </div>
            <div className="bg-primary/20 w-20 h-3 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="bg-primary/20 w-full h-3 rounded"></div>
            <div className="bg-primary/20 w-5/6 h-3 rounded"></div>
            <div className="bg-primary/20 w-2/3 h-3 rounded"></div>
          </div>
        </div>

        {/* Arrow Down & Time Badge Skeleton */}
        <div className="flex flex-row items-center justify-center my-3 w-full gap-3">
          <div className="bg-base-300/50 w-6 h-6 rounded-full flex items-center justify-center">
            <ArrowDown className="w-3.5 h-3.5 text-base-content/30" />
          </div>
          <div className="bg-base-200 border border-base-300 w-16 h-5 rounded-md animate-pulse"></div>
        </div>

        {/* Functions Executed Skeleton */}
        <div className="w-fit mx-auto border border-base-300 rounded-xl px-6 py-4 bg-base-200/30">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-base-300 w-32 h-3 rounded animate-pulse"></div>
          </div>
          <div className="flex flex-col items-center gap-3">
            {/* Parallel/Single Tool chip skeletons */}
            <div className="border border-base-300 rounded-xl px-4 py-3 bg-base-200 flex flex-row gap-2">
              <div className="bg-base-300 w-24 h-6 rounded-lg"></div>
              <div className="bg-base-300 w-24 h-6 rounded-lg"></div>
            </div>
            <ArrowDown className="w-4 h-4 text-base-content/20" />
            <div className="border border-base-300 rounded-xl px-4 py-3 bg-base-200 animate-pulse">
              <div className="bg-base-300 w-32 h-6 rounded-lg"></div>
            </div>
          </div>
        </div>

        {/* Arrow Down & Time Badge Skeleton */}
        <div className="flex flex-row items-center justify-center my-3 w-full gap-3">
          <div className="bg-base-300/50 w-6 h-6 rounded-full flex items-center justify-center">
            <ArrowDown className="w-3.5 h-3.5 text-base-content/30" />
          </div>
          <div className="bg-base-200 border border-base-300 w-16 h-5 rounded-md animate-pulse"></div>
        </div>

        {/* AI Response skeleton */}
        <div className="w-full bg-base-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center shrink-0">
              <BotIcon size={13} className="text-base-content/50" />
            </div>
            <div className="bg-base-300 w-20 h-3 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="bg-base-300 w-full h-3 rounded"></div>
            <div className="bg-base-300 w-11/12 h-3 rounded"></div>
            <div className="bg-base-300 w-4/5 h-3 rounded"></div>
            <div className="bg-base-300 w-5/6 h-3 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatLoadingSkeleton = ({ isSingleQuery = false }) => {
  if (isSingleQuery) {
    return <StatelessChatLoadingSkeleton />;
  }
  return (
    <div data-testid="chat-loading-skeleton" className="w-full h-full overflow-y-auto pb-16 px-3 pt-4">
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
