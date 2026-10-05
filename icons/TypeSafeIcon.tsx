import React from "react";
import withSize from "./SvgHoc";

// TypeSafe (Jev) mark, traced from the favicon on typesafe.ai.
const TypeSafeIcon = ({ width, height }) => {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#E551BA" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="#171717"
        d="M11.94 3L15.36 5.16L15.36 8.28L18.18 10.08L18.18 16.98L12.06 21L8.64 18.84L8.64 15.6L5.82 13.8L5.82 7.02ZM11.4 4.8L6.96 7.62L6.96 12.36L8.64 11.34L8.64 8.28L11.4 6.54ZM12.66 4.8L12.6 6.54L14.22 7.5L14.22 5.82ZM12 7.5L10.26 8.58L11.88 9.72L13.74 8.64ZM9.84 9.72L9.78 11.4L11.4 12.42L11.4 10.68ZM14.16 9.72L12.6 10.74L12.6 13.8L9.78 15.6L9.78 17.4L14.22 14.58ZM15.42 9.72L15.36 14.52L17.04 15.6L17.04 10.74ZM9.18 12.36L7.5 13.56L9.3 14.58L10.92 13.44ZM14.82 15.54L10.32 18.54L12.06 19.62L16.32 16.86L16.44 16.56Z"
      />
    </svg>
  );
};

export default withSize(TypeSafeIcon);
