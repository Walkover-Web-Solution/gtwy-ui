import React from "react";

const GiftIcon = ({ size = 15, className = "", ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={`${className} gift-icon-animated`}
      {...props}
      style={{
        animation: "giftBounce 2s ease-in-out infinite",
        transformOrigin: "center",
        ...props.style,
      }}
    >
      <style jsx>{`
        @keyframes giftBounce {
          0%,
          20%,
          50%,
          80%,
          100% {
            transform: translateY(0) scale(1);
          }
          10% {
            transform: translateY(-2px) scale(1.05);
          }
          30% {
            transform: translateY(-1px) scale(1.02);
          }
          60% {
            transform: translateY(-1px) scale(1.02);
          }
        }

        @keyframes ribbonShine {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes bowWiggle {
          0%,
          100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-2deg);
          }
          75% {
            transform: rotate(2deg);
          }
        }
      `}</style>
      {/* Gift box base */}
      <rect x="3" y="12" width="18" height="9" rx="1" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />

      {/* Gift box lid */}
      <rect x="3" y="8" width="18" height="4" rx="1" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />

      {/* Vertical ribbon */}
      <rect
        x="11"
        y="8"
        width="2"
        height="13"
        fill="rgb(245,144,61)"
        style={{
          animation: "ribbonShine 3s ease-in-out infinite",
        }}
      />

      {/* Horizontal ribbon */}
      <rect
        x="3"
        y="11"
        width="18"
        height="2"
        fill="rgb(245,144,61)"
        style={{
          animation: "ribbonShine 3s ease-in-out infinite 0.5s",
        }}
      />

      {/* Bow - left loop */}
      <path
        d="M8 8 C6 6, 6 4, 8 4 C10 4, 10 6, 8 8"
        fill="rgb(245,144,61)"
        stroke="rgb(245,144,61)"
        strokeWidth="1"
        style={{
          transformOrigin: "8px 6px",
          animation: "bowWiggle 4s ease-in-out infinite",
        }}
      />

      {/* Bow - right loop */}
      <path
        d="M16 8 C18 6, 18 4, 16 4 C14 4, 14 6, 16 8"
        fill="rgb(245,144,61)"
        stroke="rgb(245,144,61)"
        strokeWidth="1"
        style={{
          transformOrigin: "16px 6px",
          animation: "bowWiggle 4s ease-in-out infinite 0.2s",
        }}
      />

      {/* Bow center knot */}
      <circle
        cx="12"
        cy="6"
        r="1.5"
        fill="rgb(245,144,61)"
        style={{
          transformOrigin: "12px 6px",
          animation: "bowWiggle 4s ease-in-out infinite 0.1s",
        }}
      />
    </svg>
  );
};

export default GiftIcon;
