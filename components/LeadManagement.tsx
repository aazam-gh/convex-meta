"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface LeadManagementProps {
  conversationId: Id<"conversations">;
}

export function LeadManagement({ conversationId }: LeadManagementProps) {
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDescription, setMeetingDescription] = useState("");

  const lead = useQuery(api.leads.getLeadByConversation, { conversationId });
  const agentState = useQuery(api.leads.getAgentState, { conversationId });
  const availableSlots = useQuery(api.calendar.getAvailableTimeSlots, {
    date: selectedDate,
    duration: 60,
  });

  const createAppointment = useMutation(api.calendar.createAppointment);
  const updateLeadScore = useMutation(api.leads.updateLeadScore);

  const handleScheduleMeeting = async () => {
    if (!lead || !selectedDate || !selectedTime || !meetingTitle) return;

    const startTime = new Date(`${selectedDate}T${selectedTime}`).getTime();
    const endTime = startTime + (60 * 60 * 1000); // 1 hour

    try {
      await createAppointment({
        leadId: lead._id,
        customerId: lead.customerId,
        title: meetingTitle,
        description: meetingDescription,
        startTime,
        endTime,
      });

      // Update lead status to qualified
      await updateLeadScore({
        leadId: lead._id,
        newScore: Math.max(lead.leadScore, 80),
      });

      setShowBookingForm(false);
      alert("Meeting scheduled successfully!");
    } catch (error) {
      console.error("Failed to schedule meeting:", error);
      alert("Failed to schedule meeting. Please try again.");
    }
  };

  if (!lead || !agentState) {
    return <div className="p-4">Loading lead information...</div>;
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "greeting": return "bg-blue-100 text-blue-800";
      case "qualification": return "bg-yellow-100 text-yellow-800";
      case "objection_handling": return "bg-orange-100 text-orange-800";
      case "closing": return "bg-purple-100 text-purple-800";
      case "booking": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Management</h2>
          <p className="text-gray-600">Conversation ID: {conversationId}</p>
        </div>
        <div className="text-right">
          <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getPhaseColor(agentState.currentPhase)}`}>
            {agentState.currentPhase.replace("_", " ").toUpperCase()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lead Score and Status */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lead Score</h3>
            <div className="flex items-center space-x-4">
              <div className={`text-3xl font-bold ${getScoreColor(lead.leadScore)}`}>
                {lead.leadScore}
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${lead.leadScore}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {lead.leadScore >= 80 ? "Qualified Lead" : 
                   lead.leadScore >= 50 ? "Warm Lead" : "Cold Lead"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              lead.status === "qualified" ? "bg-green-100 text-green-800" :
              lead.status === "nurturing" ? "bg-yellow-100 text-yellow-800" :
              lead.status === "converted" ? "bg-blue-100 text-blue-800" :
              "bg-gray-100 text-gray-800"
            }`}>
              {lead.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Qualification Data */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Qualification Data</h3>
          
          {lead.qualificationData.painPoints.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700">Pain Points</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {lead.qualificationData.painPoints.map((pain, index) => (
                  <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                    {pain}
                  </span>
                ))}
              </div>
            </div>
          )}

          {lead.qualificationData.interests.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700">Interests</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {lead.qualificationData.interests.map((interest, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Budget:</span>
              <span className="ml-2 text-gray-600">
                {lead.qualificationData.budget || "Not mentioned"}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Timeline:</span>
              <span className="ml-2 text-gray-600">
                {lead.qualificationData.timeline || "Not mentioned"}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Decision Maker:</span>
              <span className="ml-2 text-gray-600">
                {lead.qualificationData.decisionMaker === true ? "Yes" :
                 lead.qualificationData.decisionMaker === false ? "No" : "Unknown"}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Company Size:</span>
              <span className="ml-2 text-gray-600">
                {lead.qualificationData.companySize || "Not mentioned"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Context */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Agent Context</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Qualification Progress:</span>
            <div className="mt-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${agentState.contextData.qualificationProgress}%` }}
                ></div>
              </div>
              <span className="text-gray-600">{agentState.contextData.qualificationProgress}%</span>
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Personality:</span>
            <span className="ml-2 text-gray-600 capitalize">{agentState.agentPersonality}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Last Updated:</span>
            <span className="ml-2 text-gray-600">
              {new Date(agentState.lastUpdated).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Schedule Meeting Button */}
      {lead.leadScore >= 50 && (
        <div className="mt-6">
          <button
            onClick={() => setShowBookingForm(true)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Schedule Meeting
          </button>
        </div>
      )}

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Meeting</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Product Demo Call"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional meeting description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {selectedDate && availableSlots && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a time</option>
                    {availableSlots
                      .filter(slot => slot.available)
                      .map((slot, index) => (
                        <option key={index} value={new Date(slot.startTime).toTimeString().slice(0, 5)}>
                          {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                          {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowBookingForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleMeeting}
                disabled={!selectedDate || !selectedTime || !meetingTitle}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
