"use client";

import { signInWithGoogle, requestGoogleScopes, GOOGLE_SCOPES } from "@/lib/auth-client";
import { useState } from "react";

interface GoogleSignInProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  children?: React.ReactNode;
}

export function GoogleSignIn({ 
  onSuccess, 
  onError, 
  className = "",
  children 
}: GoogleSignInProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      onSuccess?.();
    } catch (error) {
      console.error("Google sign-in failed:", error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className={`flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {children || (isLoading ? "Signing in..." : "Sign in with Google")}
    </button>
  );
}

interface GoogleScopeRequestProps {
  scopes: string[];
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  children?: React.ReactNode;
}

export function GoogleScopeRequest({ 
  scopes, 
  onSuccess, 
  onError, 
  className = "",
  children 
}: GoogleScopeRequestProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestScopes = async () => {
    try {
      setIsLoading(true);
      await requestGoogleScopes(scopes);
      onSuccess?.();
    } catch (error) {
      console.error("Google scope request failed:", error);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleRequestScopes}
      disabled={isLoading}
      className={`flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children || (isLoading ? "Requesting access..." : "Request Google Access")}
    </button>
  );
}

// Pre-configured scope request components
export function GoogleDriveAccess({ onSuccess, onError, className }: Omit<GoogleScopeRequestProps, 'scopes'>) {
  return (
    <GoogleScopeRequest
      scopes={GOOGLE_SCOPES.DRIVE}
      onSuccess={onSuccess}
      onError={onError}
      className={className}
    >
      Add Google Drive Access
    </GoogleScopeRequest>
  );
}

export function GoogleCalendarAccess({ onSuccess, onError, className }: Omit<GoogleScopeRequestProps, 'scopes'>) {
  return (
    <GoogleScopeRequest
      scopes={GOOGLE_SCOPES.CALENDAR}
      onSuccess={onSuccess}
      onError={onError}
      className={className}
    >
      Add Google Calendar Access
    </GoogleScopeRequest>
  );
}
