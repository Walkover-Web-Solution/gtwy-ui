"use client";
import React from "react";
import { ArrowRight } from "lucide-react";
import GTWYIcon from "@/icons/FavIcon";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateUserMetaOnboarding } from "@/store/action/orgAction";
import useTutorialVideos from "@/hooks/useTutorialVideos";

export default function OnboardingPage() {
  const { currentUser } = useCustomSelector((state) => ({
    currentUser: state.userDetailsReducer?.userDetails,
  }));
  const { getApiAgentCreationVideo } = useTutorialVideos();
  const dispatch = useDispatch();
  const router = useRouter();

  const handleContinue = async () => {
    const updatedOrgDetails = {
      ...currentUser,
      meta: {
        ...currentUser?.meta,
        newUser: "false",
      },
    };
    await dispatch(updateUserMetaOnboarding(currentUser.id, updatedOrgDetails));
    router.push("/org");
  };

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center relative overflow-hidden">
      {/* Geometric background decorations — matches not-found/error style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="opacity-[0.03] absolute top-20 right-20 w-96 h-96 border-2 border-base-content rounded-full" />
        <div className="opacity-[0.03] absolute bottom-40 left-20 w-64 h-64 border-2 border-base-content rotate-[15deg]" />
        <div
          className="opacity-[0.03] absolute top-1/2 left-1/4 w-48 h-48"
          style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
        >
          <div className="w-full h-full border-2 border-base-content" />
        </div>
      </div>

      {/* Logo — top-left */}
      <div className="absolute top-6 left-8 z-10">
        <GTWYIcon width={60} height={60} />
      </div>

      <div className="relative z-10 text-center px-6 w-full max-w-3xl mx-auto">
        {/* Heading */}
        <div className="mb-8">
          <p className="font-mono text-xs text-base-content/40 tracking-widest uppercase mb-4">Workspace ready</p>
          <h1 className="text-base-content text-3xl sm:text-4xl md:text-5xl mb-4 tracking-tight font-light">
            Your workspace is ready!
          </h1>
          <p className="text-base-content/60 leading-relaxed max-w-md mx-auto">
            Get started faster — watch the key concepts of AI automation.
          </p>
        </div>

        {/* Video */}
        <div className="mb-10 border border-base-content/10 rounded-lg overflow-hidden shadow-lg">
          <div className="relative aspect-video">
            <iframe
              src={getApiAgentCreationVideo()}
              loading="lazy"
              title="AI-middleware"
              allow="clipboard-write"
              frameBorder="0"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button onClick={handleContinue} className="btn btn-primary gap-2 group">
            Start automating
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </div>

        <div className="mt-16 pt-8 border-t border-base-content/10">
          <p className="font-mono text-xs text-base-content/40 tracking-wider">GTWY_AI: WORKSPACE_INITIALIZED</p>
        </div>
      </div>

      {/* Blinking cursor — matches not-found/error style */}
      <div className="absolute bottom-8 left-8 font-mono text-sm text-base-content/30">
        gtwy<span className="animate-[blink_1s_infinite]">|</span>
      </div>
    </div>
  );
}
