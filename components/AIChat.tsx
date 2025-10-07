// AIChat.tsx - Clean UI Component

import { useState, useRef, useEffect, useCallback } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

type Message = {
  role: "user" | "ai";
  text: string;
  chunks?: { content: string; source: string }[];
  createdAt?: number;
};


// --- COMPONENT START ---

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>(() => {
    // UI-only persistence is kept, but errors are handled gracefully
    try {
      const stored = sessionStorage.getItem("aiChatMessages");
      // Initialize with a welcome message if no history exists
      if (!stored) {
        return [{ role: "ai", text: "Hello! I'm your AI Knowledge Assistant. Ask me a question about your documents!", createdAt: Date.now() }];
      }
      return JSON.parse(stored) as Message[];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

  // Convex action and mutation
  const askQuestion = useAction(api.knowledgeBase.askQuestion);
  const createTestConversation = useMutation(api.conversations.createTestConversation);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist messages across tab switches
  useEffect(() => {
    try {
      sessionStorage.setItem("aiChatMessages", JSON.stringify(messages));
    } catch {
      // ignore storage errors
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return;

    const userMessage: Message = { role: "user", text: input, createdAt: Date.now() };

    // Optimistic update
    setMessages((prev) => [...prev, userMessage]);
    setInput(""); // Clear input immediately
    setIsSending(true);

    try {
      const response = await askQuestion({ prompt: input });
      
      const aiMessage: Message = {
        role: "ai",
        text: response.answer,
        chunks: response.chunks?.map((entry: Record<string, unknown>) => ({
          content: (entry.content as string) || (entry.text as string) || "",
          source: (entry.source as string) || (entry.title as string) || "Unknown",
        })),
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("Failed to get AI response:", err);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Sorry, something went wrong with the connection.", createdAt: Date.now() },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, askQuestion]);

  const clearChat = () => {
    setMessages([{ role: "ai", text: "Chat history cleared. What can I help you with now?", createdAt: Date.now() }]);
    setExpandedSources(new Set());
    try {
      sessionStorage.removeItem("aiChatMessages");
    } catch {
      // ignore storage errors
    }
  };

  const handleCreateTestConversation = async () => {
    try {
      await createTestConversation({
        customerName: "Test Customer",
        customerEmail: "test@example.com",
      });
      alert("Test conversation created! Check the conversations list to see the Lead Management tabs.");
    } catch (error) {
      console.error("Failed to create test conversation:", error);
      alert("Failed to create test conversation. Please try again.");
    }
  };

  const toggleSources = (idx: number) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-4 border rounded-lg shadow bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b -mx-4 px-4 py-3 mb-3 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold">AI Knowledge Chat</h2>
          <p className="text-xs text-gray-500">Ask questions and see cited sources</p>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleCreateTestConversation}
            className="text-sm px-3 py-1.5 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200"
            aria-label="Create test conversation"
          >
            Create Test Conversation
          </button>
          <button
            type="button"
            onClick={clearChat}
            className="text-sm px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
            aria-label="Clear chat history"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[82%] rounded-2xl shadow-sm px-4 py-3 ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-900"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  msg.role === "user" ? "bg-blue-500/80" : "bg-gray-200"
                }`} aria-hidden>
                  {msg.role === "user" ? "U" : "🤖"}
                </div>
                <div className="text-[10px] opacity-80">{formatTime(msg.createdAt)}</div>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

              {/* Sources toggle for AI messages */}
              {msg.role === "ai" && msg.chunks && msg.chunks.length > 0 && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => toggleSources(idx)}
                    className="text-xs underline hover:no-underline text-blue-700"
                    aria-expanded={expandedSources.has(idx)}
                    aria-controls={`sources-${idx}`}
                  >
                    Sources ({msg.chunks.length})
                  </button>
                  {expandedSources.has(idx) && (
                    <div id={`sources-${idx}`} className="mt-2 text-xs space-y-1 border-l-2 pl-3 border-gray-300">
                      {msg.chunks.map((chunk, i) => (
                        // chunk.source is guaranteed to exist by the mock mapping
                        <div key={i} className="truncate">
                          <span className="font-semibold">{chunk.source}:</span> {chunk.content}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Typing indicator */}
      {isSending && (
        <div className="mb-3 flex justify-start">
          <div className="max-w-[60%] bg-gray-50 text-gray-700 rounded-2xl shadow-sm px-4 py-3 flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <span className="flex gap-1 items-end" aria-live="polite" aria-label="AI is typing">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-200ms]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-100ms]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
            </span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2">
        <textarea
          className="flex-1 border rounded-md px-3 py-2 min-h-[44px] max-h-48 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          placeholder="Ask the knowledge base..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
            if ((e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isSending}
          aria-label="Message input"
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          aria-label="Send message"
        >
          {isSending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}