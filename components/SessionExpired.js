"use client";
import React from "react";
import { AlertTriangle } from "lucide-react";

const SessionExpired = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-base-100">
      <div className="max-w-md w-full">
        <div className="card bg-base-100">
          <div className="card-body text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-error/20 mb-4">
                <AlertTriangle className="h-8 w-8 text-error" />
              </div>
              <h2 className="card-title justify-center text-2xl mb-2">GTWY Session Expired</h2>
              <p className="text-base-content/70">Your session has expired.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionExpired;
