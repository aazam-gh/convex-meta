"use client";

import { signInWithFacebook } from "@/lib/auth-client";
import { useState } from "react";

interface FacebookSignInProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  children?: React.ReactNode;
}

export function FacebookSignIn({ 
  onSuccess, 
  onError, 
  className = "",
  children 
}: FacebookSignInProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFacebookSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithFacebook();
      onSuccess?.();
    } catch (error) {
      console.error("Facebook sign-in failed:", error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleFacebookSignIn}
      disabled={isLoading}
      className={`flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
      {children || (isLoading ? "Signing in..." : "Sign in with Facebook")}
    </button>
  );
}
