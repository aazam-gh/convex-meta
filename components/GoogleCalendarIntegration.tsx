"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { authClient } from '../lib/auth-client';
import GoogleCalendarView from './GoogleCalendarView';

export default function GoogleCalendarIntegration() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Get current user and calendar scope status
  const user = useQuery(api.auth.getCurrentUser);
  const hasCalendarScope = useQuery(api.auth.hasGoogleCalendarScope);
  const googleAccessToken = useQuery(api.auth.getGoogleAccessToken);
  const debugAccount = useQuery(api.auth.debugUserAccount);
  const debugAll = useQuery(api.auth.debugAllUsersAndAccounts);
  const testDb = useQuery(api.auth.testDatabaseConnection);
  const testWrite = useMutation(api.auth.testDatabaseWrite);

  useEffect(() => {
    const checkCalendarAccess = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      console.log("Checking calendar access:", { hasCalendarScope, googleAccessToken: !!googleAccessToken });
      console.log("Debug account data:", debugAccount);
      console.log("Debug all users and accounts:", debugAll);
      console.log("Database connection test:", testDb);

      // Check if user has calendar scope
      if (hasCalendarScope && googleAccessToken) {
        console.log("User has calendar scope and access token");
        setAccessToken(googleAccessToken);
        setIsAuthorized(true);
        setLoading(false);
        return;
      }

      // If no calendar scope, try to get access token anyway (for initial setup)
      try {
        const result = await authClient.getAccessToken({
          providerId: "google"
        });
        const accessToken = result && 'accessToken' in result && typeof result.accessToken === 'string' ? result.accessToken : null;

        if (accessToken) {
          console.log("Got access token from authClient");
          setAccessToken(accessToken);
          setIsAuthorized(true);
        } else {
          console.log("No access token available");
        }
      } catch (error) {
        console.log("No Google access token available or calendar scope not granted:", error);
      } finally {
        setLoading(false);
      }
    };

    checkCalendarAccess();
  }, [user, hasCalendarScope, googleAccessToken]);

  const handleRequestCalendarAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use Better Auth's linkSocial to request additional calendar scope
      await authClient.linkSocial({
        provider: "google",
        scopes: ["https://www.googleapis.com/auth/calendar"]
      });

      // After successful linking, refresh the page to ensure proper state update
      // This ensures the Convex queries are re-run with the new permissions
      window.location.reload();
    } catch (err) {
      console.error('Error requesting calendar access:', err);
      setError(err instanceof Error ? err.message : 'Failed to request calendar access');
      setLoading(false);
    }
  };

  const handleRefreshPermissions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Force refresh the Convex queries
      window.location.reload();
    } catch (err) {
      console.error('Error refreshing permissions:', err);
      setError('Failed to refresh permissions');
      setLoading(false);
    }
  };

  const handleTestDatabaseWrite = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Testing database write...");
      const result = await testWrite();
      console.log("Database write test result:", result);
      
      if (result.success) {
        alert(`Database write test successful! Inserted and retrieved record: ${JSON.stringify(result.testRecord)}`);
      } else {
        alert(`Database write test failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Error testing database write:', err);
      alert(`Database write test error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading calendar...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Google Calendar</h2>
        <p className="text-gray-500">Please sign in to view your calendar events.</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Google Calendar</h2>
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            {user ? 
              "You're signed in with Google! Click the button below to add calendar permissions and view your real calendar events." :
              "Please sign in with Google to view your calendar events."
            }
          </p>
          {user && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <p className="text-blue-800 text-sm">
                <strong>Better Auth Integration:</strong> This will request additional calendar permissions using your existing Google account. 
                Better Auth will handle the OAuth flow and token management automatically.
              </p>
            </div>
          )}
          {debugAccount && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
              <p className="text-gray-800 text-sm">
                <strong>Debug Info:</strong> 
                <br />• Has Calendar Scope: {hasCalendarScope ? 'Yes' : 'No'}
                <br />• Has Access Token: {googleAccessToken ? 'Yes' : 'No'}
                <br />• Google Accounts: {debugAccount.accounts?.filter(acc => acc.providerId === 'google').length || 0}
                {debugAccount.accounts?.filter(acc => acc.providerId === 'google').map(acc => (
                  <span key={acc._id}>
                    <br />• Scope: {acc.scope || 'None'}
                    <br />• Parsed Scopes: {acc.scopeArray?.join(', ') || 'None'}
                  </span>
                ))}
              </p>
            </div>
          )}
          {testDb && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-800 text-sm">
                <strong>Database Connection Test:</strong>
                <br />• Success: {testDb.success ? 'Yes' : 'No'}
                <br />• User Count: {testDb.userCount || 0}
                <br />• Account Count: {testDb.accountCount || 0}
                <br />• Session Count: {testDb.sessionCount || 0}
                {testDb.firstAccount && (
                  <span>
                    <br />• First Account: {testDb.firstAccount.providerId} - {testDb.firstAccount.scope || 'No scope'}
                  </span>
                )}
                {testDb.error && (
                  <span>
                    <br />• Error: {testDb.error}
                  </span>
                )}
              </p>
            </div>
          )}
          {debugAll && !('error' in debugAll) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                <strong>All Users & Accounts Debug:</strong>
                <br />• Current User ID: {debugAll.currentUser?._id || 'None'}
                <br />• Current User Email: {debugAll.currentUser?.email || 'None'}
                <br />• Current User Accounts: {debugAll.currentUserAccounts?.length || 0}
                <br />• Total Users: {debugAll.allUsers?.length || 0}
                <br />• Total Accounts: {debugAll.allAccounts?.length || 0}
                <br />• Google Accounts: {debugAll.allAccounts?.filter((acc: any) => acc.providerId === 'google').length || 0}
                {debugAll.currentUserAccounts?.map((acc: any) => (
                  <span key={acc._id}>
                    <br />• Current User Account: {acc.providerId} - {acc.scope || 'No scope'} - Token: {acc.hasAccessToken ? 'Yes' : 'No'}
                  </span>
                ))}
                {debugAll.allUsers?.map((user: any) => (
                  <span key={user._id}>
                    <br />• User: {user.email} (ID: {user._id})
                  </span>
                ))}
                {debugAll.allAccounts?.filter((acc: any) => acc.providerId === 'google').map((acc: any) => (
                  <span key={acc._id}>
                    <br />• Google Account: User {acc.userId} - {acc.scope || 'No scope'}
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        {user && (
          <div className="flex space-x-3">
            <button
              onClick={handleRequestCalendarAccess}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Requesting Access...' : 'Add Calendar Permissions'}
            </button>
            <button
              onClick={handleRefreshPermissions}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handleTestDatabaseWrite}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test DB Write'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return <GoogleCalendarView accessToken={accessToken || undefined} />;
}
