"use client";

import GoogleCalendarIntegration from "../../../components/GoogleCalendarIntegration";

export default function GoogleCalendarPage() {
  return (
    <div className="h-full p-6">
      <div className="max-w-6xl mx-auto h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Google Calendar</h1>
          <p className="text-gray-600">
            View and manage your Google Calendar events
          </p>
        </div>
        <div className="h-full overflow-auto">
          <GoogleCalendarIntegration />
        </div>
      </div>
    </div>
  );
}
