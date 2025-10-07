"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface AppointmentListProps {
  leadId?: Id<"leads">;
  customerId?: Id<"customers">;
}

export function AppointmentList({ leadId, customerId }: AppointmentListProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const appointments = useQuery(api.calendar.listAppointments, {
    leadId,
    customerId,
    status: filterStatus === "all" ? undefined : filterStatus,
  });

  const updateAppointmentStatus = useMutation(api.calendar.updateAppointmentStatus);
  const cancelAppointment = useMutation(api.calendar.cancelAppointment);

  const handleStatusChange = async (appointmentId: Id<"appointments">, newStatus: string) => {
    try {
      await updateAppointmentStatus({
        appointmentId,
        status: newStatus,
      });
    } catch (error) {
      console.error("Failed to update appointment status:", error);
      alert("Failed to update appointment status. Please try again.");
    }
  };

  const handleCancelAppointment = async (appointmentId: Id<"appointments">) => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      try {
        await cancelAppointment({
          appointmentId,
          reason: "Cancelled by agent",
        });
      } catch (error) {
        console.error("Failed to cancel appointment:", error);
        alert("Failed to cancel appointment. Please try again.");
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

  if (!appointments) {
    return <div className="p-4">Loading appointments...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
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

      {appointments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No appointments found
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const { date, time } = formatDateTime(appointment.startTime);
            const endTime = formatDateTime(appointment.endTime).time;

            return (
              <div key={appointment._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{appointment.title}</h3>
                    {appointment.description && (
                      <p className="text-gray-600 mt-1">{appointment.description}</p>
                    )}
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Date & Time:</span>
                        <span className="ml-2 text-gray-600">{date} at {time} - {endTime}</span>
                      </div>
                      
                      {appointment.location && (
                        <div>
                          <span className="font-medium text-gray-700">Location:</span>
                          <span className="ml-2 text-gray-600">{appointment.location}</span>
                        </div>
                      )}
                      
                      {appointment.meetingLink && (
                        <div>
                          <span className="font-medium text-gray-700">Meeting Link:</span>
                          <a
                            href={appointment.meetingLink}
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
                          {new Date(appointment.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status.toUpperCase()}
                    </span>

                    {appointment.status === "scheduled" && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStatusChange(appointment._id, "confirmed")}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleCancelAppointment(appointment._id)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {appointment.status === "confirmed" && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStatusChange(appointment._id, "completed")}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Mark Complete
                        </button>
                        <button
                          onClick={() => handleStatusChange(appointment._id, "no_show")}
                          className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                        >
                          No Show
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {appointment.reminderSent && (
                  <div className="mt-2 text-xs text-green-600">
                    ✓ Reminder sent
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
