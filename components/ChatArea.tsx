// ChatArea.tsx - Clean UI Component

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import Image from "next/image";
import { LeadManagement } from "./LeadManagement";
import { AppointmentList } from "./AppointmentList"; 




interface ChatAreaProps {
  conversationId: Id<"conversations"> | null;
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  const [message, setMessage] = useState("");
  const [dummyMessage, setDummyMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "lead" | "appointments">("chat");
  
  // Convex queries and mutations
  const conversation = useQuery(
    api.conversations.getConversation,
    conversationId ? { conversationId } : "skip"
  );
  const sendMessage = useMutation(api.conversations.sendMessage);
  const sendDummyCustomerMessage = useMutation(api.conversations.sendDummyCustomerMessage);
  const markAsRead = useMutation(api.conversations.markAsRead);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversationId) return;
    
    try {
      await sendMessage({
        conversationId,
        content: message.trim(),
      });
      setMessage("");
      await markAsRead({ conversationId });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleSendDummyMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dummyMessage.trim() || !conversationId) return;
    
    try {
      await sendDummyCustomerMessage({
        conversationId,
        content: dummyMessage.trim(),
      });
      setDummyMessage("");
    } catch (error) {
      console.error("Failed to send dummy message:", error);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "whatsapp": return "📱";
      case "messenger": return "💬";
      case "sms": return "💬";
      default: return "💬";
    }
  };

  const getSenderLabel = (sender: string) => {
    switch (sender.toLowerCase()) {
      case "ai": return "AI Agent";
      case "agent": return "Agent";
      case "customer": return "Customer";
      default: return sender;
    }
  };

  const getSenderColor = (sender: string) => {
    switch (sender.toLowerCase()) {
      case "ai": return "bg-purple-500 text-white";
      case "agent": return "bg-blue-500 text-white";
      case "customer": return "bg-gray-100 text-gray-900";
      default: return "bg-gray-100 text-gray-900";
    }
  };

  const getSenderTextColor = (sender: string) => {
    switch (sender.toLowerCase()) {
      case "ai": return "text-purple-100";
      case "agent": return "text-blue-100";
      case "customer": return "text-gray-500";
      default: return "text-gray-500";
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Select a conversation
          </h3>
          <p className="text-gray-500">
            Choose a conversation from the sidebar to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {conversation.customer?.avatar ? (
              <Image
                src={conversation.customer.avatar}
                alt={conversation.customer.name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 font-medium">
                  {conversation.customer?.name?.charAt(0) || "?"}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {conversation.customer?.name || "Unknown Customer"}
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {getChannelIcon(conversation.channel)} {conversation.channel}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  conversation.status === "open" ? "bg-green-100 text-green-800" :
                  conversation.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {conversation.status}
                </span>
              </div>
            </div>
          </div>

          {/* Demo Controls (UI functional with console logging) */}
          <div className="flex items-center space-x-2">
            <form onSubmit={handleSendDummyMessage} className="flex items-center space-x-2">
              <input
                type="text"
                value={dummyMessage}
                onChange={(e) => setDummyMessage(e.target.value)}
                placeholder="Test customer message..."
                className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                type="submit"
                disabled={!dummyMessage.trim()}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send Test Message
              </button>
            </form>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("chat")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "chat"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab("lead")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "lead"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Lead Management
            </button>
            <button
              onClick={() => setActiveTab("appointments")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "appointments"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Appointments
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "chat" && (
          <div className="p-6 space-y-4">
            {conversation.messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No messages in this conversation yet.</p>
                <p className="text-sm mt-1">Send a message or use the test button to get started!</p>
              </div>
            ) : (
              conversation.messages.map((msg) => (
                <div key={msg._id}>
                  <div
                    className={`flex ${msg.sender === "customer" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${getSenderColor(msg.sender)}`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-xs font-medium">
                          {getSenderLabel(msg.sender)}
                        </p>
                        {msg.isAiGenerated && (
                          <span className="px-1.5 py-0.5 bg-purple-200 text-purple-800 text-xs rounded-full font-medium">
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${getSenderTextColor(msg.sender)}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Knowledge Snippets */}
                  {msg.knowledgeSnippets && msg.knowledgeSnippets.length > 0 && (
                    // Note: The margin logic is based on the sender being 'agent' or 'ai' to align the snippet under the message bubble
                    <div className={`mt-2 ${msg.sender === "customer" ? "ml-4 mr-auto" : "mr-4 ml-auto"} max-w-xs lg:max-w-md`}>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-purple-800 mb-2">
                          📚 Knowledge Sources Used:
                        </p>
                        <div className="space-y-2">
                          {msg.knowledgeSnippets.map((snippet, index) => (
                            <div key={index} className="text-xs">
                              <p className="text-purple-700 font-medium">{snippet.source}</p>
                              <p className="text-purple-600 mt-1">{snippet.content}</p>
                              <p className="text-purple-500 mt-1">
                                Relevance: {(snippet.relevanceScore * 100).toFixed(1)}%
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "lead" && conversationId && (
          <div className="p-6">
            <LeadManagement conversationId={conversationId} />
          </div>
        )}

        {activeTab === "appointments" && conversationId && (
          <div className="p-6">
            <AppointmentList customerId={conversation.customerId} />
          </div>
        )}
      </div>

      {/* Message Input - Only show for chat tab */}
      {activeTab === "chat" && (
        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <div className="flex-1">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!message.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}