"use client";

import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const LoginButton = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    // Store the current path to redirect back after login
    const redirectPath = pathname.startsWith("/publicAgent") ? "/publicAgent/login" : "/login";
    router.push(redirectPath);
  };

  return (
    <button
      id="login-button"
      onClick={handleLogin}
      disabled={isLoading}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors flex items-center"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting...
        </>
      ) : (
        "Login"
      )}
    </button>
  );
};

export default LoginButton;
