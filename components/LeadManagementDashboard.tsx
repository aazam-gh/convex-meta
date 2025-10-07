"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

type Message = {
  role: "user" | "ai";
  text: string;
  createdAt: number;
  leadScore?: number;
  phase?: string;
};

export function LeadManagementDashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Id<"conversations"> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Convex queries and mutations
  const conversations = useQuery(api.conversations.listConversations);
  const selectedConversationData = useQuery(
    api.conversations.getConversation,
    selectedConversation ? { conversationId: selectedConversation } : "skip"
  );
  const lead = useQuery(
    api.leads.getLeadByConversation,
    selectedConversation ? { conversationId: selectedConversation } : "skip"
  );
  const agentState = useQuery(
    api.leads.getAgentState,
    selectedConversation ? { conversationId: selectedConversation } : "skip"
  );

  const sendDummyCustomerMessage = useMutation(api.conversations.sendDummyCustomerMessage);
  const createTestConversation = useMutation(api.conversations.createTestConversation);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation messages when conversation changes
  useEffect(() => {
    if (selectedConversationData?.messages) {
      const formattedMessages = selectedConversationData.messages.map(msg => ({
        role: msg.sender === "customer" ? "user" as const : "ai" as const,
        text: msg.content,
        createdAt: msg.timestamp,
      }));
      setMessages(formattedMessages);
    }
  }, [selectedConversationData]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedConversation || isSending) return;

    const userMessage: Message = { 
      role: "user", 
      text: input, 
      createdAt: Date.now() 
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      await sendDummyCustomerMessage({
        conversationId: selectedConversation,
        content: input.trim(),
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [
        ...prev,
        { role: "ai", text: "Sorry, something went wrong. Please try again.", createdAt: Date.now() }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateTestConversation = async () => {
    try {
      const conversationId = await createTestConversation({
        customerName: "Test Lead",
        customerEmail: "testlead@example.com",
      });
      setSelectedConversation(conversationId);
    } catch (error) {
      console.error("Failed to create test conversation:", error);
      alert("Failed to create test conversation. Please try again.");
    }
  };

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
    <div className="flex h-full bg-gray-50">
      {/* Left Sidebar - Conversations */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Lead Conversations</h2>
          <button
            onClick={handleCreateTestConversation}
            className="mt-2 w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            + New Test Lead
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations?.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No conversations yet</p>
              <p className="text-sm mt-1">Create a test lead to get started</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {conversations?.map((conv) => (
                <div
                  key={conv._id}
                  onClick={() => setSelectedConversation(conv._id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversation === conv._id
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {conv.customer?.name || "Unknown Customer"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {conv.lastMessage ? conv.lastMessage.content.substring(0, 50) + "..." : "No messages"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {conv.lastMessage ? new Date(conv.lastMessage.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : ""}
                      </div>
                      {conv.unreadCount > 0 && (
                        <div className="mt-1 w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500">
                Choose a conversation from the sidebar to start lead management
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header with Lead Info */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedConversationData?.customer?.name || "Unknown Customer"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedConversationData?.customer?.email || "No email"}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  {lead && (
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(lead.leadScore)}`}>
                        {lead.leadScore}
                      </div>
                      <div className="text-xs text-gray-500">Lead Score</div>
                    </div>
                  )}
                  {agentState && (
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPhaseColor(agentState.currentPhase)}`}>
                      {agentState.currentPhase.replace("_", " ").toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No messages in this conversation yet.</p>
                  <p className="text-sm mt-1">Send a message to start the lead qualification process!</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-xs font-medium">
                          {msg.role === "user" ? "Customer" : "AI Lead Agent"}
                        </p>
                        {msg.leadScore && (
                          <span className="px-1.5 py-0.5 bg-purple-200 text-purple-800 text-xs rounded-full font-medium">
                            Score: {msg.leadScore}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${
                        msg.role === "user" ? "text-blue-100" : "text-gray-500"
                      }`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                    <p className="text-sm">AI is thinking...</p>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message to the lead agent..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isSending}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
