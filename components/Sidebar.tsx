

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
  }
  
  export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const tabs = [
      { id: "inbox", label: "Inbox", icon: "💬" },
      { id: "facebook-pages", label: "Facebook Pages", icon: "📘" },
      { id: "ai-chat", label: "AI Chat", icon: "🤖" },
      { id: "lead-management", label: "Lead Management", icon: "🎯" },
      { id: "knowledge", label: "Knowledge Base", icon: "📚" },
      { id: "google-integrations", label: "Google Integrations", icon: "🔗" },
      { id: "google-calendar", label: "Google Calendar", icon: "📅" },
      { id: "contacts", label: "Contacts", icon: "👥" },
      { id: "analytics", label: "Analytics", icon: "📊" },
      { id: "settings", label: "Settings", icon: "⚙️" },
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
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-lg mr-3">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
  
        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
        </div>
      </div>
    );
  }
  