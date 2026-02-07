import React from "react";
import Image from "next/image";
import Link from "next/link";

const Showcaseheading = () => {
  return (
    <div id="showcase-heading-container" className="relative flex w-3/4 mx-auto py-20 ">
      <div className="w-full md:w-1/2 z-low">
        <div className="flex items-center mb-2">
          <Image src="/live.svg" alt="Live Logo" className="mr-2" width={54} height={34} />
        </div>

        <h1 className="text-4xl font-bold mb-4">Get Started Fast with Prompt Templates</h1>
        <p className="text-md">
          Prompt templates help you interact with AI effortlessly. Just pick a template, add your inputs, and get
          accurate results. They’re perfect for tasks like content creation, customer support, and data analysis, saving
          you time and effort.
        </p>
        <Link id="showcase-heading-login-link" href="/login">
          <button id="showcase-heading-start-button" role="button" className="btn btn-primary btn-sm mt-3">
            Start Building
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Showcaseheading;
