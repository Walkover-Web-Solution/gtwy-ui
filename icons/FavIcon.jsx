import React from "react";
import withSize from "./SvgHoc";

const GTWYIcon = ({ height = 32, width = 32 }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 280 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="fill-current"
    >
      {/* Semi-circular arc at top */}
      <path
        d="M 64 100 A 76 76 0 0 1 216 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="28"
        strokeLinecap="round"
      />

      {/* Letter G */}
      <path
        d="M 85 185 C 67 185 53 171 53 153 C 53 135 67 121 85 121 C 98 121 109 128 114 138 L 103 143 C 100 137 93 129 85 129 C 72 129 62 139 62 153 C 62 167 72 177 85 177 C 93 177 100 172 103 168 L 103 158 L 88 158 L 88 150 L 112 150 L 112 173 C 106 180 97 185 85 185 Z"
        fill="currentColor"
      />

      {/* Letter T */}
      <path d="M 123 123 L 123 131 L 138 131 L 138 183 L 148 183 L 148 131 L 163 131 L 163 123 Z" fill="currentColor" />

      {/* Letter W */}
      <path
        d="M 172 123 L 180 183 L 189 183 L 198 142 L 207 183 L 216 183 L 224 123 L 215 123 L 210 174 L 201 123 L 195 123 L 186 174 L 181 123 Z"
        fill="currentColor"
      />

      {/* Letter Y */}
      <path
        d="M 232 123 L 240 151 L 248 123 L 258 123 L 245 160 L 245 183 L 235 183 L 235 160 L 222 123 Z"
        fill="currentColor"
      />
    </svg>
  );
};

export default withSize(GTWYIcon);
