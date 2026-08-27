import React from "react";
import withSize from "./SvgHoc";

const HuggingFaceIcon = ({ height, width }) => {
  return (
    <svg
      height={height}
      width={width}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flex: "none", lineHeight: 1 }}
    >
      <title>Hugging Face</title>
      <circle cx="12" cy="12" r="11" fill="#FFD21E" />
      <ellipse cx="8" cy="10.5" rx="1.1" ry="1.6" fill="#3A2219" />
      <ellipse cx="16" cy="10.5" rx="1.1" ry="1.6" fill="#3A2219" />
      <path
        d="M6.5 14c1 2 3 3 5.5 3s4.5-1 5.5-3"
        stroke="#3A2219"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M3.5 12.5c-.7-1.4-.4-2.6.5-3 .9-.4 1.9.3 2.3 1.4" fill="#FFAF1A" />
      <path d="M20.5 12.5c.7-1.4.4-2.6-.5-3-.9-.4-1.9.3-2.3 1.4" fill="#FFAF1A" />
    </svg>
  );
};

export default withSize(HuggingFaceIcon);
