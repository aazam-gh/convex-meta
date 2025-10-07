"use client";

import { AIChat } from "../../../components/AIChat";

export default function AIChatPage() {
  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Assistant</h1>
          <p className="text-gray-600">
            Chat with our AI assistant for quick help and support guidance
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <AIChat />
        </div>
      </div>
    </div>
  );
}
