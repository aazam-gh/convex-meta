"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { GoogleCalendarBooking } from "./GoogleCalendarBooking";
import { GoogleCalendarEventsList } from "./GoogleCalendarEventsList";

interface GoogleCalendarExampleProps {
  leadId: Id<"leads">;
  customerId: Id<"customers">;
}

export function GoogleCalendarExample({ leadId, customerId }: GoogleCalendarExampleProps) {
  const [activeTab, setActiveTab] = useState<"book" | "list">("book");

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Google Calendar Integration</h1>
      
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab("book")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "book"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Schedule Meeting
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "list"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          View Events
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "book" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Schedule a New Meeting</h2>
          <GoogleCalendarBooking
            leadId={leadId}
            customerId={customerId}
            onBookingCreated={(eventId) => {
              console.log("Meeting created:", eventId);
              setActiveTab("list"); // Switch to events list after booking
            }}
          />
        </div>
      )}

      {activeTab === "list" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Calendar Events</h2>
          <GoogleCalendarEventsList
            leadId={leadId}
            customerId={customerId}
          />
        </div>
      )}

      {/* Integration Status */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Integration Status</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>✅ Google Calendar API integration active</p>
          <p>✅ Event creation and management enabled</p>
          <p>✅ Availability checking implemented</p>
          <p>✅ Real-time status updates supported</p>
        </div>
        <div className="mt-3 text-xs text-blue-600">
          <p>Make sure to set up your Google Calendar API credentials in the environment variables.</p>
        </div>
      </div>
    </div>
  );
}
