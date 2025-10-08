// app/page.tsx - Clean UI Component

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function HomePage() {

  return (
    <div className="min-h-screen bg-gray-50">
      <Authenticated>
        <AuthenticatedContent onRedirect={() => {}} />
      </Authenticated>

      <Unauthenticated>
        <UnauthenticatedContent />
      </Unauthenticated>

      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </AuthLoading>
    </div>
  );
}

function AuthenticatedContent({ onRedirect }: { onRedirect: () => void }) {
  const router = useRouter();
  const currentUser = useQuery(api.auth.getCurrentUser);

  useEffect(() => {
    // Only redirect if we have confirmed user data
    // This prevents redirect loops during sign out
    if (currentUser) {
      onRedirect();
      router.replace("/dashboard");
    }
  }, [currentUser, router, onRedirect]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}

function UnauthenticatedContent() {
  return (
    <>
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <h1 className="text-xl font-semibold">Welcome to Omnichannel Communication Dashboard</h1>
        <div className="flex space-x-4">
          <Link
            href="/signin"
            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign Up
          </Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Get Started with Authentication
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Sign in or create an account to access the dashboard and start managing your communications.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/signin"
                className="px-6 py-3 text-base font-medium text-indigo-600 bg-white border border-indigo-600 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-6 py-3 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}