import React from "react";

const withSize = (Component, defaultHeight = "24px", defaultWidth = "24px") => {
  return ({ height = defaultHeight, width = defaultWidth, ...props }) => (
    <Component height={height} width={width} {...props} />
  );
};

export default withSize;
