import React from "react";

const Autoscroll = ({ items }) => {
  return (
    <div data-testid="autoscroll-container" id="autoscroll-container" className="grid grid-cols-4 gap-4 p-4">
      {items.map((item, index) => (
        <div
          data-testid={`autoscroll-item-${index}`}
          id={`autoscroll-item-${index}`}
          key={index}
          className="flex flex-col items-center p-4 text-white rounded-md hover:scale-110 transition-all ease-in-out duration-300"
        >
          <item.icon className="w-10 h-10 mb-2" />
          <span className="text-xl font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default Autoscroll;
