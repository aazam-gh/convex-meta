// components/ConversationList.tsx

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import Image from "next/image";


interface ConversationListProps {
  selectedId: Id<"conversations"> | null;
  onSelect: (id: Id<"conversations">) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const conversations = useQuery(api.conversations.listConversations) || [];
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "whatsapp": return "📱";
      case "messenger": return "💬";
      case "sms": return "💬";
      default: return "💬";
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case "whatsapp": return "bg-green-100 text-green-800";
      case "messenger": return "bg-blue-100 text-blue-800";
      case "sms": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (timestamp: number) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInHours = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      // Use consistent date formatting that doesn't depend on locale
      const year = messageTime.getFullYear();
      const month = (messageTime.getMonth() + 1).toString().padStart(2, '0');
      const day = messageTime.getDate().toString().padStart(2, '0');
      return `${month}/${day}/${year}`;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <p>No conversations yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {conversations.map((conversation) => (
            <button
              key={conversation._id}
              onClick={() => onSelect(conversation._id)}
              className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                selectedId === conversation._id ? "bg-blue-50 border-r-2 border-blue-500" : ""
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
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
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {conversation.customer?.name || "Unknown Customer"}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getChannelColor(conversation.channel)}`}>
                        {getChannelIcon(conversation.channel)} {conversation.channel}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white min-w-[20px]">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Last Message */}
                  <p className="text-sm text-gray-600 truncate mb-1">
                    {conversation.lastMessage?.sender === "agent" && "You: "}
                    {conversation.lastMessage?.content || "No messages yet"}
                  </p>

                  {/* Time */}
                  <p className="text-xs text-gray-400">
                    {formatTime(conversation.lastMessageAt)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}