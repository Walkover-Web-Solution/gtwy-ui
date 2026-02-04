import React from "react";

const NavbarSkeleton = () => {
  return (
    <div className="bg-base-100 border-b border-base-200 animate-pulse">
      {/* Main navigation header */}
      <div className="flex w-full items-center justify-between px-4 lg:px-6 h-10">
        {/* Left: Agent Name and Versions */}
        <div className="flex items-center gap-3 lg:gap-5 min-w-0 flex-1">
          {/* Agent Name Skeleton */}
          <div className="hidden sm:flex items-center ml-2 lg:ml-0 min-w-0 flex-1">
            <div className="h-5 bg-base-300 rounded w-32"></div>

            {/* Divider */}
            <div className="mx-2 h-4 w-px bg-base-300 flex-shrink-0"></div>

            {/* Published Button + Version Dropdown Skeleton */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Published Button Skeleton */}
              <div className="h-6 bg-base-200 rounded w-16"></div>

              {/* Version Dropdown Skeleton */}
              <div className="hidden sm:flex gap-1">
                <div className="h-6 bg-base-200 rounded w-8"></div>
                <div className="h-6 bg-base-200 rounded w-8"></div>
                <div className="h-6 bg-base-200 rounded w-12"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-4 lg:gap-6 flex-shrink-0">
          {/* Navigation Tabs Skeleton */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="flex items-center gap-1">
              <div className="h-8 bg-primary/20 rounded-lg w-24"></div>
              <div className="h-8 bg-base-200 rounded-lg w-20"></div>
              <div className="h-8 bg-base-200 rounded-lg w-16"></div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-base-300 flex-shrink-0"></div>

          {/* Action buttons skeleton */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {/* History button skeleton */}
            <div className="w-8 h-8 bg-base-200 rounded"></div>

            {/* Publish button skeleton */}
            <div className="h-8 bg-success/20 rounded w-32"></div>

            {/* Ellipsis menu skeleton */}
            <div className="w-8 h-8 bg-base-200 rounded"></div>
          </div>
        </div>
      </div>

      {/* Mobile Version Dropdown Skeleton */}
      <div className="sm:hidden bg-base-100 border-b border-base-200 px-2 py-2">
        <div className="flex items-center justify-between gap-2">
          {/* Agent Name Skeleton */}
          <div className="h-4 bg-base-300 rounded w-24"></div>

          {/* Published Button and Version Dropdown Skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-6 bg-base-200 rounded w-12"></div>
            <div className="flex gap-1">
              <div className="h-6 bg-base-200 rounded w-6"></div>
              <div className="h-6 bg-base-200 rounded w-6"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile action buttons skeleton */}
      <div className="md:hidden p-2">
        <div className="flex gap-2">
          <div className="w-8 h-6 bg-base-200 rounded"></div>
          <div className="flex-1 h-6 bg-success/20 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default NavbarSkeleton;
