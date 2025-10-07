"use client";

import { useState } from "react";
import { GoogleDriveAccess, GoogleCalendarAccess, GoogleScopeRequest } from "./GoogleSignIn";
import { GOOGLE_SCOPES } from "@/lib/auth-client";

export function GoogleIntegrations() {
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSuccess = (service: string) => {
    setSuccessMessage(`${service} access granted successfully!`);
    setErrorMessage("");
    setTimeout(() => setSuccessMessage(""), 5000);
  };

  const handleError = (error: Error, service: string) => {
    setErrorMessage(`Failed to grant ${service} access: ${error.message}`);
    setSuccessMessage("");
    setTimeout(() => setErrorMessage(""), 5000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Google Integrations</h1>
        <p className="text-gray-600">
          Connect your Google services to enhance your workflow and productivity
        </p>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Google Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Google Drive */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.71 6.705L5.86 3.5h12.28l-1.85 3.205L12 10.5 7.71 6.705zM12 2L2 19h20L12 2zm0 3.5L18.14 19H5.86L12 5.5z"/>
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">Google Drive</h3>
              <p className="text-sm text-gray-500">Access and manage files</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Connect to Google Drive to upload, download, and manage files directly from your dashboard.
          </p>
          <GoogleDriveAccess
            onSuccess={() => handleSuccess("Google Drive")}
            onError={(error) => handleError(error, "Google Drive")}
            className="w-full"
          />
        </div>

        {/* Google Calendar */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">Google Calendar</h3>
              <p className="text-sm text-gray-500">Manage events and schedules</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Sync with Google Calendar to view and manage your events, meetings, and appointments.
          </p>
          <GoogleCalendarAccess
            onSuccess={() => handleSuccess("Google Calendar")}
            onError={(error) => handleError(error, "Google Calendar")}
            className="w-full"
          />
        </div>

        {/* Gmail */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h3.819L12 8.73l6.545-4.909h3.819c.904 0 1.636.732 1.636 1.636z"/>
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">Gmail</h3>
              <p className="text-sm text-gray-500">Read and manage emails</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Connect to Gmail to read emails, manage conversations, and integrate with your workflow.
          </p>
          <GoogleScopeRequest
            scopes={GOOGLE_SCOPES.GMAIL}
            onSuccess={() => handleSuccess("Gmail")}
            onError={(error) => handleError(error, "Gmail")}
            className="w-full"
          >
            Add Gmail Access
          </GoogleScopeRequest>
        </div>

        {/* Google Contacts */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">Google Contacts</h3>
              <p className="text-sm text-gray-500">Access contact information</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Sync with Google Contacts to access and manage your contact information.
          </p>
          <GoogleScopeRequest
            scopes={GOOGLE_SCOPES.CONTACTS}
            onSuccess={() => handleSuccess("Google Contacts")}
            onError={(error) => handleError(error, "Google Contacts")}
            className="w-full"
          >
            Add Contacts Access
          </GoogleScopeRequest>
        </div>

        {/* Custom Scopes */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">Custom Scopes</h3>
              <p className="text-sm text-gray-500">Request specific permissions</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Request access to specific Google APIs and services for custom integrations.
          </p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter scope URL (e.g., https://www.googleapis.com/auth/spreadsheets)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="w-full px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
              Request Custom Scope
            </button>
          </div>
        </div>

        {/* Integration Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900">Integration Status</h3>
              <p className="text-sm text-gray-500">View connected services</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Google Drive</span>
              <span className="text-green-600 font-medium">Connected</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Google Calendar</span>
              <span className="text-green-600 font-medium">Connected</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Gmail</span>
              <span className="text-gray-400">Not connected</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Google Contacts</span>
              <span className="text-gray-400">Not connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Documentation */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
        <p className="text-sm text-blue-800 mb-4">
          Learn more about Google integrations and how to set up your Google Cloud Console project.
        </p>
        <div className="flex space-x-4">
          <a
            href="/GOOGLE_SSO_SETUP.md"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Setup Guide
          </a>
          <a
            href="https://console.cloud.google.com/apis/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Google Cloud Console
          </a>
        </div>
      </div>
    </div>
  );
}
