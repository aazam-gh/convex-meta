"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";

export default function FacebookPagesManager() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Queries
  const recentConversations = useQuery(api.facebook.getRecentConversations, { limit: 10 });
  const pageInfo = useAction(api.facebook.getPageInfo);
  const conversationMessages = useQuery(
    api.facebook.getMessagesByConversation,
    selectedConversation ? { conversationId: selectedConversation } : "skip"
  );

  // Actions
  const syncMessages = useAction(api.facebook.syncPageMessages);
  const sendMessage = useAction(api.facebook.sendPageMessage);
  const fetchConversations = useAction(api.facebook.fetchPageConversations);

  const handleSyncMessages = async () => {
    setIsLoading(true);
    try {
      const result = await syncMessages({
        conversationLimit: 10,
        messageLimit: 50,
      });
      console.log("Sync result:", result);
      alert(`Synced ${result.messagesProcessed} messages from ${result.conversationsProcessed} conversations`);
    } catch (error) {
      console.error("Error syncing messages:", error);
      alert("Error syncing messages: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !messageText.trim()) return;

    setIsLoading(true);
    try {
      // Get the first participant who is not the page
      const participants = recentConversations?.find(
        conv => conv.conversationId === selectedConversation
      )?.participants;
      
      const recipientId = participants?.find((p: Record<string, unknown>) => !(p.senderId as string).startsWith("page_"))?.senderId;
      
      if (!recipientId) {
        alert("No valid recipient found for this conversation");
        return;
      }

      const result = await sendMessage({
        recipientId,
        text: messageText,
      });

      if (result.success) {
        setMessageText("");
        alert("Message sent successfully!");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchConversations = async () => {
    setIsLoading(true);
    try {
      const conversations = await fetchConversations({ limit: 10 });
      console.log("Fetched conversations:", conversations);
      alert(`Fetched ${conversations.length} conversations`);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      alert("Error fetching conversations: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Facebook Pages Manager</h1>
      
      {/* Page Info */}
      <div className="mb-6">
        <button
          onClick={() => pageInfo({})}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Get Page Info
        </button>
      </div>

      {/* Sync Controls */}
      <div className="mb-6 space-x-4">
        <button
          onClick={handleSyncMessages}
          disabled={isLoading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? "Syncing..." : "Sync Messages"}
        </button>
        
        <button
          onClick={handleFetchConversations}
          disabled={isLoading}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {isLoading ? "Fetching..." : "Fetch Conversations"}
        </button>
      </div>

      {/* Conversations List */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Recent Conversations</h2>
        <div className="space-y-2">
          {recentConversations?.map((conversation) => (
            <div
              key={conversation.conversationId}
              className={`p-4 border rounded cursor-pointer ${
                selectedConversation === conversation.conversationId
                  ? "bg-blue-100 border-blue-500"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
              onClick={() => setSelectedConversation(conversation.conversationId)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">
                    {conversation.participants
                      .filter((p: Record<string, unknown>) => !(p.senderId as string).startsWith("page_"))
                      .map((p: Record<string, unknown>) => (p.senderName as string) || (p.senderId as string))
                      .join(", ")}
                  </div>
                  <div className="text-sm text-gray-600">
                    {conversation.messageCount} messages
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {conversation.lastMessage && new Date(conversation.lastMessage.timestamp).toLocaleString()}
                </div>
              </div>
              {conversation.lastMessage && (
                <div className="mt-2 text-sm text-gray-700 truncate">
                  {conversation.lastMessage.senderName}: {conversation.lastMessage.text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      {selectedConversation && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Messages</h2>
          <div className="border rounded p-4 max-h-96 overflow-y-auto">
            {conversationMessages?.map((message) => (
              <div
                key={message._id}
                className={`mb-3 p-3 rounded ${
                  message.isFromPage
                    ? "bg-blue-100 ml-8"
                    : "bg-gray-100 mr-8"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-sm">
                    {message.senderName || message.senderId}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm">{message.text}</div>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2">
                    {message.attachments.map((attachment, index) => (
                      <div key={index} className="text-xs text-blue-600">
                        📎 {attachment.type}: {attachment.title || attachment.url}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send Message */}
      {selectedConversation && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Send Message</h2>
          <div className="flex space-x-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded"
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !messageText.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
