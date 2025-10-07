// Dashboard.tsx - Clean UI Component

"use client";
import { useState, useMemo } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

// Import UI-only components (assuming you will provide or create these)
import { Sidebar } from "./Sidebar";
import { KnowledgeBaseUpload } from "./KnowledgeBaseUpload";
import { AIChat } from "./AIChat";
import { LeadManagementDashboard } from "./LeadManagementDashboard";
import FacebookPagesManager from "./FacebookPagesManager";
import { GoogleIntegrations } from "./GoogleIntegrations";

interface FacebookMessage {
  _id: Id<"facebookMessages">;
  mid: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: number;
}

// --- COMPONENT START ---

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [selectedFacebookMessageId, setSelectedFacebookMessageId] = useState<
    Id<"facebookMessages"> | null
  >(null);
  const [replyText, setReplyText] = useState("");

  // Convex queries and actions
  const facebookMessagesQuery = useQuery(api.facebook.listMessages, { limit: 50 });
  const sendFacebookReply = useAction(api.facebook.replyToFacebookMessage);

  const selectedFacebookMessage: FacebookMessage | undefined = useMemo(() => {
    if (!facebookMessagesQuery) return undefined;
    return facebookMessagesQuery.find(
      (m) => m._id === selectedFacebookMessageId
    );
  }, [selectedFacebookMessageId, facebookMessagesQuery]);

  const formatRelativeTime = (timestamp: number) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    // Use consistent date formatting that doesn't depend on locale
    const year = then.getFullYear();
    const month = (then.getMonth() + 1).toString().padStart(2, '0');
    const day = then.getDate().toString().padStart(2, '0');
    return `${month}/${day}/${year}`;
  };

  const handleSendReply = async () => {
    if (!replyText || !selectedFacebookMessage) return;

    try {
      await sendFacebookReply({
        recipientId: selectedFacebookMessage.senderId,
        text: replyText,
      });
      setReplyText("");
    } catch (error) {
      console.error("Failed to send reply:", error);
      alert("Failed to send reply. Please try again.");
    }
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 flex">
        {activeTab === "inbox" && (
          <>
            {/* Facebook Messages List */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Facebook Messages</h2>
                <p className="text-sm text-gray-500 mt-1">{facebookMessagesQuery?.length || 0} messages</p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {!facebookMessagesQuery || facebookMessagesQuery.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No Facebook messages yet</div>
                ) : (
                  facebookMessagesQuery.map((msg) => (
                    <button
                      key={msg._id}
                      onClick={() => setSelectedFacebookMessageId(msg._id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedFacebookMessageId === msg._id ? "bg-blue-50 border-r-2 border-blue-500" : ""
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                          FB
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                                {msg.senderId}
                            </h3>
                            <span className="text-xs text-gray-400">{formatRelativeTime(msg.timestamp)}</span>
                          </div>
                          <p className="text-sm truncate text-gray-600">
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Message Details */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-6">
                {!selectedFacebookMessage ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-6xl mb-4">💬</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Facebook message</h3>
                      <p className="text-gray-500">Choose a message from the list to view details</p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-3xl">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">Message</h2>
                      <p className="mt-2 text-gray-800 whitespace-pre-wrap">{selectedFacebookMessage.text}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="bg-white border border-gray-200 rounded p-4">
                        <p className="text-gray-500">Sender ID</p>
                        <p className="text-gray-900 break-all">{selectedFacebookMessage.senderId}</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded p-4">
                        <p className="text-gray-500">Recipient (Page) ID</p>
                        <p className="text-gray-900 break-all">{selectedFacebookMessage.recipientId}</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded p-4">
                        <p className="text-gray-500">Timestamp</p>
                        <p className="text-gray-900">{(() => {
                          const date = new Date(selectedFacebookMessage.timestamp);
                          const year = date.getFullYear();
                          const month = (date.getMonth() + 1).toString().padStart(2, '0');
                          const day = date.getDate().toString().padStart(2, '0');
                          const hours = date.getHours().toString().padStart(2, '0');
                          const minutes = date.getMinutes().toString().padStart(2, '0');
                          return `${month}/${day}/${year} ${hours}:${minutes}`;
                        })()}</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded p-4">
                        <p className="text-gray-500">Message ID (mid)</p>
                        <p className="text-gray-900 break-all">
                            {selectedFacebookMessage.mid}
                        </p>
                      </div>
                    </div>

                    {/* REPLY FORM */}
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Reply</h3>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded mb-2"
                        rows={3}
                        placeholder="Type your reply..."
                      />
                      <button
                        onClick={handleSendReply}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Existing Tab Switcher Logic */}


        {activeTab === "ai-chat" && (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Assistant</h1>
                <p className="text-gray-600">
                  Chat with our AI assistant for quick help and support guidance
                </p>
              </div>
              <div className="h-[600px]">
                <AIChat />
              </div>
            </div>
          </div>
        )}

        {activeTab === "knowledge" && (
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Knowledge Base</h1>
                <p className="text-gray-600">
                  Upload PDF documents to power AI responses with your support content
                </p>
              </div>
              <KnowledgeBaseUpload />
            </div>
          </div>
        )}

        {activeTab === "lead-management" && (
          <div className="flex-1">
            <LeadManagementDashboard />
          </div>
        )}

        {activeTab === "facebook-pages" && (
          <div className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Facebook Pages Manager</h1>
                <p className="text-gray-600">
                  Manage your Facebook page conversations and messages using the Facebook Pages API
                </p>
              </div>
              <FacebookPagesManager />
            </div>
          </div>
        )}

        {activeTab === "google-integrations" && (
          <div className="flex-1 p-6">
            <GoogleIntegrations />
          </div>
        )}

        {activeTab !== "inbox" && activeTab !== "knowledge" && activeTab !== "ai-chat" && activeTab !== "lead-management" && activeTab !== "facebook-pages" && activeTab !== "google-integrations" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
              <p className="text-gray-500">This section is coming soon!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}