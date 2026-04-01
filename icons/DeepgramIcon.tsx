import React from "react";
import withSize from "./SvgHoc";

const DeepgramIcon = ({ width, height }) => {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="2" fill="#000000" />
      <path
        d="M6 6H11.7C15.18 6 18 8.82 18 12.3C18 15.78 15.18 18.6 11.7 18.6H6.2L9.2 15.6H11.5C13.27 15.6 14.7 14.17 14.7 12.4C14.7 10.63 13.27 9.2 11.5 9.2H10V11.4H6V6Z"
        fill="#FFFFFF"
      />
    </svg>
  );
};

export default withSize(DeepgramIcon);
