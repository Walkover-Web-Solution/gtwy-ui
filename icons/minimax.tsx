import React from "react";
import withSize from "./SvgHoc";

const MinimaxIcon = ({ height, width }) => {
  return (
    <svg width={width} height={height} viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wave" x1="0" y1="0" x2="1024" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#e6197f" />
          <stop offset="0.5" stop-color="#ee2f6a" />
          <stop offset="1" stop-color="#f4562f" />
        </linearGradient>
      </defs>
      <path
        d="M60,490 V610 H175 V360 H290 V800 H405 V130 H520 V870 H635 V130 H750 V760 H865 V330 H955 V600"
        fill="none"
        stroke="url(#wave)"
        stroke-width="84"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};

export default withSize(MinimaxIcon);
