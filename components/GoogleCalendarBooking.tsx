"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface GoogleCalendarBookingProps {
  leadId: Id<"leads">;
  customerId: Id<"customers">;
  onBookingCreated?: (eventId: string) => void;
}

export function GoogleCalendarBooking({ leadId, customerId, onBookingCreated }: GoogleCalendarBookingProps) {
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [duration, setDuration] = useState(60); // Default 60 minutes
  const [isLoading, setIsLoading] = useState(false);

  // Get existing booking if any
  const existingBooking = useQuery(api.googleCalendar.getGoogleCalendarEventByLead, { leadId });
  
  // Get availability for selected date
  const availability = useQuery(
    api.googleCalendar.getGoogleCalendarAvailability,
    selectedDate
      ? {
          startDate: new Date(selectedDate).toISOString(),
          endDate: new Date(new Date(selectedDate).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          duration,
        }
      : "skip"
  );

  const createBooking = useMutation(api.googleCalendar.createGoogleCalendarEvent);

  const handleCreateBooking = async () => {
    if (!selectedDate || !selectedTime || !meetingTitle) {
      alert("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const startTime = new Date(`${selectedDate}T${selectedTime}`).toISOString();
      const endTime = new Date(new Date(startTime).getTime() + duration * 60 * 1000).toISOString();

      const result = await createBooking({
        leadId,
        customerId,
        title: meetingTitle,
        description: meetingDescription,
        startTime,
        endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        customerEmail: "customer@example.com", // This should come from customer data
        customerName: "Customer", // This should come from customer data
        location: meetingLocation,
      });

      if (result.success) {
        setShowBookingForm(false);
        onBookingCreated?.(result.eventId || "");
        alert("Meeting scheduled successfully!");
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Failed to create booking");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (existingBooking?.googleEventId) {
      // Implement cancel booking logic
      console.log("Cancel booking:", existingBooking.googleEventId);
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (existingBooking) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-800 mb-2">Meeting Scheduled</h3>
        <div className="space-y-2">
          <p className="text-green-700">
            <strong>Status:</strong> {existingBooking.status}
          </p>
          <p className="text-green-700">
            <strong>Title:</strong> {existingBooking.title}
          </p>
          <p className="text-green-700">
            <strong>Date:</strong> {new Date(existingBooking.startTime).toLocaleDateString()}
          </p>
          <p className="text-green-700">
            <strong>Time:</strong> {new Date(existingBooking.startTime).toLocaleTimeString()}
          </p>
          {existingBooking.location && (
            <p className="text-green-700">
              <strong>Location:</strong> {existingBooking.location}
            </p>
          )}
          {existingBooking.meetingLink && (
            <p className="text-green-700">
              <strong>Meeting Link:</strong>{" "}
              <a
                href={existingBooking.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Join Meeting
              </a>
            </p>
          )}
        </div>
        <button
          onClick={handleCancelBooking}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Cancel Meeting
        </button>
      </div>
    );
  }

  if (!showBookingForm) {
    return (
      <button
        onClick={() => setShowBookingForm(true)}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Schedule Meeting
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Schedule a Meeting</h3>
      
      <div className="space-y-4">
        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Duration Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (minutes)
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
            <option value={120}>120 minutes</option>
          </select>
        </div>

        {/* Time Selection */}
        {selectedDate && availability && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Times
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availability
                .filter((slot) => slot.available)
                .map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedTime(slot.start)}
                    className={`px-3 py-2 text-sm rounded ${
                      selectedTime === slot.start
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {formatTime(slot.start)}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Meeting Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Title *
          </label>
          <input
            type="text"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="e.g., Sales Consultation"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Meeting Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={meetingDescription}
            onChange={(e) => setMeetingDescription(e.target.value)}
            placeholder="Brief description of the meeting..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Meeting Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location (Optional)
          </label>
          <input
            type="text"
            value={meetingLocation}
            onChange={(e) => setMeetingLocation(e.target.value)}
            placeholder="e.g., Conference Room A, or Zoom link"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            onClick={handleCreateBooking}
            disabled={isLoading || !selectedDate || !selectedTime || !meetingTitle}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Scheduling..." : "Schedule Meeting"}
          </button>
          <button
            onClick={() => setShowBookingForm(false)}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
