"use client";
import React, { useEffect } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useSearchParams } from "next/navigation";
import { setInCookies } from "@/utils/utility";
import FavIconSVG from "@/public/favicon";

const LoginPage = ({ loading }) => {
  const urlParams = useSearchParams();
  // Extract UTM parameters
  const utmSource = urlParams.get("utm_source");
  const utmMedium = urlParams.get("utm_medium");
  const utmCampaign = urlParams.get("utm_campaign");
  const utmTerm = urlParams.get("utm_term");
  const utmContent = urlParams.get("utm_content");

  useEffect(() => {
    // Store UTM parameters in cookies
    if (utmSource) {
      setInCookies("utm_source", utmSource);
    }
    if (utmMedium) {
      setInCookies("utm_medium", utmMedium);
    }
    if (utmCampaign) {
      setInCookies("utm_campaign", utmCampaign);
    }
    if (utmTerm) {
      setInCookies("utm_term", utmTerm);
    }
    if (utmContent) {
      setInCookies("utm_content", utmContent);
    }
  }, [utmSource, utmMedium, utmCampaign, utmTerm, utmContent]);
  return (
    <div className="min-h-screen w-full bg-base-200 p-6">
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="container mx-auto">
          {/* Logo and centered secure login label in same row */}
          <div className="flex items-center justify-between mb-8">
            <div className="w-16 relative">
              <a
                id="login-page-logo-link"
                href={process.env.NEXT_PUBLIC_FRONTEND_URL}
                className="inline-block cursor-pointer relative"
              >
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="relative">
                    {/* Rotating box positioned behind the logo - offset to match reference image */}
                    <div
                      className="absolute border-[0.5px] border-base-content/20 opacity-30"
                      style={{
                        width: "100px",
                        height: "100px",
                        animation: "spin 20s linear infinite",
                        transformOrigin: "center",
                        transform: "rotate(45deg)",
                        left: "80px" /* Position more to the right */,
                        top: "150px" /* Position at center */,
                      }}
                    ></div>

                    {/* Logo and text on top of the rotating box */}
                    <div className="relative z-10 opacity-90 hover:opacity-100 transition-opacity">
                      <div className="flex items-center">
                        <FavIconSVG height={100} width={100} />
                      </div>
                    </div>
                  </div>
                </div>
              </a>
              <div
                className="absolute border-[0.5px] border-base-content/20 opacity-30"
                style={{
                  width: "80px",
                  height: "80px",
                  animation: "spin 20s linear infinite",
                  transformOrigin: "center",
                  transform: "rotate(45deg)",
                  left: "1200px" /* Position more to the right */,
                  top: "600px" /* Position at center */,
                }}
              ></div>
              <div
                className="absolute border-[0.5px] border-base-content/20 opacity-30"
                style={{
                  width: "50px",
                  height: "50px",
                  animation: "spin 20s linear infinite",
                  transformOrigin: "center",
                  transform: "rotate(45deg)",
                  left: "1100px" /* Position more to the right */,
                  top: "300px" /* Position at center */,
                }}
              ></div>
            </div>

            <div className="flex-1 flex justify-center">
              <div className="inline-flex items-center gap-2 px-6 py-2 bg-white/80 backdrop-blur-sm border border-black/10 rounded-full shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs tracking-wider text-black/60">SECURE LOGIN</span>
              </div>
            </div>

            <div className="w-12" />
          </div>

          {/* Login card in center */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-full max-w-md">
              {/* Corner borders */}
              <div className="bg-base-100/20 backdrop-blur-xl border border-base-content/10 shadow-lg p-12 relative animate-[fadeInUp_0.8s_ease-out_0.1s_both]">
                <div className="absolute -top-px -left-px w-16 h-16 border-l-2 border-t-2 border-base-content/20"></div>
                <div className="absolute -bottom-px -right-px w-16 h-16 border-r-2 border-b-2 border-base-content/20"></div>

                {/* Welcome Text */}
                <div className="text-center mb-6">
                  <h1 className="text-4xl font-semibold text-base-content tracking-tight mb-4">Welcome Back</h1>
                  <p className="text-base-content tracking-wide">Login to access your AI workspace</p>
                </div>

                {/* Login Options */}
                <div className="w-full flex flex-col items-center justify-center py-16 gap-4 [&_[data-create-account='true']]:whitespace-nowrap">
                  <div
                    id={process.env.NEXT_PUBLIC_REFERENCEID}
                    className="w-full flex flex-col justify-center items-center"
                  />
                </div>
              </div>
            </div>

            {/* Stats Section - Below login card */}
            <div className="grid grid-cols-3  gap-8 mt-10 w-full max-w-md">
              <div className="text-center border border-base-content/20 px-2 py-4">
                <div className="text-sm font-semibold text-base-content">2000+</div>
                <div className="text-xs text-base-content/60">INTEGRATIONS</div>
              </div>
              <div className="text-center border border-base-content/20 px-2 py-4">
                <div className="text-sm font-semibold text-base-content">99.9%</div>
                <div className="text-xs text-base-content/60">UPTIME</div>
              </div>
              <div className="text-center border border-base-content/20 px-2 py-4">
                <div className="text-sm font-semibold text-base-content">24/7</div>
                <div className="text-xs text-base-content/60">SUPPORT</div>
              </div>
            </div>
            <p className="mt-6 text-center text-xs text-base-content/30 tracking-wide leading-relaxed">
              By continuing, you agree to gtwy&apos;s{" "}
              <a
                id="login-page-terms-link"
                href="https://gtwy.ai/terms/"
                target="_blank"
                rel="noreferrer"
                className="text-base-content/60 font-medium decoration-base-content/40 hover:text-base-content/80 transition-colors"
              >
                Terms of Service
              </a>
              <br />
              and acknowledge our{" "}
              <a
                id="login-page-privacy-link"
                href="https://gtwy.ai/privacy/"
                target="_blank"
                rel="noreferrer"
                className="text-base-content/60 font-medium decoration-base-content/40 hover:text-base-content/80 transition-colors"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
