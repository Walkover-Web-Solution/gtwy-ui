"use client";
import Image from "next/image";
import React from "react";

const ShowcaseCard = ({ img, heading, text, url }) => {
  return (
    <div id="showcase-card-container" className="group w-full">
      <div className="card bg-base-100 w-full shadow-xl bg-transparent text-white border-[0.1px] border-gray-500 transition-all duration-300 hover:border-primary overflow-hidden">
        <div className="relative h-64 w-full">
          {img && (
            <Image
              src={img}
              alt={heading}
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-300 group-hover:scale-105"
            />
          )}
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="card-title text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              {heading}
            </h2>
            <Image
              id="showcase-card-arrow-icon"
              src="/RightArrow.svg"
              width={20}
              height={20}
              alt="Right icon"
              className="transition-transform duration-300 group-hover:translate-x-2 cursor-pointer"
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            />
          </div>
          <p className="text-lg text-gray-300 leading-relaxed">{text}</p>
          {url && (
            <div className="card-actions justify-end">
              <a
                id="showcase-card-visit-link"
                href={url}
                className="btn bg-primary text-white hover:bg-primary/90 border-none"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShowcaseCard;
