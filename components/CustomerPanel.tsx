// CustomerPanel.tsx - Clean UI Component

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import Image from "next/image";

interface CustomerPanelProps {
  customerId: Id<"customers">;
}



export function CustomerPanel({ customerId }: CustomerPanelProps) {
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");

  // Convex queries and mutations
  const customer = useQuery(api.customers.getCustomer, { customerId });
  const addNote = useMutation(api.customers.addNote);
  const addTag = useMutation(api.customers.addTag);
  const conversations = useQuery(api.conversations.listConversations) || [];
  
  // Find the latest conversation for this customer
  const latestConversation = conversations.find(conv => conv.customer?._id === customerId);
  const fullConversation = useQuery(
    api.conversations.getConversation,
    latestConversation ? { conversationId: latestConversation._id } : "skip"
  );
  
  // Find the latest AI message
  const latestAIMessage = fullConversation?.messages?.filter((msg: Record<string, unknown>) => msg.isAiGenerated).pop();


  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !customerId) return;

    try {
      await addNote({ customerId, note: newNote.trim() });
      setNewNote("");
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim() || !customer) return;

    const tagToAdd = newTag.trim();
    if (customer.tags.includes(tagToAdd)) {
        setNewTag("");
        return;
    }
    
    try {
      await addTag({ customerId, tag: newTag.trim() });
      setNewTag("");
    } catch (error) {
      console.error("Failed to add tag:", error);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "whatsapp": return "📱";
      case "messenger": return "💬";
      case "sms": return "💬";
      default: return "💬";
    }
  };

  if (!customer) {
    // Show loading state
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Details</h2>
        
        {/* Profile */}
        <div className="text-center mb-6">
          {customer.avatar ? (
            <Image
              src={customer.avatar}
              alt={customer.name}
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center mx-auto mb-3">
              <span className="text-gray-600 font-medium text-xl">
                {customer.name.charAt(0)}
              </span>
            </div>
          )}
          <h3 className="text-lg font-medium text-gray-900">{customer.name}</h3>
          {customer.email && (
            <p className="text-sm text-gray-500">{customer.email}</p>
          )}
          {customer.phone && (
            <p className="text-sm text-gray-500">{customer.phone}</p>
          )}
        </div>

        {/* Connected Channels */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Connected Channels</h4>
          <div className="flex flex-wrap gap-2">
            {customer.channels.map((channel) => (
              <span
                key={channel}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                {getChannelIcon(channel)} {channel}
              </span>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {customer.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
          </div>
          <form onSubmit={handleAddTag} className="flex space-x-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag..."
              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              disabled={!newTag.trim()}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </form>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* AI Knowledge Snippets */}
        {latestAIMessage?.knowledgeSnippets && latestAIMessage.knowledgeSnippets.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              🤖 Latest AI Knowledge Used
            </h4>
            <div className="space-y-3">
              {/* Only showing up to 3 snippets */}
              {latestAIMessage.knowledgeSnippets.slice(0, 3).map((snippet: { source: string; content: string; relevanceScore: number }, index: number) => (
                <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-purple-800">{snippet.source}</p>
                    <span className="text-xs text-purple-600">
                      {(snippet.relevanceScore * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <p className="text-xs text-purple-700">{snippet.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
          {customer.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 whitespace-pre-wrap">
              <p className="text-sm text-gray-700">{customer.notes}</p>
            </div>
          )}
          <form onSubmit={handleAddNote} className="space-y-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about this customer..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
            <button
              type="submit"
              disabled={!newNote.trim()}
              className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Note
            </button>
          </form>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h4>
          <div className="space-y-3">
            {customer.activities && customer.activities.length > 0 ? (
              customer.activities.map((activity) => (
                <div key={activity._id} className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">{formatTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}