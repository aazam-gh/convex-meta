
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const tabs = [
    { id: "inbox", label: "Inbox", icon: "💬", href: "/dashboard/inbox" },
    { id: "facebook-pages", label: "Facebook Pages", icon: "📘", href: "/dashboard/facebook-pages" },
    { id: "ai-chat", label: "AI Chat", icon: "🤖", href: "/dashboard/ai-chat" },
    { id: "lead-management", label: "Lead Management", icon: "🎯", href: "/dashboard/lead-management" },
    { id: "knowledge", label: "Knowledge Base", icon: "📚", href: "/dashboard/knowledge" },
    { id: "google-calendar", label: "Google Calendar", icon: "📅", href: "/dashboard/google-calendar" },
    { id: "contacts", label: "Contacts", icon: "👥", href: "/dashboard/contacts" },
    { id: "analytics", label: "Analytics", icon: "📊", href: "/dashboard/analytics" },
    { id: "settings", label: "Settings", icon: "⚙️", href: "/dashboard/settings" },
  ];
  
    return (
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Support Hub</h1>
          <p className="text-sm text-gray-500 mt-1">AI-Powered Dashboard</p>
        </div>
  
  {/* Navigation */}
  <nav className="flex-1 p-4">
    <ul className="space-y-2">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <li key={tab.id}>
            <Link
              href={tab.href}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg mr-3">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  </nav>
  
        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
        </div>
      </div>
    );
  }
  