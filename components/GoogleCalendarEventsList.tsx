"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface GoogleCalendarEventsListProps {
  leadId?: Id<"leads">;
  customerId?: Id<"customers">;
}

export function GoogleCalendarEventsList({ leadId, customerId }: GoogleCalendarEventsListProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  const events = useQuery(api.googleCalendar.listGoogleCalendarEvents, {
    leadId,
    customerId,
    status: filterStatus === "all" ? undefined : filterStatus,
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(endDate).toISOString(),
  });

  const updateEventStatus = useMutation(api.googleCalendar.updateGoogleCalendarEvent);
  const cancelEvent = useMutation(api.googleCalendar.deleteGoogleCalendarEvent);

  const handleStatusChange = async (eventId: Id<"googleCalendarEvents">, newStatus: string) => {
    try {
      await updateEventStatus({
        eventId,
        status: newStatus,
      });
    } catch (error) {
      console.error("Failed to update event status:", error);
      alert("Failed to update event status. Please try again.");
    }
  };

  const handleCancelEvent = async (eventId: Id<"googleCalendarEvents">, googleEventId: string) => {
    if (confirm("Are you sure you want to cancel this event?")) {
      try {
        await cancelEvent({
          googleEventId,
          reason: "Cancelled by agent",
        });
      } catch (error) {
        console.error("Failed to cancel event:", error);
        alert("Failed to cancel event. Please try again.");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "no_show": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (!events) {
    return <div className="p-4">Loading events...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Google Calendar Events</h2>
        <div className="flex space-x-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6 flex space-x-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No events found for the selected period
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const { date, time } = formatDateTime(event.startTime);
            const endTime = formatDateTime(event.endTime).time;

            return (
              <div key={event._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                    {event.description && (
                      <p className="text-gray-600 mt-1">{event.description}</p>
                    )}
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Date & Time:</span>
                        <span className="ml-2 text-gray-600">{date} at {time} - {endTime}</span>
                      </div>
                      
                      {event.location && (
                        <div>
                          <span className="font-medium text-gray-700">Location:</span>
                          <span className="ml-2 text-gray-600">{event.location}</span>
                        </div>
                      )}
                      
                      {event.meetingLink && (
                        <div>
                          <span className="font-medium text-gray-700">Meeting Link:</span>
                          <a
                            href={event.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:text-blue-800 underline"
                          >
                            Join Meeting
                          </a>
                        </div>
                      )}
                      
                      <div>
                        <span className="font-medium text-gray-700">Created:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(event.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(event.status)}`}>
                      {event.status.toUpperCase()}
                    </span>

                    {event.status === "scheduled" && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStatusChange(event._id, "confirmed")}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleCancelEvent(event._id, event.googleEventId)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {event.status === "confirmed" && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStatusChange(event._id, "completed")}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Mark Complete
                        </button>
                        <button
                          onClick={() => handleStatusChange(event._id, "no_show")}
                          className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                        >
                          No Show
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
