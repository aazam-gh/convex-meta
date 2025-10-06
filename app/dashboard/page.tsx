"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Dashboard } from "../../components/Dashboard";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function DashboardPage() {

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      // Force a hard redirect to prevent any state issues
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      // Even if there's an error, redirect to home
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

      <Authenticated>
        <DashboardContent onSignOut={handleSignOut} />
      </Authenticated>
    </div>
  );
}

function UnauthenticatedContent() {
  const router = useRouter();

  useEffect(() => {
    // Add a small delay to ensure auth state has updated
    const timer = setTimeout(() => {
      router.replace("/signin");
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirecting to sign in...</p>
      </div>
    </div>
  );
}

function DashboardContent({ onSignOut }: { onSignOut: () => void }) {
  const currentUser = useQuery(api.auth.getCurrentUser);

  return (
    <>
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            Welcome, {currentUser?.name || currentUser?.email || 'User'}
          </span>
          <button
            onClick={onSignOut}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Sign Out
          </button>
        </div>
      </div>
      <Dashboard />
    </>
  );
}
