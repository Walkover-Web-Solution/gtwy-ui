import React from "react";

function LoadingSpinner({
  height = "100vh",
  width = "100vw",
  marginLeft = "0px",
  marginTop = "0px",
  margin = "auto",
  inline = false,
  size = 88,
  className = "",
}) {
  return (
    <div
      data-testid="loading-spinner"
      className={`${inline ? "flex items-center justify-center" : "fixed inset-0 bg-base-100 flex flex-col justify-center items-center z-very-high"} ${className}`}
      style={{ height, width, margin, marginLeft, marginTop }}
    >
      <svg
        viewBox="0 0 220 220"
        aria-label="GTWY loading animation"
        className="overflow-visible text-base-content"
        style={{ width: size, height: size }}
      >
        <path
          d="M50 78 A60 60 0 0 1 170 78"
          className="fill-none stroke-current"
          strokeWidth="10"
          strokeLinecap="butt"
          strokeDasharray="220"
          strokeDashoffset="220"
        >
          <animate attributeName="stroke-dashoffset" values="220;0;-220" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.2;1;0.2" dur="2s" repeatCount="indefinite" />
        </path>

        <text x="110" y="122" textAnchor="middle" className="fill-current text-[42px] font-extrabold tracking-[0]">
          <tspan>
            G
            <animate
              attributeName="opacity"
              values="0;0;1;1;0;0"
              keyTimes="0;0.1;0.25;0.75;0.9;1"
              dur="2s"
              begin="0s"
              repeatCount="indefinite"
            />
          </tspan>
          <tspan>
            T
            <animate
              attributeName="opacity"
              values="0;0;1;1;0;0"
              keyTimes="0;0.1;0.25;0.75;0.9;1"
              dur="2s"
              begin="0.15s"
              repeatCount="indefinite"
            />
          </tspan>
          <tspan>
            W
            <animate
              attributeName="opacity"
              values="0;0;1;1;0;0"
              keyTimes="0;0.1;0.25;0.75;0.9;1"
              dur="2s"
              begin="0.3s"
              repeatCount="indefinite"
            />
          </tspan>
          <tspan>
            Y
            <animate
              attributeName="opacity"
              values="0;0;1;1;0;0"
              keyTimes="0;0.1;0.25;0.75;0.9;1"
              dur="2s"
              begin="0.45s"
              repeatCount="indefinite"
            />
          </tspan>
        </text>
      </svg>
    </div>
  );
}
export default LoadingSpinner;
